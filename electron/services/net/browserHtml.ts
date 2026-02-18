import { app, BrowserWindow, session } from 'electron'
import { BROWSER_HTML_PROBE_PARTITION, DEFAULT_BROWSER_USER_AGENT } from './constants'

const DEFAULT_TIMEOUT_MS = 25_000
const POLL_INTERVAL_MS = 450
let probeSessionGuardInstalled = false

function isAllowedProbeMainFrameUrl(rawUrl: string): boolean {
  try {
    const u = new URL(rawUrl)
    if (u.protocol !== 'https:') return false
    const host = u.hostname.toLowerCase()
    return host === 'op.gg' || host === 'www.op.gg'
  } catch {
    return false
  }
}

function ensureProbeSessionGuards() {
  if (probeSessionGuardInstalled) return
  const probeSession = session.fromPartition(BROWSER_HTML_PROBE_PARTITION)
  probeSession.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, callback) => {
    if (details.resourceType !== 'mainFrame') {
      callback({ cancel: true })
      return
    }
    callback({ cancel: !isAllowedProbeMainFrameUrl(details.url) })
  })
  probeSessionGuardInstalled = true
}

type BrowserDomSnapshot = {
  bytes: number
  hasFlight: boolean
  hasChallenge: boolean
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function readHtml(win: BrowserWindow): Promise<string> {
  const html = await win.webContents.executeJavaScript('document.documentElement?.outerHTML ?? ""', true)
  if (typeof html !== 'string' || !html.trim()) return ''
  return html
}

async function takeSnapshot(win: BrowserWindow): Promise<BrowserDomSnapshot> {
  return (await win.webContents.executeJavaScript(
    `(() => {
      const html = document.documentElement?.outerHTML ?? ''
      const lower = html.toLowerCase()
      const hasChallengeToken =
        lower.includes('/cdn-cgi/challenge-platform') ||
        lower.includes('_cf_chl_opt') ||
        lower.includes('cf_chl_') ||
        lower.includes('cf-browser-verification')
      const hasChallengeCopy =
        lower.includes('just a moment') ||
        lower.includes('attention required') ||
        lower.includes('checking your browser before accessing') ||
        lower.includes('verify you are human') ||
        lower.includes('sorry, you have been blocked')
      return {
        bytes: html.length,
        hasFlight: html.includes('self.__next_f.push(['),
        hasChallenge: hasChallengeToken || (hasChallengeCopy && (lower.includes('cloudflare') || lower.includes('captcha')))
      }
    })()`,
    true,
  )) as BrowserDomSnapshot
}

export async function fetchHtmlViaBrowser(url: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<string> {
  if (!app.isReady()) {
    await app.whenReady()
  }
  ensureProbeSessionGuards()

  const win = new BrowserWindow({
    show: false,
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      partition: BROWSER_HTML_PROBE_PARTITION,
    },
  })
  win.webContents.setUserAgent(DEFAULT_BROWSER_USER_AGENT)

  try {
    return await new Promise<string>((resolve, reject) => {
      let completed = false
      let bestHtml = ''
      let bestBytes = 0
      const deadline = Date.now() + timeoutMs

      const finish = (result: () => void) => {
        if (completed) return
        completed = true
        clearTimeout(timer)
        win.webContents.removeAllListeners('did-fail-load')
        result()
      }

      const timer = setTimeout(() => {
        if (bestHtml) {
          finish(() => resolve(bestHtml))
          return
        }
        finish(() => reject(new Error(`browser-html timeout for ${url}`)))
      }, timeoutMs)

      win.webContents.on('did-fail-load', (_event, code, desc) => {
        finish(() => reject(new Error(`browser-html load failed (${code}): ${desc}`)))
      })

      const poll = async () => {
        while (!completed && Date.now() < deadline) {
          const snapshot = await takeSnapshot(win)
          if (snapshot.bytes > bestBytes) {
            const html = await readHtml(win)
            if (html) {
              bestHtml = html
              bestBytes = snapshot.bytes
            }
          }

          if (snapshot.hasFlight) {
            const html = await readHtml(win)
            if (html) {
              finish(() => resolve(html))
              return
            }
          }

          const shouldWait = snapshot.hasChallenge || snapshot.bytes < 3_000
          if (!shouldWait && bestHtml) {
            finish(() => resolve(bestHtml))
            return
          }

          await sleep(POLL_INTERVAL_MS)
        }
      }

      void win
        .loadURL(url)
        .then(() =>
          poll().catch((error) =>
            finish(() =>
              reject(
                new Error(
                  `browser-html poll failed: ${error instanceof Error ? error.message : String(error)}`,
                ),
              ),
            ),
          ),
        )
        .catch((error) =>
          finish(() =>
            reject(
              new Error(
                `browser-html navigation failed: ${error instanceof Error ? error.message : String(error)}`,
              ),
            ),
          ),
        )
    })
  } finally {
    if (!win.isDestroyed()) win.destroy()
  }
}

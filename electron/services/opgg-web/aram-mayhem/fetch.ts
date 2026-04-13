import type { RiotLocale } from '../../../../shared/contracts'
import { fetchTextWithFallback } from '../../net/http'
import { fetchHtmlViaBrowser } from '../../net/browserHtml'
import { extractNextFlightChunksFromHtml } from '../nextFlight'

export type OpggWebLocale = 'zh-cn' | 'en'

export function toOpggWebLocale(lang?: RiotLocale): OpggWebLocale {
  const s = (lang ?? '').toLowerCase()
  if (s.startsWith('zh')) return 'zh-cn'
  return 'en'
}

export function opggUrl(locale: OpggWebLocale, path: string) {
  return `https://op.gg/${locale}/${path}`
}

function normalizePath(path: string): string {
  return path.replace(/^\/+/, '')
}

function oppositeLocale(locale: OpggWebLocale): OpggWebLocale {
  return locale === 'zh-cn' ? 'en' : 'zh-cn'
}

function dedupe(values: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of values) {
    if (seen.has(value)) continue
    seen.add(value)
    out.push(value)
  }
  return out
}

function withOpggDomainAndLocaleFallback(url: string): string[] {
  const m = /^https:\/\/op\.gg\/(zh-cn|en)\/(.+)$/.exec(url)
  if (!m) {
    if (!url.startsWith('https://op.gg/')) return [url]
    return [url, `https://www.op.gg/${url.slice('https://op.gg/'.length)}`]
  }

  const locale = m[1] as OpggWebLocale
  const path = normalizePath(m[2])
  const alt = oppositeLocale(locale)
  return dedupe([
    `https://op.gg/${locale}/${path}`,
    `https://www.op.gg/${locale}/${path}`,
    `https://op.gg/${alt}/${path}`,
    `https://www.op.gg/${alt}/${path}`,
    `https://op.gg/${path}`,
    `https://www.op.gg/${path}`,
  ])
}

type OpggHtmlSignal = {
  bytes: number
  flightChunks: number
}

export function isLikelyChallengePage(html: string): boolean {
  const s = html.toLowerCase()
  const hasCloudflareChallengeToken =
    s.includes('/cdn-cgi/challenge-platform') ||
    s.includes('_cf_chl_opt') ||
    s.includes('cf_chl_') ||
    s.includes('cf-browser-verification')
  const hasHumanCheckCopy =
    s.includes('just a moment') ||
    s.includes('attention required') ||
    s.includes('checking your browser before accessing') ||
    s.includes('verify you are human') ||
    s.includes('sorry, you have been blocked') ||
    s.includes('request blocked')
  return (
    hasCloudflareChallengeToken ||
    (hasHumanCheckCopy && (s.includes('cloudflare') || s.includes('cf-ray') || s.includes('captcha'))) ||
    (s.includes('access denied') && s.includes('cloudflare'))
  )
}

function inspectOpggHtml(html: string): OpggHtmlSignal {
  const flightChunks = html.includes('self.__next_f.push([')
    ? extractNextFlightChunksFromHtml(html).length
    : 0
  return {
    bytes: Buffer.byteLength(html, 'utf8'),
    flightChunks,
  }
}

export async function fetchHtml(url: string, timeoutMs: number): Promise<string> {
  const candidates = withOpggDomainAndLocaleFallback(url)
  const html = await fetchTextWithFallback(candidates, {
    timeoutMs,
    cache: 'no-store',
    redirect: 'follow',
    attempts: 2,
    sleepMs: 250,
    headers: {
      accept: 'text/html,application/xhtml+xml',
      'accept-language': 'en-US,en;q=0.9,zh-CN;q=0.8',
    },
  })
  const signal = inspectOpggHtml(html)
  if (signal.flightChunks > 0) return html
  if (process.env.OPGG_WEB_BROWSER_FALLBACK === '0') return html

  let bestHtml = html
  let bestSignal = signal
  const fallbackErrors: string[] = []
  for (const candidate of candidates) {
    try {
      const viaBrowser = await fetchHtmlViaBrowser(candidate, Math.max(timeoutMs, 20_000))
      const browserSignal = inspectOpggHtml(viaBrowser)
      if (browserSignal.flightChunks > 0) {
        return viaBrowser
      }
      if (browserSignal.bytes > bestSignal.bytes) {
        bestHtml = viaBrowser
        bestSignal = browserSignal
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      fallbackErrors.push(`${candidate}: ${message}`)
    }
  }
  if (fallbackErrors.length === candidates.length) {
    throw new Error(`OP.GG browser fallback failed: ${fallbackErrors.slice(0, 2).join(' | ')}`)
  }
  return bestHtml
}

import { BrowserWindow } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import type { Settings } from '../../../shared/contracts'
import { buildTrustedRendererOrigins, isTrustedRendererUrl } from '../security/navigation'
import { resolveIndexHtmlPath } from './indexHtml'

const MAIN_WINDOW_MIN_WIDTH = 980
const MAIN_WINDOW_MIN_HEIGHT = 640
const MAIN_WINDOW_DEFAULT_WIDTH = 1200
const MAIN_WINDOW_DEFAULT_HEIGHT = 760

function clampMainWindowDimension(value: number | undefined, min: number, fallback: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.max(min, Math.trunc(value))
}

export function createMainWindow(settings?: Pick<Settings, 'window'>) {
  const isMac = process.platform === 'darwin'
  const isWin = process.platform === 'win32'
  const iconPath = path.join(process.cwd(), 'build', 'icon.png')
  const icon = !isMac && fs.existsSync(iconPath) ? iconPath : undefined
  const width = clampMainWindowDimension(
    settings?.window.main.width,
    MAIN_WINDOW_MIN_WIDTH,
    MAIN_WINDOW_DEFAULT_WIDTH,
  )
  const height = clampMainWindowDimension(
    settings?.window.main.height,
    MAIN_WINDOW_MIN_HEIGHT,
    MAIN_WINDOW_DEFAULT_HEIGHT,
  )

  const win = new BrowserWindow({
    width,
    height,
    minWidth: MAIN_WINDOW_MIN_WIDTH,
    minHeight: MAIN_WINDOW_MIN_HEIGHT,
    resizable: true,
    title: 'LOLPro',
    frame: false,
    transparent: isMac,
    backgroundColor: isMac ? '#00000000' : '#141a22',
    ...(isWin
      ? {
          roundedCorners: true,
          backgroundMaterial: 'acrylic' as const,
          thickFrame: true,
          hasShadow: true,
        }
      : {}),
    ...(icon ? { icon } : {}),
    ...(isMac ? { vibrancy: 'under-window', visualEffectState: 'active' as const } : {}),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      backgroundThrottling: true,
      devTools: !!process.env.VITE_DEV_SERVER_URL,
      preload: path.join(__dirname, 'preload-main.cjs'),
    },
  })

  const devUrl = process.env.VITE_DEV_SERVER_URL
  const trustedOrigins = buildTrustedRendererOrigins(devUrl)
  const shouldOpenDevTools = process.env.OPEN_DEVTOOLS === '1' || process.env.ELECTRON_OPEN_DEVTOOLS === '1'
  if (devUrl) {
    win.loadURL(devUrl)
    if (shouldOpenDevTools) {
      win.webContents.openDevTools({ mode: 'detach' })
    }
  } else {
    win.loadFile(resolveIndexHtmlPath())
  }

  // Security: deny new windows and unexpected top-level navigations.
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  win.webContents.on('will-navigate', (event, url) => {
    if (isTrustedRendererUrl(url, trustedOrigins)) return
    event.preventDefault()
  })

  return win
}

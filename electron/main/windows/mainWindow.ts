import { BrowserWindow } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { buildTrustedRendererOrigins, isTrustedRendererUrl } from '../security/navigation'
import { resolveIndexHtmlPath } from './indexHtml'

export function createMainWindow() {
  const isMac = process.platform === 'darwin'
  const isWin = process.platform === 'win32'
  const iconPath = path.join(process.cwd(), 'build', 'icon.png')
  const icon = !isMac && fs.existsSync(iconPath) ? iconPath : undefined

  const win = new BrowserWindow({
    width: 1200,
    height: 760,
    minWidth: 980,
    minHeight: 640,
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

import { BrowserWindow } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import type { Settings } from '../../../shared/contracts'
import { getOverlayWindowBounds } from '../services/overlayWindowBounds'
import { buildTrustedRendererOrigins, isTrustedRendererUrl } from '../security/navigation'
import { resolveIndexHtmlPath } from './indexHtml'

export function createOverlayWindow(settings?: Pick<Settings, 'overlay'>) {
  const isMac = process.platform === 'darwin'
  const iconPath = path.join(process.cwd(), 'build', 'icon.png')
  const icon = !isMac && fs.existsSync(iconPath) ? iconPath : undefined
  const bounds = getOverlayWindowBounds(settings?.overlay)

  const win = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    show: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: !!settings?.overlay.interactive,
    minWidth: 320,
    minHeight: 240,
    movable: true,
    skipTaskbar: true,
    hasShadow: false,
    focusable: false,
    paintWhenInitiallyHidden: false,
    backgroundColor: '#00000000',
    ...(icon ? { icon } : {}),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      backgroundThrottling: true,
      devTools: !!process.env.VITE_DEV_SERVER_URL,
      preload: path.join(__dirname, 'preload-overlay.cjs'),
    },
  })

  // Default click-through; can be toggled interactive via IPC.
  win.setIgnoreMouseEvents(true, { forward: true })

  const devUrl = process.env.VITE_DEV_SERVER_URL
  const trustedOrigins = buildTrustedRendererOrigins(devUrl)
  if (devUrl) {
    win.loadURL(`${devUrl}#/overlay`)
  } else {
    win.loadFile(resolveIndexHtmlPath(), { hash: '/overlay' })
  }

  // Security: deny new windows and unexpected top-level navigations.
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  win.webContents.on('will-navigate', (event, url) => {
    if (isTrustedRendererUrl(url, trustedOrigins)) return
    event.preventDefault()
  })

  return win
}

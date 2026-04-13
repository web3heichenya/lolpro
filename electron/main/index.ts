import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'

import { createContainer } from './bootstrap/container'

// In dev, Electron's default app name can be "Electron", causing shared userData/cache with other apps.
// Use a dedicated userData dir to avoid cache permission issues and config collisions.
if (!app.isPackaged) {
  const base = app.getPath('appData')
  app.setPath('userData', path.join(base, 'LOLPro-dev'))
}

const container = createContainer()
const { logger, runtime } = container

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  container.shutdown()
})

app.on('activate', () => {
  runtime.showMainWindow()
})

app
  .whenReady()
  .then(async () => {
    if (process.platform === 'darwin') {
      const iconPath = path.join(process.cwd(), 'build', 'icon.png')
      if (fs.existsSync(iconPath)) {
        try {
          app.dock?.setIcon(iconPath)
        } catch {
          // ignore dock icon errors in non-standard app bundles.
        }
      }
    }

    await container.bootstrap()
  })
  .catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err)
    const stack = err instanceof Error ? err.stack : undefined
    logger.error('app startup failed', { message, stack })
    app.quit()
  })

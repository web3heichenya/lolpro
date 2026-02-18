import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'

export function resolveIndexHtmlPath() {
  const appPath = app.getAppPath()
  const candidates = [
    path.join(appPath, 'dist', 'index.html'),
    path.join(appPath, '..', 'dist', 'index.html'),
    path.join(process.cwd(), 'dist', 'index.html'),
  ]
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) return candidate
    } catch {
      // ignore
    }
  }
  return path.join(appPath, 'dist', 'index.html')
}

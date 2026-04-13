import { app } from 'electron'
import fs from 'node:fs/promises'
import path from 'node:path'

type Logger = {
  info: (msg: string, meta?: Record<string, unknown>) => void
  warn: (msg: string, meta?: Record<string, unknown>) => void
  error: (msg: string, meta?: Record<string, unknown>) => void
}

type AppDataVersionState = {
  appDataVersion: number
  updatedAt: number
}

const APP_DATA_VERSION = 1

export async function enforceAppDataVersion(logger: Logger) {
  const userDataPath = app.getPath('userData')
  await fs.mkdir(userDataPath, { recursive: true })

  const markerPath = path.join(userDataPath, 'app-data-version.json')
  let currentVersion = -1

  try {
    const raw = await fs.readFile(markerPath, 'utf8')
    const parsed = JSON.parse(raw) as Partial<AppDataVersionState>
    currentVersion = Number(parsed.appDataVersion ?? -1)
  } catch {
    currentVersion = -1
  }

  if (currentVersion === APP_DATA_VERSION) return

  const nextState: AppDataVersionState = {
    appDataVersion: APP_DATA_VERSION,
    updatedAt: Date.now(),
  }

  await fs.writeFile(markerPath, JSON.stringify(nextState, null, 2), 'utf8')

  if (currentVersion < 0) {
    logger.info('app data version initialized', {
      nextVersion: APP_DATA_VERSION,
      userDataPath,
    })
    return
  }

  if (currentVersion > APP_DATA_VERSION) {
    logger.warn('app data version marker downgraded without data mutation', {
      previousVersion: currentVersion,
      nextVersion: APP_DATA_VERSION,
      userDataPath,
    })
    return
  }

  logger.info('app data version marker upgraded without data reset', {
    previousVersion: currentVersion,
    nextVersion: APP_DATA_VERSION,
    userDataPath,
  })
}

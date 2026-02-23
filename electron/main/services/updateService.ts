import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'

import type { AppUpdateStatus, AppUpdateStatusStage } from '../../../shared/contracts'
import type { ProgressInfo } from 'electron-updater'

type Logger = {
  info: (msg: string, meta?: Record<string, unknown>) => void
  warn: (msg: string, meta?: Record<string, unknown>) => void
  error: (msg: string, meta?: Record<string, unknown>) => void
}

type UpdateStatusListener = (status: AppUpdateStatus) => void

const DEFAULT_GITHUB_OWNER = 'web3heichenya'
const DEFAULT_GITHUB_REPO = 'lolpro'
const PROGRESS_MIN_INTERVAL_MS = 250
const PROGRESS_MIN_PERCENT_DELTA = 1

function stageCapabilities(stage: AppUpdateStatusStage) {
  if (stage === 'idle' || stage === 'not-available' || stage === 'error') {
    return { canCheck: true, canDownload: false, canInstall: false }
  }
  if (stage === 'available') {
    return { canCheck: true, canDownload: true, canInstall: false }
  }
  if (stage === 'downloaded') {
    return { canCheck: true, canDownload: false, canInstall: true }
  }
  return { canCheck: false, canDownload: false, canInstall: false }
}

export class UpdateService {
  private readonly currentVersion = this.resolveCurrentVersion()
  private feedConfig: { owner: string; repo: string; token?: string } | null = null
  private status: AppUpdateStatus = {
    stage: 'disabled',
    currentVersion: this.currentVersion,
    message: 'Update service is unavailable.',
    canCheck: false,
    canDownload: false,
    canInstall: false,
  }
  private readonly listeners = new Set<UpdateStatusListener>()
  private updater: (typeof import('electron-updater'))['autoUpdater'] | null = null
  private updaterInitPromise: Promise<(typeof import('electron-updater'))['autoUpdater'] | null> | null = null
  private enabled = false
  private lastProgressEmitAt = 0
  private lastProgressPercent = -1

  constructor(private readonly logger: Logger) {
    this.setup()
  }

  getStatus(): AppUpdateStatus {
    return {
      ...this.status,
      progress: this.status.progress ? { ...this.status.progress } : undefined,
    }
  }

  onStatusChanged(listener: UpdateStatusListener) {
    this.listeners.add(listener)
    listener(this.getStatus())
    return () => this.listeners.delete(listener)
  }

  async checkForUpdates() {
    if (!this.enabled) return this.getStatus()
    if (this.status.stage === 'checking' || this.status.stage === 'downloading') return this.getStatus()
    try {
      const updater = await this.ensureUpdaterReady()
      if (!updater) return this.getStatus()
      this.setStatus({
        stage: 'checking',
        message: undefined,
      })
      await updater.checkForUpdates()
    } catch (error) {
      this.setErrorStatus(error)
    }
    return this.getStatus()
  }

  async downloadUpdate() {
    if (!this.enabled) return this.getStatus()
    if (this.status.stage !== 'available') return this.getStatus()
    try {
      const updater = await this.ensureUpdaterReady()
      if (!updater) return this.getStatus()
      await updater.downloadUpdate()
    } catch (error) {
      this.setErrorStatus(error)
    }
    return this.getStatus()
  }

  installUpdate() {
    if (!this.enabled) return
    if (this.status.stage !== 'downloaded') return
    if (!this.updater) return
    setImmediate(() => this.updater?.quitAndInstall())
  }

  private setup() {
    const currentVersion = this.currentVersion
    if (!app.isPackaged) {
      this.status = {
        stage: 'disabled',
        currentVersion,
        message: 'Updates are disabled in development mode.',
        canCheck: false,
        canDownload: false,
        canInstall: false,
      }
      return
    }

    const owner = process.env.LOLPRO_UPDATE_OWNER ?? DEFAULT_GITHUB_OWNER
    const repo = process.env.LOLPRO_UPDATE_REPO ?? DEFAULT_GITHUB_REPO
    const tokenRaw = process.env.LOLPRO_UPDATE_TOKEN
    const token = tokenRaw?.trim() ? tokenRaw.trim() : undefined

    if (!owner || !repo) {
      this.status = {
        stage: 'disabled',
        currentVersion,
        message: 'Missing GitHub update repository configuration.',
        canCheck: false,
        canDownload: false,
        canInstall: false,
      }
      return
    }

    this.enabled = true
    this.feedConfig = { owner, repo, token }
    this.setStatus({
      stage: 'idle',
      message: undefined,
      latestVersion: undefined,
      releaseName: undefined,
      releaseDate: undefined,
      progress: undefined,
    })
    this.logger.info('updater configured (deferred init)', { owner, repo, privateRepo: Boolean(token) })
  }

  private setErrorStatus(error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    this.logger.error('updater error', { message })
    this.setStatus({
      stage: 'error',
      message,
      progress: undefined,
    })
  }

  private async ensureUpdaterReady() {
    if (!this.enabled || !this.feedConfig) return null
    if (this.updater) return this.updater
    if (!this.updaterInitPromise) {
      this.updaterInitPromise = this.loadAndConfigureUpdater()
    }
    return await this.updaterInitPromise
  }

  private async loadAndConfigureUpdater() {
    const feedConfig = this.feedConfig
    if (!feedConfig) return null
    try {
      const mod = await import('electron-updater')
      const updater = mod.autoUpdater

      updater.autoDownload = false
      updater.autoInstallOnAppQuit = true
      updater.allowPrerelease = false
      updater.allowDowngrade = false
      updater.setFeedURL({
        provider: 'github',
        owner: feedConfig.owner,
        repo: feedConfig.repo,
        private: Boolean(feedConfig.token),
        token: feedConfig.token,
        releaseType: 'release',
      })

      updater.on('checking-for-update', () => {
        this.setStatus({ stage: 'checking', message: undefined })
      })

      updater.on('update-available', (info) => {
        this.resetProgressThrottle()
        this.setStatus({
          stage: 'available',
          latestVersion: info.version,
          releaseName: info.releaseName ?? undefined,
          releaseDate: info.releaseDate ?? undefined,
          message: undefined,
        })
      })

      updater.on('update-not-available', (info) => {
        this.resetProgressThrottle()
        this.setStatus({
          stage: 'not-available',
          latestVersion: info.version,
          releaseName: info.releaseName ?? undefined,
          releaseDate: info.releaseDate ?? undefined,
          progress: undefined,
          message: undefined,
        })
      })

      updater.on('download-progress', (progress: ProgressInfo) => {
        if (!this.shouldEmitProgress(progress)) return
        this.setStatus({
          stage: 'downloading',
          progress: {
            percent: progress.percent,
            transferred: progress.transferred,
            total: progress.total,
            bytesPerSecond: progress.bytesPerSecond,
          },
        })
      })

      updater.on('update-downloaded', (info) => {
        this.resetProgressThrottle()
        this.setStatus({
          stage: 'downloaded',
          latestVersion: info.version,
          releaseName: info.releaseName ?? undefined,
          releaseDate: info.releaseDate ?? undefined,
          progress: undefined,
          message: undefined,
        })
      })

      updater.on('error', (error) => {
        this.setErrorStatus(error)
      })

      this.updater = updater
      this.logger.info('updater initialized')
      return updater
    } catch (error) {
      this.updaterInitPromise = null
      throw error
    }
  }

  private setStatus(next: Partial<AppUpdateStatus> & { stage: AppUpdateStatusStage }) {
    const prev = this.status
    const base: AppUpdateStatus = {
      ...prev,
      ...next,
      stage: next.stage,
      currentVersion: this.currentVersion,
    }
    const caps = stageCapabilities(base.stage)
    this.status = {
      ...base,
      ...caps,
    }
    if (next.stage !== 'downloading') {
      this.resetProgressThrottle()
    }
    this.emitStatus()
  }

  private emitStatus() {
    const snapshot = this.getStatus()
    for (const listener of this.listeners) {
      listener(snapshot)
    }
  }

  private resolveCurrentVersion() {
    if (app.isPackaged) return app.getVersion()

    const fromEnv = process.env.npm_package_version?.trim()
    if (fromEnv) return fromEnv

    try {
      const pkgPath = path.join(process.cwd(), 'package.json')
      const raw = fs.readFileSync(pkgPath, 'utf8')
      const parsed = JSON.parse(raw) as { version?: unknown }
      if (typeof parsed.version === 'string' && parsed.version.trim().length > 0) {
        return parsed.version.trim()
      }
    } catch {
      // Fall through to Electron-reported version when package.json is unavailable.
    }

    return app.getVersion()
  }

  private shouldEmitProgress(progress: ProgressInfo) {
    const percent = Number.isFinite(progress.percent) ? progress.percent : 0
    const now = Date.now()
    const percentDelta = Math.abs(percent - this.lastProgressPercent)
    const elapsed = now - this.lastProgressEmitAt

    const shouldEmit =
      this.lastProgressPercent < 0 ||
      percent >= 100 ||
      percentDelta >= PROGRESS_MIN_PERCENT_DELTA ||
      elapsed >= PROGRESS_MIN_INTERVAL_MS

    if (!shouldEmit) return false
    this.lastProgressPercent = percent
    this.lastProgressEmitAt = now
    return true
  }

  private resetProgressThrottle() {
    this.lastProgressEmitAt = 0
    this.lastProgressPercent = -1
  }
}

import { app, BrowserWindow, globalShortcut, screen, systemPreferences } from 'electron'
import { normalizeRiotLocale } from '../../services/blitz/locales'
import { DEFAULT_SETTINGS, type Settings, type SettingsPatch } from '../../services/settings/types'
import type { MainProcessDependencies } from '../bootstrap/dependencies'
import { createMainWindow } from '../windows/mainWindow'
import { createOverlayWindow } from '../windows/overlayWindow'
import { registerAppShortcuts } from './shortcutRegistrar'
type Logger = {
  info: (msg: string, meta?: Record<string, unknown>) => void
  warn: (msg: string, meta?: Record<string, unknown>) => void
  error: (msg: string, meta?: Record<string, unknown>) => void
}
export class AppRuntime {
  private started = false
  private mainWindow: BrowserWindow | null = null
  private overlayWindow: BrowserWindow | null = null
  private currentSettings: Settings = DEFAULT_SETTINGS
  private applyingOverlayBounds = false
  private overlayMoveDebounce: NodeJS.Timeout | null = null
  private overlayMoveListener: (() => void) | null = null
  private overlayInteractiveAutoResetTimer: NodeJS.Timeout | null = null
  private temporaryInteractiveActive = false
  private settingsMutationQueue: Promise<void> = Promise.resolve()
  private readonly cycleOverlayAugmentHotkey = 'CommandOrControl+Shift+J'
  private readonly temporaryInteractiveMs = 5000
  constructor(
    private readonly logger: Logger,
    private readonly dependencies: Pick<
      MainProcessDependencies,
      'settingsStore' | 'gameContext' | 'databaseLifecycle'
    >,
  ) {}

  getMainWindow = () => this.mainWindow
  getOverlayWindow = () => this.overlayWindow
  showMainWindow() {
    this.ensureWindows()
    this.applyOverlayPositionFromSettings(this.currentSettings)
    this.applyOverlayInteractiveFromSettings(this.currentSettings)
    this.applyOverlayPinnedFromSettings(this.currentSettings)
    this.bindOverlayMovePersistence()
    this.mainWindow?.show()
  }

  getAccessibilityStatus() {
    return { trusted: this.isAccessibilityTrusted() }
  }

  async start() {
    if (this.started) return
    this.started = true
    this.dependencies.databaseLifecycle.init()
    await this.dependencies.settingsStore.load()
    this.currentSettings = this.dependencies.settingsStore.get()
    this.dependencies.settingsStore.on('changed', this.onSettingsStoreChanged)
    this.ensureWindows()
    this.applyOverlayPositionFromSettings(this.currentSettings)
    this.applyOverlayInteractiveFromSettings(this.currentSettings)
    this.applyOverlayPinnedFromSettings(this.currentSettings)
    this.applyLanguageFromSettings(this.currentSettings)
    await this.dependencies.gameContext.start()
    this.dependencies.gameContext.on('gameEnded', this.onGameEnded)
    this.bindOverlayMovePersistence()
    this.registerShortcuts(this.currentSettings)
  }

  shutdown() {
    this.started = false
    this.dependencies.settingsStore.off('changed', this.onSettingsStoreChanged)
    this.dependencies.gameContext.off('gameEnded', this.onGameEnded)
    if (this.overlayMoveDebounce) clearTimeout(this.overlayMoveDebounce)
    this.overlayMoveDebounce = null
    this.clearTemporaryInteractiveReset()
    if (this.overlayWindow && this.overlayMoveListener) {
      this.overlayWindow.off('move', this.overlayMoveListener)
    }
    this.overlayMoveListener = null
    globalShortcut.unregisterAll()
    this.dependencies.gameContext.stop()
    this.dependencies.databaseLifecycle.close()
  }

  async updateSettings(patch: SettingsPatch): Promise<Settings> {
    return await this.enqueueSettingsMutation(async () => {
      await this.dependencies.settingsStore.load()
      const next = this.dependencies.settingsStore.previewPatch(patch)
      return await this.applyAndPersistSettings(next)
    })
  }

  async resetSettings(): Promise<Settings> {
    return await this.enqueueSettingsMutation(async () => {
      await this.dependencies.settingsStore.load()
      return await this.applyAndPersistSettings(DEFAULT_SETTINGS)
    })
  }

  toggleOverlay() {
    if (this.currentSettings.overlay.pinned) {
      void this.updateSettings({ overlay: { pinned: false } })
      return
    }
    void this.updateSettings({ overlay: { pinned: true, interactive: true } })
  }

  reportOverlayInteraction() {
    if (!this.temporaryInteractiveActive || !this.currentSettings.overlay.interactive) return
    this.scheduleTemporaryInteractiveReset()
  }

  private ensureWindows() {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      this.mainWindow = createMainWindow()
      this.mainWindow.on('closed', this.onMainWindowClosed)
    }
    if (!this.overlayWindow || this.overlayWindow.isDestroyed()) {
      this.overlayWindow = createOverlayWindow()
      this.overlayWindow.on('closed', this.onOverlayWindowClosed)
    }
  }

  private isAccessibilityTrusted(): boolean {
    return process.platform !== 'darwin' || systemPreferences.isTrustedAccessibilityClient(false)
  }

  private applyOverlayPositionFromSettings(s: Settings) {
    if (!this.overlayWindow) return
    let { x, y } = s.overlay
    if (x < 0 || y < 0) {
      const { width } = screen.getPrimaryDisplay().workAreaSize
      x = Math.max(0, width - 480)
      y = 40
      void this.dependencies.settingsStore.applyPatch({ overlay: { x, y } }).catch(() => {})
    }

    this.applyingOverlayBounds = true
    this.overlayWindow.setPosition(x, y, false)
    setTimeout(() => {
      this.applyingOverlayBounds = false
    }, 0)
  }

  private applyOverlayPinnedFromSettings(s: Settings) {
    if (!this.overlayWindow) return
    if (s.overlay.pinned) this.overlayWindow.showInactive()
    else this.overlayWindow.hide()
  }

  private applyOverlayInteractiveFromSettings(s: Settings) {
    if (!this.overlayWindow) return
    const topLevel = process.platform === 'win32' ? 'screen-saver' : 'floating'
    this.overlayWindow.setAlwaysOnTop(true, topLevel)
    this.overlayWindow.moveTop()

    if (s.overlay.interactive) {
      this.overlayWindow.setIgnoreMouseEvents(false)
      this.overlayWindow.setFocusable(true)
      this.overlayWindow.show()
      this.overlayWindow.focus()
    } else {
      this.overlayWindow.setIgnoreMouseEvents(true, { forward: true })
      this.overlayWindow.setFocusable(false)
      this.temporaryInteractiveActive = false
      this.clearTemporaryInteractiveReset()
    }
  }

  private applyLanguageFromSettings(s: Settings) {
    const locale = s.language === 'auto' ? app.getLocale() : s.language
    const normalized = normalizeRiotLocale(locale)
    this.dependencies.gameContext.setLanguage(normalized === 'zh_TW' ? 'zh_CN' : normalized)
  }

  private applyRuntimeSettings(settings: Settings) {
    this.registerShortcuts(settings)
    this.applyOverlayPositionFromSettings(settings)
    this.applyOverlayInteractiveFromSettings(settings)
    this.applyOverlayPinnedFromSettings(settings)
    this.applyLanguageFromSettings(settings)
  }

  private async applyAndPersistSettings(next: Settings): Promise<Settings> {
    const prev = this.currentSettings
    try {
      this.applyRuntimeSettings(next)
      this.currentSettings = next
      await this.dependencies.settingsStore.set(next)
      return next
    } catch (err) {
      try {
        this.applyRuntimeSettings(prev)
      } catch {
        // ignore rollback failures; original error is more relevant.
      }
      this.currentSettings = prev
      throw err
    }
  }

  private async enqueueSettingsMutation<T>(task: () => Promise<T>): Promise<T> {
    const run = this.settingsMutationQueue.then(task, task)
    this.settingsMutationQueue = run.then(
      () => undefined,
      () => undefined,
    )
    return await run
  }

  private registerShortcuts(s: Settings) {
    registerAppShortcuts({
      settings: s,
      logger: this.logger,
      cycleOverlayAugmentHotkey: this.cycleOverlayAugmentHotkey,
      getCurrentSettings: () => this.currentSettings,
      setTemporaryInteractiveActive: (active) => {
        this.temporaryInteractiveActive = active
      },
      clearTemporaryInteractiveReset: () => this.clearTemporaryInteractiveReset(),
      scheduleTemporaryInteractiveReset: () => this.scheduleTemporaryInteractiveReset(),
      updateSettings: async (patch) => await this.updateSettings(patch),
    })
  }

  private bindOverlayMovePersistence() {
    if (!this.overlayWindow) return
    if (this.overlayMoveListener) this.overlayWindow.off('move', this.overlayMoveListener)
    this.overlayMoveListener = () => {
      if (!this.overlayWindow) return
      if (this.applyingOverlayBounds) return
      if (this.overlayMoveDebounce) clearTimeout(this.overlayMoveDebounce)
      this.overlayMoveDebounce = setTimeout(() => {
        if (!this.overlayWindow) return
        const [x, y] = this.overlayWindow.getPosition()
        void this.dependencies.settingsStore.applyPatch({ overlay: { x, y } }).catch(() => {})
      }, 400)
    }
    this.overlayWindow.on('move', this.overlayMoveListener)
  }

  private onSettingsStoreChanged = (settings: Settings) => {
    this.currentSettings = settings
    this.applyLanguageFromSettings(settings)
  }

  private onGameEnded = () => {
    if (this.overlayWindow && !this.currentSettings.overlay.pinned) this.overlayWindow.hide()
  }

  private onMainWindowClosed = () => {
    this.mainWindow = null
    this.destroyOverlayWindow()
  }

  private onOverlayWindowClosed = () => {
    this.overlayWindow = null
    this.overlayMoveListener = null
    if (this.overlayMoveDebounce) clearTimeout(this.overlayMoveDebounce)
    this.overlayMoveDebounce = null
    this.temporaryInteractiveActive = false
    this.clearTemporaryInteractiveReset()
  }

  private destroyOverlayWindow() {
    const overlay = this.overlayWindow
    if (!overlay || overlay.isDestroyed()) {
      this.overlayWindow = null
      this.overlayMoveListener = null
      if (this.overlayMoveDebounce) clearTimeout(this.overlayMoveDebounce)
      this.overlayMoveDebounce = null
      this.temporaryInteractiveActive = false
      this.clearTemporaryInteractiveReset()
      return
    }

    if (this.overlayMoveListener) overlay.off('move', this.overlayMoveListener)
    this.overlayMoveListener = null
    if (this.overlayMoveDebounce) clearTimeout(this.overlayMoveDebounce)
    this.overlayMoveDebounce = null
    this.temporaryInteractiveActive = false
    this.clearTemporaryInteractiveReset()

    overlay.close()
  }

  private scheduleTemporaryInteractiveReset() {
    this.clearTemporaryInteractiveReset()
    this.overlayInteractiveAutoResetTimer = setTimeout(() => {
      if (!this.temporaryInteractiveActive || !this.currentSettings.overlay.interactive) return
      this.temporaryInteractiveActive = false
      void this.updateSettings({ overlay: { interactive: false } })
    }, this.temporaryInteractiveMs)
  }

  private clearTemporaryInteractiveReset() {
    if (!this.overlayInteractiveAutoResetTimer) return
    const timer = this.overlayInteractiveAutoResetTimer
    this.overlayInteractiveAutoResetTimer = null
    clearTimeout(timer)
  }
}

import { app, BrowserWindow, globalShortcut, systemPreferences } from 'electron'
import { normalizeRiotLocale } from '../../services/blitz/locales'
import { DEFAULT_SETTINGS, type Settings, type SettingsPatch } from '../../services/settings/types'
import type { MainProcessDependencies } from '../bootstrap/dependencies'
import { createMainWindow } from '../windows/mainWindow'
import { createOverlayWindow } from '../windows/overlayWindow'
import { applyMainWindowSize, bindMainWindowResizePersistence } from './mainWindowSizing'
import {
  applyOverlayBounds,
  applyOverlayInteractiveState,
  applyOverlayPinnedState,
  bindOverlayBoundsPersistence,
} from './overlayWindowBounds'
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
  private overlayCompact = false
  private applyingMainWindowBounds = false
  private mainWindowResizeCleanup: (() => void) | null = null
  private applyingOverlayBounds = false
  private overlayBoundsCleanup: (() => void) | null = null
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
  getAccessibilityStatus = () => ({ trusted: this.isAccessibilityTrusted() })

  showMainWindow() {
    this.ensureWindows()
    applyMainWindowSize(this.mainWindow, this.currentSettings, this.setApplyingMainWindowBounds)
    this.applyOverlayBoundsFromSettings(this.currentSettings)
    this.applyOverlayWindowStateFromSettings(this.currentSettings)
    this.bindMainWindowResizePersistence()
    this.bindOverlayBoundsPersistence()
    this.mainWindow?.show()
  }

  async start() {
    if (this.started) return
    this.started = true
    this.dependencies.databaseLifecycle.init()
    await this.dependencies.settingsStore.load()
    this.currentSettings = this.dependencies.settingsStore.get()
    this.dependencies.settingsStore.on('changed', this.onSettingsStoreChanged)
    this.ensureWindows()
    applyMainWindowSize(this.mainWindow, this.currentSettings, this.setApplyingMainWindowBounds)
    this.applyOverlayBoundsFromSettings(this.currentSettings)
    this.applyOverlayWindowStateFromSettings(this.currentSettings)
    this.applyLanguageFromSettings(this.currentSettings)
    await this.dependencies.gameContext.start()
    this.dependencies.gameContext.on('gameEnded', this.onGameEnded)
    this.bindMainWindowResizePersistence()
    this.bindOverlayBoundsPersistence()
    this.registerShortcuts(this.currentSettings)
  }

  shutdown() {
    this.started = false
    this.dependencies.settingsStore.off('changed', this.onSettingsStoreChanged)
    this.dependencies.gameContext.off('gameEnded', this.onGameEnded)
    this.mainWindowResizeCleanup?.()
    this.mainWindowResizeCleanup = null
    this.overlayBoundsCleanup?.()
    this.overlayBoundsCleanup = null
    this.clearTemporaryInteractiveReset()
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

  setOverlayCompact(compact: boolean) {
    if (this.overlayCompact === compact) return
    this.overlayCompact = compact
    this.applyOverlayBoundsFromSettings(this.currentSettings)
    this.applyOverlayWindowStateFromSettings(this.currentSettings)
  }

  private ensureWindows() {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      this.mainWindow = createMainWindow(this.currentSettings)
      this.mainWindow.on('closed', this.onMainWindowClosed)
    }
    if (!this.overlayWindow || this.overlayWindow.isDestroyed()) {
      this.overlayWindow = createOverlayWindow(this.currentSettings)
      this.overlayWindow.on('closed', this.onOverlayWindowClosed)
    }
  }

  private isAccessibilityTrusted = () =>
    process.platform !== 'darwin' || systemPreferences.isTrustedAccessibilityClient(false)

  private applyOverlayBoundsFromSettings(s: Settings) {
    applyOverlayBounds({
      win: this.overlayWindow,
      overlay: s.overlay,
      compact: this.overlayCompact,
      onApplyingChange: this.setApplyingOverlayBounds,
      onResolveInvalidPosition: ({ x, y }) => {
        void this.dependencies.settingsStore.applyPatch({ overlay: { x, y } }).catch(() => {})
      },
    })
  }

  private applyOverlayWindowStateFromSettings(s: Settings) {
    applyOverlayInteractiveState({
      win: this.overlayWindow,
      interactive: s.overlay.interactive,
      compact: this.overlayCompact,
      onDisabled: () => {
        this.temporaryInteractiveActive = false
        this.clearTemporaryInteractiveReset()
      },
    })
    applyOverlayPinnedState(this.overlayWindow, s.overlay.pinned)
  }

  private applyLanguageFromSettings(s: Settings) {
    const locale = s.language === 'auto' ? app.getLocale() : s.language
    const normalized = normalizeRiotLocale(locale)
    this.dependencies.gameContext.setLanguage(normalized === 'zh_TW' ? 'zh_CN' : normalized)
  }

  private applyRuntimeSettings(settings: Settings) {
    this.registerShortcuts(settings)
    applyMainWindowSize(this.mainWindow, settings, this.setApplyingMainWindowBounds)
    this.applyOverlayBoundsFromSettings(settings)
    this.applyOverlayWindowStateFromSettings(settings)
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

  private bindOverlayBoundsPersistence() {
    if (!this.overlayWindow) return
    this.overlayBoundsCleanup?.()
    this.overlayBoundsCleanup = bindOverlayBoundsPersistence({
      win: this.overlayWindow,
      isApplying: () => this.applyingOverlayBounds || this.overlayCompact,
      onBoundsStable: ({ x, y, width, height }) => {
        void this.dependencies.settingsStore.applyPatch({ overlay: { x, y, width, height } }).catch(() => {})
      },
    })
  }

  private bindMainWindowResizePersistence() {
    if (!this.mainWindow) return
    this.mainWindowResizeCleanup?.()
    this.mainWindowResizeCleanup = bindMainWindowResizePersistence({
      win: this.mainWindow,
      isApplying: () => this.applyingMainWindowBounds,
      onResizeStable: ({ width, height }) => {
        void this.dependencies.settingsStore
          .applyPatch({ window: { main: { width, height } } })
          .catch(() => {})
      },
    })
  }

  private onSettingsStoreChanged = (settings: Settings) => {
    this.currentSettings = settings
    this.applyLanguageFromSettings(settings)
  }
  private onGameEnded = () => {
    if (this.overlayWindow && !this.currentSettings.overlay.pinned) this.overlayWindow.hide()
  }

  private onMainWindowClosed = () => {
    this.mainWindowResizeCleanup?.()
    this.mainWindow = null
    this.mainWindowResizeCleanup = null
    this.destroyOverlayWindow()
  }

  private onOverlayWindowClosed = () => {
    this.overlayBoundsCleanup?.()
    this.overlayWindow = null
    this.overlayBoundsCleanup = null
    this.overlayCompact = false
    this.temporaryInteractiveActive = false
    this.clearTemporaryInteractiveReset()
  }

  private destroyOverlayWindow() {
    const overlay = this.overlayWindow
    if (!overlay || overlay.isDestroyed()) {
      this.overlayWindow = null
      this.overlayBoundsCleanup?.()
      this.overlayBoundsCleanup = null
      this.temporaryInteractiveActive = false
      this.clearTemporaryInteractiveReset()
      return
    }

    this.overlayBoundsCleanup?.()
    this.overlayBoundsCleanup = null
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
  private setApplyingMainWindowBounds = (value: boolean) => {
    this.applyingMainWindowBounds = value
  }
  private setApplyingOverlayBounds = (value: boolean) => {
    this.applyingOverlayBounds = value
  }
}

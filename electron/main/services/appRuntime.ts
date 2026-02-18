import { app, BrowserWindow, globalShortcut, screen, systemPreferences } from 'electron'

import { normalizeRiotLocale } from '../../services/blitz/locales'
import { DEFAULT_SETTINGS, type Settings, type SettingsPatch } from '../../services/settings/types'
import type { MainProcessDependencies } from '../bootstrap/dependencies'
import { createMainWindow } from '../windows/mainWindow'
import { createOverlayWindow } from '../windows/overlayWindow'

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
  private settingsMutationQueue: Promise<void> = Promise.resolve()
  private readonly cycleOverlayAugmentHotkey = 'CommandOrControl+Shift+J'
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
    if (s.overlay.interactive) {
      this.overlayWindow.setIgnoreMouseEvents(false)
      this.overlayWindow.setFocusable(true)
      this.overlayWindow.show()
    } else {
      this.overlayWindow.setIgnoreMouseEvents(true, { forward: true })
      this.overlayWindow.setFocusable(false)
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
    globalShortcut.unregisterAll()
    const okPinned = globalShortcut.register(s.hotkeys.togglePinned, () => {
      if (this.currentSettings.overlay.pinned) {
        void this.updateSettings({ overlay: { pinned: false } })
      } else {
        void this.updateSettings({ overlay: { pinned: true, interactive: true } })
      }
    })
    if (!okPinned) {
      this.logger.warn('failed to register hotkey', {
        hotkey: s.hotkeys.togglePinned,
        action: 'togglePinned',
      })
    }

    const okInteractive = globalShortcut.register(s.hotkeys.toggleInteractive, () => {
      void this.updateSettings({ overlay: { interactive: !this.currentSettings.overlay.interactive } })
    })
    if (!okInteractive) {
      this.logger.warn('failed to register hotkey', {
        hotkey: s.hotkeys.toggleInteractive,
        action: 'toggleInteractive',
      })
    }

    const okCycleAugment = globalShortcut.register(this.cycleOverlayAugmentHotkey, () => {
      const current = this.currentSettings.overlay.augmentRarity
      const next = current === 'prismatic' ? 'gold' : current === 'gold' ? 'silver' : 'prismatic'
      void this.updateSettings({ overlay: { augmentRarity: next } })
    })
    if (!okCycleAugment) {
      this.logger.warn('failed to register overlay augment cycle hotkey', {
        hotkey: this.cycleOverlayAugmentHotkey,
      })
    }
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
    if (!this.overlayWindow) return
    if (!this.currentSettings.overlay.pinned) this.overlayWindow.hide()
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
  }

  private destroyOverlayWindow() {
    const overlay = this.overlayWindow
    if (!overlay || overlay.isDestroyed()) {
      this.overlayWindow = null
      this.overlayMoveListener = null
      if (this.overlayMoveDebounce) clearTimeout(this.overlayMoveDebounce)
      this.overlayMoveDebounce = null
      return
    }

    if (this.overlayMoveListener) overlay.off('move', this.overlayMoveListener)
    this.overlayMoveListener = null
    if (this.overlayMoveDebounce) clearTimeout(this.overlayMoveDebounce)
    this.overlayMoveDebounce = null

    overlay.close()
  }
}

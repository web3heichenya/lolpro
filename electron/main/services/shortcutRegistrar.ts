import { globalShortcut } from 'electron'

import type { Settings, SettingsPatch } from '../../services/settings/types'

type Logger = {
  warn: (msg: string, meta?: Record<string, unknown>) => void
}

type RegisterAppShortcutsParams = {
  settings: Settings
  logger: Logger
  cycleOverlayAugmentHotkey: string
  getCurrentSettings: () => Settings
  setTemporaryInteractiveActive: (active: boolean) => void
  clearTemporaryInteractiveReset: () => void
  scheduleTemporaryInteractiveReset: () => void
  updateSettings: (patch: SettingsPatch) => Promise<Settings>
}

export function registerAppShortcuts(params: RegisterAppShortcutsParams) {
  const {
    settings,
    logger,
    cycleOverlayAugmentHotkey,
    getCurrentSettings,
    setTemporaryInteractiveActive,
    clearTemporaryInteractiveReset,
    scheduleTemporaryInteractiveReset,
    updateSettings,
  } = params

  globalShortcut.unregisterAll()

  const okPinned = globalShortcut.register(settings.hotkeys.togglePinned, () => {
    const current = getCurrentSettings()
    if (current.overlay.pinned) {
      void updateSettings({ overlay: { pinned: false } })
    } else {
      void updateSettings({ overlay: { pinned: true, interactive: true } })
    }
  })
  if (!okPinned) {
    logger.warn('failed to register hotkey', {
      hotkey: settings.hotkeys.togglePinned,
      action: 'togglePinned',
    })
  }

  const okInteractive = globalShortcut.register(settings.hotkeys.toggleInteractive, () => {
    const current = getCurrentSettings()
    if (current.overlay.interactive) {
      setTemporaryInteractiveActive(false)
      clearTemporaryInteractiveReset()
      void updateSettings({ overlay: { interactive: false } })
      return
    }

    setTemporaryInteractiveActive(true)
    void updateSettings({ overlay: { pinned: true, interactive: true } })
      .then(() => scheduleTemporaryInteractiveReset())
      .catch(() => {
        setTemporaryInteractiveActive(false)
        clearTemporaryInteractiveReset()
      })
  })
  if (!okInteractive) {
    logger.warn('failed to register hotkey', {
      hotkey: settings.hotkeys.toggleInteractive,
      action: 'toggleInteractive',
    })
  }

  const okCycleAugment = globalShortcut.register(cycleOverlayAugmentHotkey, () => {
    const current = getCurrentSettings().overlay.augmentRarity
    const next = current === 'prismatic' ? 'gold' : current === 'gold' ? 'silver' : 'prismatic'
    void updateSettings({ overlay: { augmentRarity: next } })
  })
  if (!okCycleAugment) {
    logger.warn('failed to register overlay augment cycle hotkey', {
      hotkey: cycleOverlayAugmentHotkey,
    })
  }
}

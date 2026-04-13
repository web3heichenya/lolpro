import type { Settings } from '@/app/types'

type Translate = (key: string) => string

export type HotkeyRow = {
  label: string
  value: string
}

function normalizeAccelerator(value: string): string {
  return value
    .replace(/CommandOrControl/gi, 'Ctrl/Cmd')
    .replace(/\+/g, ' + ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export function getHotkeyRows(t: Translate, settings: Settings | null): HotkeyRow[] {
  return [
    {
      label: t('settings.hotkeys.shortcut.togglePinned'),
      value: normalizeAccelerator(settings?.hotkeys.togglePinned ?? 'CommandOrControl+Shift+T'),
    },
    {
      label: t('settings.hotkeys.shortcut.toggleInteractive'),
      value: normalizeAccelerator(settings?.hotkeys.toggleInteractive ?? 'CommandOrControl+Shift+I'),
    },
    {
      label: t('settings.hotkeys.shortcut.cycleAugments'),
      value: 'Ctrl/Cmd + Shift + J',
    },
  ]
}

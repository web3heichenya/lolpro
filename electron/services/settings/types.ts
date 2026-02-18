import type { Settings } from '../../../shared/contracts'
import { DEFAULT_OPGG_TIER, DEFAULT_OPGG_REGION } from '../../../shared/opgg'
export type { LanguageSetting, Settings, SettingsPatch } from '../../../shared/contracts'

export const DEFAULT_SETTINGS: Settings = {
  version: 1,
  language: 'auto',
  theme: {
    preference: 'system',
  },
  dataSource: {
    opgg: {
      region: DEFAULT_OPGG_REGION,
      tier: DEFAULT_OPGG_TIER,
    },
  },
  overlay: {
    pinned: false,
    interactive: false,
    x: -1,
    y: -1,
    augmentRarity: 'prismatic',
  },
  hotkeys: {
    togglePinned: 'CommandOrControl+Shift+T',
    toggleInteractive: 'CommandOrControl+Shift+I',
  },
}

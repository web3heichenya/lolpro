export const GAME_MODES = ['aram-mayhem', 'arena'] as const

export type GameModeId = (typeof GAME_MODES)[number]

export const DEFAULT_GAME_MODE: GameModeId = 'aram-mayhem'

export const SUPPORTED_QUEUE_TO_MODE: Record<number, GameModeId> = {
  2400: 'aram-mayhem',
  1700: 'arena',
  1710: 'arena',
}

export type ModeMeta = {
  id: GameModeId
  label: string
  features: string[]
  theme: {
    // HSL triplets as strings (no wrapping `hsl()`), easy to reuse in CSS/gradients.
    accentA: string
    accentB: string
    accentC: string
  }
}

export const MODE_META: Record<GameModeId, Omit<ModeMeta, 'id'>> = {
  'aram-mayhem': {
    label: 'ARAM Mayhem',
    features: ['海克斯推荐', '装备推荐', 'LCU 自动识别', '游戏内浮窗'],
    theme: {
      accentA: '284 84% 58%',
      accentB: '212 92% 58%',
      accentC: '14 92% 58%',
    },
  },
  arena: {
    label: 'Arena',
    features: ['海克斯推荐', '装备推荐', 'LCU 自动识别', '游戏内浮窗'],
    theme: {
      accentA: '43 96% 56%',
      accentB: '12 94% 57%',
      accentC: '199 89% 57%',
    },
  },
}

export function listSupportedModes(): ModeMeta[] {
  return GAME_MODES.map((id) => ({ id, ...MODE_META[id] }))
}

export function resolveSupportedModeByQueueId(queueId?: number): GameModeId | null {
  if (!Number.isFinite(queueId) || !queueId) return null
  return SUPPORTED_QUEUE_TO_MODE[queueId] ?? null
}

import type { LcuStatus } from '@/app/types'

export type GamePhaseMeta = {
  key: string
  dotClassName: string
}

export function resolveGamePhaseMeta(lcu: LcuStatus | null | undefined): GamePhaseMeta {
  if (!lcu?.connected) return { key: 'offline', dotClassName: 'bg-slate-500' }

  switch (lcu.phase) {
    case 'Lobby':
      return { key: 'lobby', dotClassName: 'bg-sky-500' }
    case 'Matchmaking':
      return { key: 'queue', dotClassName: 'bg-amber-500' }
    case 'ReadyCheck':
      return { key: 'ready', dotClassName: 'bg-yellow-500' }
    case 'ChampSelect':
      return { key: 'select', dotClassName: 'bg-violet-500' }
    case 'GameStart':
      return { key: 'game-start', dotClassName: 'bg-blue-500' }
    case 'InProgress':
      return { key: 'in-game', dotClassName: 'bg-emerald-500' }
    case 'Reconnect':
      return { key: 'reconnect', dotClassName: 'bg-orange-500' }
    case 'WaitingForStats':
    case 'PreEndOfGame':
    case 'EndOfGame':
      return { key: 'post-game', dotClassName: 'bg-pink-500' }
    default:
      return { key: 'idle', dotClassName: 'bg-cyan-500' }
  }
}

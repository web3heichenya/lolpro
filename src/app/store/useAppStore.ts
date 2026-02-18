import { create } from 'zustand'

import { DEFAULT_GAME_MODE, type GameModeId } from '@shared/gameModes'

export type MainPanel = 'build' | 'ingame'

type AppState = {
  mainPanel: MainPanel
  modeId: GameModeId
  selectedId: string | null
  query: string
  showAllAugments: boolean
  clearingCacheMode: GameModeId | null
  error: string | null

  setMainPanel: (panel: MainPanel) => void
  setModeId: (modeId: GameModeId) => void
  setSelectedId: (selectedId: string | null) => void
  setQuery: (query: string) => void
  setShowAllAugments: (showAllAugments: boolean) => void
  setClearingCacheMode: (modeId: GameModeId | null) => void
  setError: (error: string | null) => void
  resetDetailState: () => void
}

export const useAppStore = create<AppState>((set) => ({
  mainPanel: 'build',
  modeId: DEFAULT_GAME_MODE,
  selectedId: null,
  query: '',
  showAllAugments: false,
  clearingCacheMode: null,
  error: null,

  setMainPanel: (mainPanel) => set(() => ({ mainPanel })),
  setModeId: (modeId) =>
    set(() => ({
      modeId,
      showAllAugments: false,
    })),
  setSelectedId: (selectedId) =>
    set(() => ({
      selectedId,
      showAllAugments: false,
    })),
  setQuery: (query) => set(() => ({ query })),
  setShowAllAugments: (showAllAugments) => set(() => ({ showAllAugments })),
  setClearingCacheMode: (clearingCacheMode) => set(() => ({ clearingCacheMode })),
  setError: (error) => set(() => ({ error })),
  resetDetailState: () => set(() => ({ showAllAugments: false })),
}))

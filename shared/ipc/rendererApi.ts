import type {
  AccessibilityStatus,
  AppUpdateStatus,
  BuildResult,
  ChampionProfile,
  ChampionSummary,
  GameContext,
  GameModeId,
  LcuStatus,
  PlayerCareerSnapshot,
  RiotLocale,
  Settings,
  SettingsPatch,
  SummonerInfo,
  SupportedMode,
} from '../contracts'

export type Unsubscribe = () => void

export type BaseRendererApi = {
  platform: 'darwin' | 'win32' | 'linux'

  getChampions: (opts?: { lang?: RiotLocale }) => Promise<ChampionSummary[]>
  getChampionProfile: (opts: { championId: string; lang?: RiotLocale }) => Promise<ChampionProfile>
  getSupportedModes: () => Promise<SupportedMode[]>

  getLcuStatus: () => Promise<LcuStatus>

  onLcuStatusChanged: (cb: (status: LcuStatus) => void) => Unsubscribe
  onDetectedChampionChanged: (cb: (championId: number) => void) => Unsubscribe

  getActiveBuildSnapshot: () => Promise<BuildResult | null>
  onActiveBuildChanged: (cb: (build: BuildResult | null) => void) => Unsubscribe

  getGameContextSnapshot: () => Promise<GameContext>
  refreshGameContext: () => Promise<GameContext>
  getPlayerCareer: (opts: { puuid: string }) => Promise<PlayerCareerSnapshot>
  getSummonerByPuuid: (opts: { puuid: string }) => Promise<SummonerInfo | null>
  onGameContextChanged: (cb: (gc: GameContext) => void) => Unsubscribe

  getSettings: () => Promise<Settings>
  onSettingsChanged: (cb: (settings: Settings) => void) => Unsubscribe

  getAccessibilityStatus: () => Promise<AccessibilityStatus>
  openAccessibilitySettings: () => Promise<void>
}

export type MainRendererApi = BaseRendererApi & {
  startLcuAutoDetect: () => Promise<void>

  getBuild: (opts: {
    mode: GameModeId
    championId: string
    lang?: RiotLocale
    force?: boolean
  }) => Promise<BuildResult>

  clearBuildCache: (opts: { mode: GameModeId }) => Promise<void>

  updateSettings: (patch: SettingsPatch) => Promise<Settings>
  resetSettings: () => Promise<Settings>
  getAppUpdateStatus: () => Promise<AppUpdateStatus>
  checkForAppUpdates: () => Promise<AppUpdateStatus>
  downloadAppUpdate: () => Promise<AppUpdateStatus>
  installAppUpdate: () => Promise<void>
  onAppUpdateStatusChanged: (cb: (status: AppUpdateStatus) => void) => Unsubscribe

  toggleOverlay: () => Promise<void>
  setOverlayVisible: (visible: boolean) => Promise<void>
  setOverlayInteractive: (interactive: boolean) => Promise<void>

  windowMinimize: () => Promise<void>
  windowMaximizeToggle: () => Promise<void>
  windowClose: () => Promise<void>
}

export type OverlayRendererApi = BaseRendererApi

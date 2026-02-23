import type { GameModeId } from '../gameModes'
import type { OpggTier, OpggRegion } from '../opgg'
export type { GameModeId } from '../gameModes'

export type RiotLocale = 'en_US' | 'zh_CN' | 'zh_TW' | (string & {})

export type LanguageSetting = 'auto' | 'en_US' | 'zh_CN'
export type ThemePreference = 'system' | 'light' | 'dark'
export type OverlayAugmentRarity = 'prismatic' | 'gold' | 'silver'

export interface ChampionSummary {
  id: string
  name: string
  title?: string
  slug: string
  iconUrl?: string
  splashUrl?: string
}

export interface ChampionAbility {
  key: string
  name: string
  description?: string
  tooltip?: string
  iconUrl?: string
  videoUrl?: string
  maxRank?: number | null
  cooldowns?: number[]
  costs?: number[]
  ranges?: number[]
}

export interface ChampionProfile {
  championId: string
  key: string
  name: string
  title?: string
  imageUrl?: string
  blurb?: string
  lore?: string
  partype?: string
  tags?: string[]
  allyTips?: string[]
  enemyTips?: string[]
  source?: string
  info?: {
    attack?: number
    defense?: number
    magic?: number
    difficulty?: number
  }
  passive?: ChampionAbility
  spells?: ChampionAbility[]
}

export interface AugmentRecommendation {
  augmentId: string
  tier: number | null
  pickRate: number | null
  winRate: number | null
  games: number | null
  name?: string
  tooltip?: string
  iconUrl?: string
  rarity?: string
}

export interface ItemRecommendation {
  itemId: string
  tier: number | null
  pickRate: number | null
  winRate: number | null
  games: number | null
  name?: string
  description?: string
  iconUrl?: string
  averageIndex?: number | null
}

export type RuneRecommendation = {
  primaryStyleId: number
  subStyleId: number
  selectedPerkIds: number[]
  pickRate: number | null
  winRate?: number | null
  games?: number | null
  primaryStyleName?: string
  subStyleName?: string
  primaryStyleIconUrl?: string
  subStyleIconUrl?: string
  primaryPerkIds?: number[]
  secondaryPerkIds?: number[]
  statModIds?: number[]
  primaryPerks?: Array<{ id: number; name?: string; iconUrl?: string }>
  secondaryPerks?: Array<{ id: number; name?: string; iconUrl?: string }>
  statMods?: Array<{ id: number; name?: string; iconUrl?: string }>
}

export type SummonerSpellRecommendation = {
  summonerSpellIds: number[]
  games: number | null
  pickRate: number | null
  winRate: number | null
  spells?: Array<{ id: number; name?: string; iconUrl?: string }>
}

export type SkillOrderRecommendation = {
  skillOrder: number[]
  games: number | null
  pickRate: number | null
  winRate: number | null
}

export type SkillMasteryRecommendation = {
  order: string[]
  pickRate: number | null
  winRate: number | null
}

export type StartingItemsRecommendation = {
  itemIds: number[]
  games: number | null
  pickRate: number | null
  winRate: number | null
  items?: Array<{ id: number; name?: string; iconUrl?: string }>
}

export type CounterRecommendation = {
  championId: string
  winRate: number | null
  pickRate: number | null
}

export type SynergyRecommendation = {
  championId: string
  winRate: number | null
  pickRate: number | null
  averagePlace: number | null
}

export type BuildSummary = {
  winRate: number | null
  pickRate: number | null
  banRate: number | null
  kda: number | null
  tier: number | null
  rank: number | null
  averagePlace: number | null
  firstRate: number | null
}

export interface BuildResultBase {
  mode: GameModeId
  championId: string
  patch: string
  dt?: string
}

export interface AramMayhemBuildResult extends BuildResultBase {
  mode: 'aram-mayhem'
  dataSource?: string
  position?: string
  summary?: BuildSummary
  augments: AugmentRecommendation[]
  items: ItemRecommendation[]
  runes?: RuneRecommendation[]
  summonerSpells?: SummonerSpellRecommendation[]
  skillOrders?: SkillOrderRecommendation[]
  skillMasteries?: SkillMasteryRecommendation[]
  startingItems?: StartingItemsRecommendation[]
  coreItems?: StartingItemsRecommendation[]
  bootsItems?: StartingItemsRecommendation[]
  situationalItems?: number[]
  counters?: {
    strongAgainst: CounterRecommendation[]
    weakAgainst: CounterRecommendation[]
  }
  synergies?: SynergyRecommendation[]
}

export interface AramBuildResult extends BuildResultBase {
  mode: 'aram'
  dataSource?: string
  position?: string
  summary?: BuildSummary
  augments: AugmentRecommendation[]
  items: ItemRecommendation[]
  runes?: RuneRecommendation[]
  summonerSpells?: SummonerSpellRecommendation[]
  skillOrders?: SkillOrderRecommendation[]
  skillMasteries?: SkillMasteryRecommendation[]
  startingItems?: StartingItemsRecommendation[]
  coreItems?: StartingItemsRecommendation[]
  bootsItems?: StartingItemsRecommendation[]
  situationalItems?: number[]
  counters?: {
    strongAgainst: CounterRecommendation[]
    weakAgainst: CounterRecommendation[]
  }
  synergies?: SynergyRecommendation[]
}

export interface RankedBuildResult extends BuildResultBase {
  mode: 'ranked'
  dataSource?: string
  position?: string
  summary?: BuildSummary
  augments: AugmentRecommendation[]
  items: ItemRecommendation[]
  runes?: RuneRecommendation[]
  summonerSpells?: SummonerSpellRecommendation[]
  skillOrders?: SkillOrderRecommendation[]
  skillMasteries?: SkillMasteryRecommendation[]
  startingItems?: StartingItemsRecommendation[]
  coreItems?: StartingItemsRecommendation[]
  bootsItems?: StartingItemsRecommendation[]
  situationalItems?: number[]
  counters?: {
    strongAgainst: CounterRecommendation[]
    weakAgainst: CounterRecommendation[]
  }
  synergies?: SynergyRecommendation[]
}

export interface ArenaBuildResult extends BuildResultBase {
  mode: 'arena'
  dataSource?: string
  position?: string
  summary?: BuildSummary
  augments: AugmentRecommendation[]
  items: ItemRecommendation[]
  // Arena-only: "prism_items" from OP.GG (prismatic items). Stored as 1-item combos for consistent UI.
  prismaticItems?: StartingItemsRecommendation[]
  runes?: RuneRecommendation[]
  summonerSpells?: SummonerSpellRecommendation[]
  skillOrders?: SkillOrderRecommendation[]
  skillMasteries?: SkillMasteryRecommendation[]
  startingItems?: StartingItemsRecommendation[]
  coreItems?: StartingItemsRecommendation[]
  bootsItems?: StartingItemsRecommendation[]
  situationalItems?: number[]
  counters?: {
    strongAgainst: CounterRecommendation[]
    weakAgainst: CounterRecommendation[]
  }
  synergies?: SynergyRecommendation[]
}

export type BuildResult = RankedBuildResult | AramBuildResult | AramMayhemBuildResult | ArenaBuildResult

export interface LcuStatus {
  connected: boolean
  phase?: string
  currentChampionId?: number
  queueId?: number
  inProgress?: boolean
  champSelectSession?: {
    localPlayerCellId?: number
    myTeam: Array<{
      cellId?: number
      puuid?: string
      championId?: number
      championPickIntent?: number
      assignedPosition?: string
    }>
    theirTeam: Array<{
      cellId?: number
      puuid?: string
      championId?: number
      championPickIntent?: number
      assignedPosition?: string
    }>
  }
  summoner?: SummonerInfo
}

export interface LiveClientStatus {
  connected: boolean
  championName?: string
  championId?: number
  gameMode?: string
  activePlayerName?: string
  allPlayers?: Array<{
    team?: string
    summonerName?: string
    championName?: string
    championId?: number
    isBot?: boolean
  }>
}

export type DetectedChampionSource = 'lcu' | 'liveclient' | null

export interface GameContext {
  modeId: GameModeId
  isSupportedMode: boolean
  isGameRelated: boolean
  detectedChampionId?: number
  detectedChampionSource: DetectedChampionSource
  lcu: LcuStatus
  live: LiveClientStatus
}

export type SummonerInfo = {
  puuid?: string
  gameName?: string
  displayName?: string
  tagLine?: string
  summonerLevel?: number
  profileIconId?: number
}

export type PlayerCareerSnapshot = {
  puuid: string
  summoner?: SummonerInfo
  recentMatches: Array<{
    gameId?: number
    queueId?: number
    championId?: number
    win: boolean | null
    kills: number | null
    deaths: number | null
    assists: number | null
    kda: number | null
    gameCreation?: number
    gameDuration?: number
  }>
}

export type AccessibilityStatus = {
  trusted: boolean
}

export type Settings = {
  version: 1
  language: LanguageSetting
  theme: {
    preference: ThemePreference
  }
  dataSource: {
    opgg: {
      region: OpggRegion
      tier: OpggTier
    }
  }
  overlay: {
    pinned: boolean
    interactive: boolean
    x: number
    y: number
    augmentRarity: OverlayAugmentRarity
  }
  hotkeys: {
    togglePinned: string
    toggleInteractive: string
  }
}

export type SettingsPatch = Partial<{
  language: LanguageSetting
  theme: Partial<Settings['theme']>
  dataSource: {
    opgg?: Partial<Settings['dataSource']['opgg']>
  }
  overlay: Partial<Settings['overlay']>
  hotkeys: Partial<Settings['hotkeys']>
}>

export type SupportedMode = {
  id: GameModeId
  label: string
  features: string[]
}

export type AppUpdateStatusStage =
  | 'disabled'
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error'

export type AppUpdateStatus = {
  stage: AppUpdateStatusStage
  currentVersion: string
  latestVersion?: string
  releaseName?: string
  releaseDate?: string
  message?: string
  progress?: {
    percent: number
    transferred: number
    total: number
    bytesPerSecond: number
  }
  canCheck: boolean
  canDownload: boolean
  canInstall: boolean
}

export type IpcErrorCode =
  | 'VALIDATION_ERROR'
  | 'FORBIDDEN'
  | 'UNSUPPORTED_MODE'
  | 'NOT_FOUND'
  | 'SETTINGS_ERROR'
  | 'INTERNAL_ERROR'

export type IpcErrorPayload = {
  code: IpcErrorCode
  message: string
  details?: Record<string, unknown>
}

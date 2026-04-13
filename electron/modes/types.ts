import type { BuildResult, RiotLocale } from '../../shared/contracts'
import type { GameModeId } from '../../shared/gameModes'
import type { OpggTier, OpggRegion } from '../../shared/opgg'

export type { BuildResult } from '../../shared/contracts'
export type { GameModeId } from '../../shared/gameModes'

export interface BuildProvider {
  modeId: GameModeId
  getBuild: (params: {
    championId: string
    championKey?: string
    lang?: RiotLocale
    region?: OpggRegion
    tier?: OpggTier
  }) => Promise<BuildResult>
  shouldRefreshCachedBuild: (build: BuildResult) => boolean
}

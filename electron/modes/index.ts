import type { BuildProvider, BuildResult, GameModeId } from './types'
import type { RiotLocale } from '../services/blitz/locales'
import type { OpggTier, OpggRegion } from '../../shared/opgg'
import type { OPGGService } from '../services/opgg/service'
import type { BlitzWebService } from '../services/blitz-web/service'

import { createAramMayhemProvider } from './aram-mayhem/provider'
import { createArenaProvider } from './arena/provider'

export type BuildResolver = {
  getBuild: (params: {
    mode: GameModeId
    championId: string
    championKey?: string
    lang?: RiotLocale
    region?: OpggRegion
    tier?: OpggTier
  }) => Promise<BuildResult>
}

export function createBuildResolver(
  opggService: Pick<OPGGService, 'getAramMayhemBuild' | 'getArenaBuild'>,
  blitzWebService: Pick<BlitzWebService, 'getAramMayhemBuild'>,
): BuildResolver {
  const providers: Record<GameModeId, BuildProvider> = {
    'aram-mayhem': createAramMayhemProvider({ opggService, blitzWebService }),
    arena: createArenaProvider(opggService),
  }

  return {
    async getBuild(params) {
      const provider = providers[params.mode]
      if (!provider) throw new Error(`Unsupported mode: ${params.mode}`)
      return await provider.getBuild({
        championId: params.championId,
        championKey: params.championKey,
        lang: params.lang,
        region: params.region,
        tier: params.tier,
      })
    },
  }
}

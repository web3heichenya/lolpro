import type { BuildProvider } from '../types'
import type { OPGGService } from '../../services/opgg/service'
import type { BlitzWebService } from '../../services/blitz-web/service'
import { shouldRetrySelfHeal } from '../cacheRefresh'

export function createAramMayhemProvider(services: {
  opggService: Pick<OPGGService, 'getAramMayhemBuild'>
  blitzWebService: Pick<BlitzWebService, 'getAramMayhemBuild'>
}): BuildProvider {
  const source = getAramMayhemSource()

  return {
    modeId: 'aram-mayhem',

    async getBuild({ championId, championKey, lang, region, tier }) {
      if (source === 'opgg') {
        return await services.opggService.getAramMayhemBuild({
          championId,
          championKey,
          lang,
          region,
          tier,
        })
      }

      return await services.blitzWebService.getAramMayhemBuild({
        championId,
        lang,
      })
    },

    shouldRefreshCachedBuild(build) {
      if (build.mode !== 'aram-mayhem') return false

      const hasBaseData = (build.augments?.length ?? 0) > 0 || (build.items?.length ?? 0) > 0
      // If a previous scrape cached an empty payload, always retry to self-heal.
      if (!hasBaseData) return true

      const missingCore = (build.coreItems?.length ?? 0) === 0
      const missingSituational = (build.situationalItems?.length ?? 0) === 0
      const missingSkills =
        (build.skillMasteries?.length ?? 0) === 0 && (build.skillOrders?.length ?? 0) === 0
      const missingSummonerSpells = source === 'blitz' && (build.summonerSpells?.length ?? 0) === 0
      const looksLikeLegacyBrokenCache =
        missingCore || missingSituational || missingSkills || missingSummonerSpells
      if (!looksLikeLegacyBrokenCache) return false

      return shouldRetrySelfHeal(build.dt)
    },
  }
}

function getAramMayhemSource(): 'blitz' | 'opgg' {
  // Developer switch: ARAM_MAYHEM_SOURCE=blitz|opgg
  const value = (process.env.ARAM_MAYHEM_SOURCE ?? 'blitz').trim().toLowerCase()
  return value === 'opgg' ? 'opgg' : 'blitz'
}

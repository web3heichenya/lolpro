import type { BuildProvider } from '../types'
import type { OPGGService } from '../../services/opgg/service'
import type { BlitzWebService } from '../../services/blitz-web/service'

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
  }
}

function getAramMayhemSource(): 'blitz' | 'opgg' {
  // Developer switch: ARAM_MAYHEM_SOURCE=blitz|opgg
  const value = (process.env.ARAM_MAYHEM_SOURCE ?? 'blitz').trim().toLowerCase()
  return value === 'opgg' ? 'opgg' : 'blitz'
}

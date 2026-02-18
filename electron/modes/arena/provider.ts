import type { BuildProvider } from '../types'
import type { OPGGService } from '../../services/opgg/service'

export function createArenaProvider(opggService: Pick<OPGGService, 'getArenaBuild'>): BuildProvider {
  return {
    modeId: 'arena',

    async getBuild({ championId, championKey, lang, region, tier }) {
      void championKey
      return await opggService.getArenaBuild({ championId, lang, region, tier })
    },
  }
}

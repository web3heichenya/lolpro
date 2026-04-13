import type { AramMayhemBuildResult, RiotLocale } from '../../../shared/contracts'
import {
  ARAM_MAYHEM_CHAMPION_QUERY,
  ARAM_MAYHEM_QUEUE,
  CHAMPION_BUILDS_QUERY,
  fetchDatabricksRows,
} from './aram-mayhem/query'
import { transformBlitzAramMayhem } from './aram-mayhem/transform'

export class BlitzWebService {
  async getAramMayhemBuild(params: {
    championId: string
    lang?: RiotLocale
  }): Promise<AramMayhemBuildResult> {
    const championId = Number(params.championId)
    if (!Number.isFinite(championId) || championId <= 0) {
      throw new Error(`Invalid champion id: ${params.championId}`)
    }

    const [statsRows, buildRows] = await Promise.all([
      fetchDatabricksRows({
        query: ARAM_MAYHEM_CHAMPION_QUERY,
        variables: { champion_id: String(championId) },
      }),
      fetchDatabricksRows({
        query: CHAMPION_BUILDS_QUERY,
        variables: {
          championId: String(championId),
          queue: ARAM_MAYHEM_QUEUE,
          role: null,
          tier: null,
          matchupChampionId: null,
        },
      }),
    ])

    return await transformBlitzAramMayhem({
      championId,
      lang: params.lang,
      statsRows,
      buildRows,
    })
  }
}

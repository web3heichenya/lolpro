import type { BuildProvider } from '../types'
import type { OPGGService } from '../../services/opgg/service'
import { shouldRetrySelfHeal } from '../cacheRefresh'

export function createArenaProvider(opggService: Pick<OPGGService, 'getArenaBuild'>): BuildProvider {
  return {
    modeId: 'arena',

    async getBuild({ championId, championKey, lang, region, tier }) {
      void championKey
      return await opggService.getArenaBuild({ championId, lang, region, tier })
    },

    shouldRefreshCachedBuild(build) {
      if (build.mode !== 'arena') return false

      const comboItems = [
        ...(build.startingItems ?? []),
        ...(build.coreItems ?? []),
        ...(build.bootsItems ?? []),
      ].flatMap((combo) => combo.items ?? [])

      const hasBrokenComboItem = comboItems.some(
        (item) => item.id >= 100_000 && (!item.name || !item.iconUrl),
      )
      const hasBrokenFlatItem = (build.items ?? []).some((item) => {
        const id = Number(item.itemId)
        return Number.isFinite(id) && id >= 100_000 && (!item.name || !item.iconUrl)
      })
      const hasBrokenArenaItems = hasBrokenComboItem || hasBrokenFlatItem
      if (!hasBrokenArenaItems) return false

      // Self-heal once per cooldown window. If still unresolved after refetch, stop retrying.
      return shouldRetrySelfHeal(build.dt)
    },
  }
}

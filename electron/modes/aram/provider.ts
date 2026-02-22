import type { BuildProvider } from '../types'
import type { OPGGService } from '../../services/opgg/service'
import { shouldRetrySelfHeal } from '../cacheRefresh'

export function createAramProvider(opggService: Pick<OPGGService, 'getAramBuild'>): BuildProvider {
  return {
    modeId: 'aram',

    async getBuild({ championId, championKey, lang, region, tier }) {
      void championKey
      return await opggService.getAramBuild({ championId, lang, region, tier })
    },

    shouldRefreshCachedBuild(build) {
      if (build.mode !== 'aram') return false

      const compactPatch = /^\d+\.\d{2}$/.test(build.patch)
      const itemMap = new Map((build.items ?? []).map((item) => [String(item.itemId), item]))
      const referencedItemIds = new Set<string>()

      for (const combo of [
        ...(build.startingItems ?? []),
        ...(build.coreItems ?? []),
        ...(build.bootsItems ?? []),
      ]) {
        for (const id of combo.itemIds ?? []) referencedItemIds.add(String(id))
      }
      for (const id of build.situationalItems ?? []) referencedItemIds.add(String(id))

      const hasBrokenReferencedItem = Array.from(referencedItemIds).some((id) => {
        const item = itemMap.get(id)
        return !item || !item.name || !item.iconUrl
      })

      if (!compactPatch && !hasBrokenReferencedItem) return false
      return shouldRetrySelfHeal(build.dt)
    },
  }
}

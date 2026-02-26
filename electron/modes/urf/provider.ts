import type { BuildProvider } from '../types'
import type { OPGGService } from '../../services/opgg/service'
import { shouldRetrySelfHeal } from '../cacheRefresh'

export function createUrfProvider(opggService: Pick<OPGGService, 'getUrfBuild'>): BuildProvider {
  return {
    modeId: 'urf',

    async getBuild({ championId, championKey, lang, region, tier }) {
      void championKey
      return await opggService.getUrfBuild({ championId, lang, region, tier })
    },

    shouldRefreshCachedBuild(build) {
      if (build.mode !== 'urf') return false

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

      const missingSpellOrRuneData =
        (build.summonerSpells?.length ?? 0) === 0 || (build.runes?.length ?? 0) === 0
      const hasBrokenSpellMeta = (build.summonerSpells ?? []).some((combo) =>
        (combo.summonerSpellIds ?? []).some((id) => {
          const meta = combo.spells?.find((spell) => spell.id === id)
          return !meta?.name || !meta?.iconUrl
        }),
      )
      const hasBrokenRuneMeta = (build.runes ?? []).some(
        (rune) =>
          !rune.primaryStyleName ||
          !rune.subStyleName ||
          !rune.primaryStyleIconUrl ||
          !rune.subStyleIconUrl ||
          (rune.primaryPerks?.some((perk) => !perk.name || !perk.iconUrl) ?? false) ||
          (rune.secondaryPerks?.some((perk) => !perk.name || !perk.iconUrl) ?? false) ||
          (rune.statMods?.some((perk) => !perk.name || !perk.iconUrl) ?? false),
      )

      const requiresSetupMetadataRefresh = missingSpellOrRuneData || hasBrokenSpellMeta || hasBrokenRuneMeta
      if (requiresSetupMetadataRefresh) return true

      if (!compactPatch && !hasBrokenReferencedItem && !requiresSetupMetadataRefresh) {
        return false
      }
      return shouldRetrySelfHeal(build.dt)
    },
  }
}

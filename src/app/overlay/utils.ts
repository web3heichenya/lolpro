import type { AugmentRecommendation, BuildResult, ItemRecommendation, Settings } from '@/app/types'
import {
  compareAramAugmentsByComposite,
  compareBySortMode,
  compareByWinRateThenPickRate,
  compareItemsBySortMode,
  type BuildListSortMode,
} from '@shared/recommendationSort'

export type OverlayAugmentRarity = Settings['overlay']['augmentRarity']

export function toAugmentRarity(augment: AugmentRecommendation): OverlayAugmentRarity {
  if (augment.rarity === 'kPrismatic') return 'prismatic'
  if (augment.rarity === 'kGold') return 'gold'
  return 'silver'
}

export function groupAugmentsByRarity(augments: AugmentRecommendation[]) {
  const grouped: Record<OverlayAugmentRarity, AugmentRecommendation[]> = {
    prismatic: [],
    gold: [],
    silver: [],
  }
  for (const augment of augments) grouped[toAugmentRarity(augment)].push(augment)
  return grouped
}

export function selectActiveAugmentRarity(
  grouped: Record<OverlayAugmentRarity, AugmentRecommendation[]>,
  selected: OverlayAugmentRarity,
): OverlayAugmentRarity {
  if (grouped[selected].length) return selected
  if (grouped.prismatic.length) return 'prismatic'
  if (grouped.gold.length) return 'gold'
  return 'silver'
}

export function aramAugmentGrade(tier: number | null | undefined): string | null {
  if (typeof tier !== 'number' || !Number.isFinite(tier) || tier < 0) return null
  const map = ['S', 'A', 'B', 'C', 'D', 'F']
  return map[tier] ?? null
}

export function sortAugments(
  items: AugmentRecommendation[],
  mode: BuildResult['mode'],
  sortMode: BuildListSortMode,
) {
  const compositeComparator =
    mode === 'aram-mayhem' ? compareAramAugmentsByComposite : compareByWinRateThenPickRate
  return [...items].sort((a, b) => compareBySortMode(a, b, sortMode, compositeComparator))
}

export function resolveLateItems(build: BuildResult, sortMode: BuildListSortMode): ItemRecommendation[] {
  const ids = build.situationalItems ?? []
  if (!ids.length) return []

  const itemMap = new Map((build.items ?? []).map((item) => [String(item.itemId), item]))
  const seen = new Set<string>()

  const lateItems: ItemRecommendation[] = ids
    .map((id) => String(id))
    .filter((id) => {
      if (seen.has(id)) return false
      seen.add(id)
      return true
    })
    .map((id) => {
      const fromBuild = itemMap.get(id)
      if (fromBuild) return fromBuild
      return {
        itemId: id,
        tier: null,
        pickRate: null,
        winRate: null,
        games: null,
        name: undefined,
        description: undefined,
        iconUrl: `https://ddragon.leagueoflegends.com/cdn/${build.patch}/img/item/${id}.png`,
        averageIndex: null,
      }
    })

  return lateItems.sort((a, b) => compareItemsBySortMode(a, b, sortMode))
}

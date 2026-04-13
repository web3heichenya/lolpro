export type SortableItemStats = {
  winRate?: number | null
  pickRate?: number | null
  games?: number | null
}

const WILSON_Z = 1.64
const PICK_BONUS_WEIGHT = 0.08

export function scoreItemByWinRateAndPickRate(item: SortableItemStats): number {
  const pickRate = item.pickRate ?? 0
  const games = item.games ?? 0
  if (pickRate <= 0 || games <= 0) return Number.NEGATIVE_INFINITY

  const wr = Math.max(0, Math.min(1, item.winRate ?? 0))
  const n = Math.max(1, games)
  const z2 = WILSON_Z * WILSON_Z
  const denom = 1 + z2 / n
  const center = wr + z2 / (2 * n)
  const margin = WILSON_Z * Math.sqrt((wr * (1 - wr) + z2 / (4 * n)) / n)
  const wilsonLowerBound = (center - margin) / denom

  const normalizedPickRate = pickRate <= 1 ? pickRate * 100 : pickRate
  const pickBonus = PICK_BONUS_WEIGHT * Math.log1p(normalizedPickRate)
  return wilsonLowerBound + pickBonus
}

export function compareItemsByCompositeScore(a: SortableItemStats, b: SortableItemStats): number {
  const scoreDelta = scoreItemByWinRateAndPickRate(b) - scoreItemByWinRateAndPickRate(a)
  if (scoreDelta) return scoreDelta
  return (b.pickRate ?? -1) - (a.pickRate ?? -1) || (b.winRate ?? -1) - (a.winRate ?? -1)
}

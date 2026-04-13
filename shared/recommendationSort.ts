import { compareItemsByCompositeScore } from './itemSort'

export type BuildListSortMode = 'composite' | 'winRate' | 'pickRate'

export type WinPickSortable = {
  winRate?: number | null
  pickRate?: number | null
  games?: number | null
}

export type TierSortable = WinPickSortable & {
  tier?: number | null
}

export function compareByWinRateThenPickRate(a: WinPickSortable, b: WinPickSortable): number {
  return (b.winRate ?? -1) - (a.winRate ?? -1) || (b.pickRate ?? -1) - (a.pickRate ?? -1)
}

export function compareByPickRateThenWinRate(a: WinPickSortable, b: WinPickSortable): number {
  return (b.pickRate ?? -1) - (a.pickRate ?? -1) || (b.winRate ?? -1) - (a.winRate ?? -1)
}

export function compareAramAugmentsByComposite(a: TierSortable, b: TierSortable): number {
  return (a.tier ?? 999) - (b.tier ?? 999) || compareByPickRateThenWinRate(a, b)
}

export function compareBySortMode<T extends WinPickSortable>(
  a: T,
  b: T,
  sortMode: BuildListSortMode,
  compositeComparator: (left: T, right: T) => number = compareByWinRateThenPickRate,
): number {
  if (sortMode === 'winRate') return compareByWinRateThenPickRate(a, b)
  if (sortMode === 'pickRate') return compareByPickRateThenWinRate(a, b)
  return compositeComparator(a, b)
}

export function compareItemsBySortMode<T extends WinPickSortable>(
  a: T,
  b: T,
  sortMode: BuildListSortMode,
): number {
  return compareBySortMode(a, b, sortMode, compareItemsByCompositeScore)
}

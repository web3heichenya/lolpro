import type { BuildSummary } from '../../../../shared/contracts'
import { computeWinRate, toNum } from '../helpers'
import type { OpggChampionBuildResponse } from '../types'

export function resolveOpggBuildSummary(arena: OpggChampionBuildResponse): BuildSummary {
  const arenaData = arena.data || {}
  const averageStats = arenaData.summary?.average_stats

  const play = toNum(averageStats?.play)
  const win = toNum(averageStats?.win)
  const kills = toNum(averageStats?.kills)
  const assists = toNum(averageStats?.assists)
  const deaths = toNum(averageStats?.deaths)

  const kdaFromAverage = toNum(averageStats?.kda)
  const kdaFromKdaParts =
    kills != null && assists != null && deaths != null
      ? deaths > 0
        ? (kills + assists) / deaths
        : kills + assists
      : null

  return {
    winRate: toNum(averageStats?.win_rate) ?? computeWinRate(play, win),
    pickRate: toNum(averageStats?.pick_rate),
    banRate: toNum(averageStats?.ban_rate),
    kda: kdaFromAverage ?? kdaFromKdaParts,
    tier: toNum(averageStats?.tier_data?.tier) ?? toNum(averageStats?.tier),
    rank: toNum(averageStats?.tier_data?.rank) ?? toNum(averageStats?.rank),
    averagePlace: play != null && play > 0 ? (toNum(averageStats?.total_place) ?? 0) / play : null,
    firstRate: computeWinRate(play, toNum(averageStats?.first_place)),
  }
}

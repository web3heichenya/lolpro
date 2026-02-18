import type {
  AramMayhemBuildResult,
  ItemRecommendation,
  RiotLocale,
  StartingItemsRecommendation,
  SummonerSpellRecommendation,
} from '../../../../shared/contracts'
import {
  asArray,
  cdragonAugmentIconUrl,
  opggAugmentIconUrl,
  comboToItems,
  computeWinRate,
  raritySortWeight,
  toInt,
  toNum,
  toSkillId,
} from '../helpers'
import type { CDragonAugment, ItemMeta, OpggChampionBuildResponse, SummonerSpellMeta } from '../types'

type TransformInput = {
  championId: number
  arena: OpggChampionBuildResponse
  patch: string
  assetPatch: string
  dataSource?: string
  itemMetaMap: Record<string, ItemMeta>
  spellMetaMap: Record<number, SummonerSpellMeta>
  augmentMetaMap: Map<number, CDragonAugment>
  _lang?: RiotLocale
}

function resolveArenaSummary(arena: OpggChampionBuildResponse) {
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

export function transformOpggToAramMayhemBuild(input: TransformInput): AramMayhemBuildResult {
  const { championId, arena, patch, assetPatch, dataSource, itemMetaMap, spellMetaMap, augmentMetaMap } =
    input

  const arenaData = arena.data || {}
  const positionData = asArray(arenaData.positions).find(
    (position) => (position?.name || '').toLowerCase() === 'none',
  )
  const resolvedPosition = positionData || asArray(arenaData.positions)[0]

  const summary = resolveArenaSummary(arena)

  const summonerSpellsSource = asArray(resolvedPosition?.summoner_spells).length
    ? asArray(resolvedPosition?.summoner_spells)
    : asArray(arenaData.summoner_spells)
  const summonerSpells: SummonerSpellRecommendation[] = summonerSpellsSource
    .reduce<SummonerSpellRecommendation[]>((acc, row) => {
      const ids = asArray(row.ids)
        .map((id) => toInt(id))
        .filter((id): id is number => id != null)
      if (!ids.length) return acc
      const games = toNum(row.play)
      const wins = toNum(row.win)
      const pickRate = toNum(row.pick_rate)
      acc.push({
        summonerSpellIds: ids,
        games,
        pickRate,
        winRate: computeWinRate(games, wins),
        spells: ids.map((id) => ({
          id,
          name: spellMetaMap[id]?.name,
          iconUrl: spellMetaMap[id]?.iconUrl,
        })),
      })
      return acc
    }, [])
    .sort((a, b) => (b.pickRate ?? -1) - (a.pickRate ?? -1))
    .slice(0, 6)

  const skillOrders = (
    asArray(resolvedPosition?.skills).length ? asArray(resolvedPosition?.skills) : asArray(arenaData.skills)
  )
    .map((skill) => {
      const skillOrder = asArray(skill.order)
        .map((value) => toSkillId(value))
        .filter((value): value is number => value != null)
      if (!skillOrder.length) return null
      const games = toNum(skill.play)
      const wins = toNum(skill.win)
      return {
        skillOrder,
        games,
        pickRate: toNum(skill.pick_rate),
        winRate: computeWinRate(games, wins),
      }
    })
    .filter((row): row is NonNullable<typeof row> => !!row)
    .sort((a, b) => (b.pickRate ?? -1) - (a.pickRate ?? -1))
    .slice(0, 6)

  const skillMasteries = (
    asArray(resolvedPosition?.skill_masteries).length
      ? asArray(resolvedPosition?.skill_masteries)
      : asArray(arenaData.skill_masteries)
  )
    .map((mastery) => {
      const games = toNum(mastery.play)
      const wins = toNum(mastery.win)
      return {
        order: asArray(mastery.ids).map((token) => String(token)),
        pickRate: toNum(mastery.pick_rate),
        winRate: computeWinRate(games, wins),
      }
    })
    .filter((mastery) => mastery.order.length > 0)
    .sort((a, b) => (b.pickRate ?? -1) - (a.pickRate ?? -1))
    .slice(0, 6)

  const starterItems = (
    asArray(resolvedPosition?.starter_items).length
      ? asArray(resolvedPosition?.starter_items)
      : asArray(arenaData.starter_items)
  )
    .map((combo) => comboToItems(combo, itemMetaMap, assetPatch))
    .filter((combo): combo is StartingItemsRecommendation => !!combo)
    .sort((a, b) => (b.pickRate ?? -1) - (a.pickRate ?? -1))
    .slice(0, 8)

  const coreItems = (
    asArray(resolvedPosition?.core_items).length
      ? asArray(resolvedPosition?.core_items)
      : asArray(arenaData.core_items)
  )
    .map((combo) => comboToItems(combo, itemMetaMap, assetPatch))
    .filter((combo): combo is StartingItemsRecommendation => !!combo)
    .sort((a, b) => (b.pickRate ?? -1) - (a.pickRate ?? -1))
    .slice(0, 8)

  const bootsItems = (
    asArray(resolvedPosition?.boots).length ? asArray(resolvedPosition?.boots) : asArray(arenaData.boots)
  )
    .map((combo) => comboToItems(combo, itemMetaMap, assetPatch))
    .filter((combo): combo is StartingItemsRecommendation => !!combo)
    .sort((a, b) => (b.pickRate ?? -1) - (a.pickRate ?? -1))
    .slice(0, 8)

  const situationalItems = (
    asArray(resolvedPosition?.last_items).length
      ? asArray(resolvedPosition?.last_items)
      : asArray(arenaData.last_items)
  )
    .flatMap((combo) => asArray(combo.ids))
    .map((id) => toInt(id))
    .filter((id): id is number => id != null)
    .slice(0, 18)

  const flatItemMap = new Map<string, ItemRecommendation>()
  const pushFlatItem = (
    itemId: number,
    source?: StartingItemsRecommendation,
    sourceTier: number | null = null,
  ) => {
    const key = String(itemId)
    const existing = flatItemMap.get(key)
    const baseId = itemId >= 100_000 ? itemId % 10_000 : null
    const baseKey = baseId != null && baseId >= 1000 ? String(baseId) : null
    const directMeta = itemMetaMap[key]
    const baseMeta = baseKey ? itemMetaMap[baseKey] : undefined
    const meta = directMeta || baseMeta
    // If we resolved via base meta (e.g. 223115 -> 3115), use the base id for DDragon icon fallback.
    const iconId = directMeta
      ? itemId
      : baseMeta
        ? (baseId as number)
        : baseId != null && baseId >= 1000
          ? baseId
          : itemId
    const candidate: ItemRecommendation = {
      itemId: key,
      tier: sourceTier,
      pickRate: source?.pickRate ?? null,
      winRate: source?.winRate ?? null,
      games: source?.games ?? null,
      name: meta?.name,
      description: meta?.description,
      iconUrl:
        meta?.iconUrl || `https://ddragon.leagueoflegends.com/cdn/${assetPatch}/img/item/${iconId}.png`,
      averageIndex: null,
    }
    if (!existing) {
      flatItemMap.set(key, candidate)
      return
    }
    if ((candidate.pickRate ?? -1) > (existing.pickRate ?? -1)) {
      flatItemMap.set(key, candidate)
    }
  }

  starterItems.forEach((combo, idx) => combo.itemIds.forEach((id) => pushFlatItem(id, combo, idx + 1)))
  coreItems.forEach((combo, idx) => combo.itemIds.forEach((id) => pushFlatItem(id, combo, idx + 1)))
  bootsItems.forEach((combo, idx) => combo.itemIds.forEach((id) => pushFlatItem(id, combo, idx + 1)))
  situationalItems.forEach((id, idx) => pushFlatItem(id, undefined, 100 + idx))

  const items = Array.from(flatItemMap.values())
    .sort((a, b) => (a.tier ?? 999) - (b.tier ?? 999) || (b.pickRate ?? -1) - (a.pickRate ?? -1))
    .slice(0, 24)

  const augmentsById = new Map<string, AramMayhemBuildResult['augments'][number]>()
  for (const group of asArray(arenaData.augment_group)) {
    for (const augment of asArray(group.augments)) {
      const augmentId = toInt(augment.id)
      if (augmentId == null || augmentId <= 0) continue

      const meta = augmentMetaMap.get(augmentId)
      const games = toNum(augment.play)
      const wins = toNum(augment.win)
      const candidate = {
        augmentId: String(augmentId),
        tier: null,
        pickRate: toNum(augment.pick_rate),
        winRate: computeWinRate(games, wins),
        games,
        name: meta?.nameTRA || `增幅 #${augmentId}`,
        tooltip: undefined,
        iconUrl:
          opggAugmentIconUrl(meta?.augmentSmallIconPath) || cdragonAugmentIconUrl(meta?.augmentSmallIconPath),
        rarity: meta?.rarity,
      }

      const existing = augmentsById.get(candidate.augmentId)
      if (!existing || (candidate.pickRate ?? -1) > (existing.pickRate ?? -1)) {
        augmentsById.set(candidate.augmentId, candidate)
      }
    }
  }

  const augments = Array.from(augmentsById.values()).sort(
    (a, b) =>
      raritySortWeight(a.rarity) - raritySortWeight(b.rarity) || (b.pickRate ?? -1) - (a.pickRate ?? -1),
  )

  const countersRaw = asArray(resolvedPosition?.counters).length
    ? asArray(resolvedPosition?.counters)
    : asArray(arenaData.counters)
  const strongAgainst: Array<{ championId: string; winRate: number | null; pickRate: number | null }> = []
  const weakAgainst: Array<{ championId: string; winRate: number | null; pickRate: number | null }> = []
  for (const counter of countersRaw) {
    const champion = toInt(counter.champion_id)
    if (champion == null || champion <= 0) continue
    const winRate = computeWinRate(toNum(counter.play), toNum(counter.win))
    const entry = { championId: String(champion), winRate, pickRate: null }
    if ((winRate ?? 0) >= 0.5) strongAgainst.push(entry)
    else weakAgainst.push(entry)
  }
  strongAgainst.sort((a, b) => (b.winRate ?? -1) - (a.winRate ?? -1))
  weakAgainst.sort((a, b) => (a.winRate ?? 2) - (b.winRate ?? 2))

  const synergies = asArray(arenaData.synergies)
    .map((synergy) => {
      const champion = toInt(synergy.champion_id)
      if (champion == null || champion <= 0) return null
      const play = toNum(synergy.play)
      const win = toNum(synergy.win)
      const totalPlace = toNum(synergy.total_place)
      return {
        championId: String(champion),
        winRate: computeWinRate(play, win),
        pickRate: toNum(synergy.pick_rate),
        averagePlace: play != null && totalPlace != null && play > 0 ? totalPlace / play : null,
      }
    })
    .filter((row): row is NonNullable<typeof row> => !!row)
    .sort((a, b) => (b.pickRate ?? -1) - (a.pickRate ?? -1))
    .slice(0, 12)

  return {
    mode: 'aram-mayhem',
    championId: String(championId),
    patch,
    dt: new Date().toISOString(),
    dataSource: dataSource || 'unknown',
    position: (resolvedPosition?.name || 'arena').toLowerCase(),
    summary,
    augments,
    items,
    ...(summonerSpells.length ? { summonerSpells } : {}),
    ...(skillOrders.length ? { skillOrders } : {}),
    ...(skillMasteries.length ? { skillMasteries } : {}),
    ...(starterItems.length ? { startingItems: starterItems } : {}),
    ...(coreItems.length ? { coreItems } : {}),
    ...(bootsItems.length ? { bootsItems } : {}),
    ...(situationalItems.length ? { situationalItems } : {}),
    ...(strongAgainst.length || weakAgainst.length
      ? {
          counters: {
            strongAgainst: strongAgainst.slice(0, 10),
            weakAgainst: weakAgainst.slice(0, 10),
          },
        }
      : {}),
    ...(synergies.length ? { synergies } : {}),
  }
}

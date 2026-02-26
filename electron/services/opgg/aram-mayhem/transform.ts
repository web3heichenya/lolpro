import type {
  AramMayhemBuildResult,
  ItemRecommendation,
  RiotLocale,
  StartingItemsRecommendation,
} from '../../../../shared/contracts'
import { compareItemsByCompositeScore } from '../../../../shared/itemSort'
import {
  asArray,
  cdragonAugmentIconUrl,
  opggAugmentIconUrl,
  comboToItems,
  computeWinRate,
  raritySortWeight,
  toInt,
  toNum,
} from '../helpers'
import { resolveOpggBuildSummary } from './summary'
import { parseOpggRunes } from './runes'
import { parseSkillMasteries, parseSkillOrders, parseSummonerSpells } from './setup'
import type {
  CDragonAugment,
  ItemMeta,
  OpggChampionBuildResponse,
  PerkMeta,
  PerkStyleMeta,
  SummonerSpellMeta,
} from '../types'

type TransformInput = {
  championId: number
  arena: OpggChampionBuildResponse
  patch: string
  assetPatch: string
  dataSource?: string
  itemMetaMap: Record<string, ItemMeta>
  spellMetaMap: Record<number, SummonerSpellMeta>
  perkMetaMap?: Record<number, PerkMeta>
  perkStyleMetaMap?: Record<number, PerkStyleMeta>
  augmentMetaMap: Map<number, CDragonAugment>
  _lang?: RiotLocale
}

function compareByWinRateThenPickRate(
  a: { winRate?: number | null; pickRate?: number | null },
  b: { winRate?: number | null; pickRate?: number | null },
): number {
  return (b.winRate ?? -1) - (a.winRate ?? -1) || (b.pickRate ?? -1) - (a.pickRate ?? -1)
}
export function transformOpggToAramMayhemBuild(input: TransformInput): AramMayhemBuildResult {
  const {
    championId,
    arena,
    assetPatch,
    dataSource,
    itemMetaMap,
    spellMetaMap,
    perkMetaMap,
    perkStyleMetaMap,
    augmentMetaMap,
  } = input

  const arenaData = arena.data || {}
  const positionData = asArray(arenaData.positions).find(
    (position) => (position?.name || '').toLowerCase() === 'none',
  )
  const resolvedPosition = positionData || asArray(arenaData.positions)[0]

  const summary = resolveOpggBuildSummary(arena)

  const summonerSpells = parseSummonerSpells({
    resolvedPosition,
    arenaData: arenaData as Record<string, unknown>,
    spellMetaMap,
  })
  const skillOrders = parseSkillOrders({
    resolvedPosition,
    arenaData: arenaData as Record<string, unknown>,
  })
  const skillMasteries = parseSkillMasteries({
    resolvedPosition,
    arenaData: arenaData as Record<string, unknown>,
  })

  const runes = parseOpggRunes({
    resolvedPosition,
    arenaData: arenaData as Record<string, unknown>,
    perkMetaMap: perkMetaMap ?? {},
    perkStyleMetaMap: perkStyleMetaMap ?? {},
  })

  const starterItems = (
    asArray(resolvedPosition?.starter_items).length
      ? asArray(resolvedPosition?.starter_items)
      : asArray(arenaData.starter_items)
  )
    .map((combo) => comboToItems(combo, itemMetaMap, assetPatch))
    .filter((combo): combo is StartingItemsRecommendation => !!combo)
    .sort(compareItemsByCompositeScore)
    .slice(0, 8)

  const coreItems = (
    asArray(resolvedPosition?.core_items).length
      ? asArray(resolvedPosition?.core_items)
      : asArray(arenaData.core_items)
  )
    .map((combo) => comboToItems(combo, itemMetaMap, assetPatch))
    .filter((combo): combo is StartingItemsRecommendation => !!combo)
    .sort(compareItemsByCompositeScore)
    .slice(0, 8)

  const bootsItems = (
    asArray(resolvedPosition?.boots).length ? asArray(resolvedPosition?.boots) : asArray(arenaData.boots)
  )
    .map((combo) => comboToItems(combo, itemMetaMap, assetPatch))
    .filter((combo): combo is StartingItemsRecommendation => !!combo)
    .sort(compareItemsByCompositeScore)
    .slice(0, 8)

  const situationalItemRows = (
    asArray(resolvedPosition?.last_items).length
      ? asArray(resolvedPosition?.last_items)
      : asArray(arenaData.last_items)
  )
    .map((combo) => {
      const itemIds = asArray(combo.ids)
        .map((id) => toInt(id))
        .filter((id): id is number => id != null)
      if (!itemIds.length) return null
      const games = toNum(combo.play)
      const wins = toNum(combo.win)
      return {
        itemIds,
        games,
        pickRate: toNum(combo.pick_rate),
        winRate: computeWinRate(games, wins),
      }
    })
    .filter((row): row is NonNullable<typeof row> => !!row)
    .sort(compareItemsByCompositeScore)
    .slice(0, 18)

  const situationalItems = situationalItemRows.flatMap((row) => row.itemIds).slice(0, 18)

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
  situationalItemRows.forEach((combo, idx) => {
    const source: StartingItemsRecommendation = {
      itemIds: combo.itemIds,
      games: combo.games ?? null,
      pickRate: combo.pickRate ?? null,
      winRate: combo.winRate ?? null,
    }
    combo.itemIds.forEach((id) => pushFlatItem(id, source, 100 + idx))
  })

  const items = Array.from(flatItemMap.values()).sort(
    (a, b) => compareItemsByCompositeScore(a, b) || (a.tier ?? 999) - (b.tier ?? 999),
  )

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
    .sort(compareByWinRateThenPickRate)
    .slice(0, 12)

  return {
    mode: 'aram-mayhem',
    championId: String(championId),
    patch: assetPatch,
    dt: new Date().toISOString(),
    dataSource: dataSource || 'unknown',
    position: (resolvedPosition?.name || 'arena').toLowerCase(),
    summary,
    augments,
    items,
    ...(runes.length ? { runes } : {}),
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

import type { AramMayhemBuildResult, RiotLocale } from '../../../../shared/contracts'
import { OPGGAssetsService } from '../../opgg/assets'
import { cdragonAugmentIconUrl, computeWinRate, raritySortWeight, toInt, toNum } from '../../opgg/helpers'
import type { CDragonAugment, ItemMeta, SummonerSpellMeta } from '../../opgg/types'
import {
  asArray,
  asRecord,
  asString,
  parseBootCombos,
  parseItemIds,
  parseSituationalRows,
  parseSituationalItemIds,
  parseSkillMasteries,
  parseSkillOrders,
  parseSummonerSpells,
  toComboRecommendation,
  toItemRecommendation,
} from './parse'

export const BLITZ_ARAM_MAYHEM_SOURCE = 'blitz-datalake:aram-mayhem:v1'

type BlitzChampionStats = {
  num_games?: number
  num_win_games?: number
  pick_rate?: number
  win_rate?: number
  tier?: number
  augments?: Record<string, unknown>
  items?: Record<string, unknown>
}

type TransformParams = {
  championId: number
  lang?: RiotLocale
  statsRows: Record<string, unknown>[]
  buildRows: Record<string, unknown>[]
}

export async function transformBlitzAramMayhem(params: TransformParams): Promise<AramMayhemBuildResult> {
  const statsRow = params.statsRows[0]
  if (!statsRow) {
    throw new Error('Blitz datalake returned empty aram-mayhem champion stats payload.')
  }

  const statsDataRaw = asRecord(statsRow.data)
  const statsData: BlitzChampionStats = {
    num_games: toNum(statsDataRaw.num_games) ?? undefined,
    num_win_games: toNum(statsDataRaw.num_win_games) ?? undefined,
    pick_rate: toNum(statsDataRaw.pick_rate) ?? undefined,
    win_rate: toNum(statsDataRaw.win_rate) ?? undefined,
    tier: toNum(statsDataRaw.tier) ?? undefined,
    augments: asRecord(statsDataRaw.augments),
    items: asRecord(statsDataRaw.items),
  }

  const assets = new OPGGAssetsService()
  const rawPatch = asString(statsRow.patch) || 'latest'
  const patch = await assets.resolveDdragonPatch(rawPatch).catch(() => rawPatch)
  const [ddragonItemMetaMap, cdragonItemMetaMap, spellMetaMap, augmentMetaMap] = await Promise.all([
    assets.getItemMetaMap(patch, params.lang).catch(() => ({}) as Record<string, ItemMeta>),
    assets.getCdragonItemMetaMap(params.lang).catch(() => ({}) as Record<string, ItemMeta>),
    assets.getSummonerSpellMetaMap(patch, params.lang).catch(() => ({}) as Record<number, SummonerSpellMeta>),
    assets.getAugmentMetaMap(params.lang).catch(() => new Map<number, CDragonAugment>()),
  ])
  const itemMetaMap: Record<string, ItemMeta> = { ...cdragonItemMetaMap, ...ddragonItemMetaMap }

  const selectedBuild = params.buildRows
    .map((row) => asRecord(row))
    .sort((a, b) => (toNum(b.pick_rate) ?? -1) - (toNum(a.pick_rate) ?? -1))[0]

  const startingItems = asArray(selectedBuild?.startingItems)
    .map((entry) => asRecord(entry))
    .map((record) =>
      toComboRecommendation({
        itemIds: parseItemIds(record.itemIds),
        patch,
        itemMetaMap,
        games: toNum(record.games),
        wins: toNum(record.wins),
        pickRate: toNum(record.pick_rate),
      }),
    )
    .filter((row): row is NonNullable<typeof row> => !!row)
    .sort((a, b) => (b.pickRate ?? -1) - (a.pickRate ?? -1))
    .slice(0, 8)

  const coreItems = asArray(selectedBuild?.coreItems)
    .map((entry) => asRecord(entry))
    .map((record) =>
      toComboRecommendation({
        itemIds: parseItemIds(record.itemIds),
        patch,
        itemMetaMap,
        games: toNum(record.games),
        wins: toNum(record.wins),
        pickRate: toNum(record.pick_rate),
      }),
    )
    .filter((row): row is NonNullable<typeof row> => !!row)
    .sort((a, b) => (b.pickRate ?? -1) - (a.pickRate ?? -1))
    .slice(0, 8)

  const situationalRows = parseSituationalRows(selectedBuild?.situationalItems)
  const bootsItems = parseBootCombos({
    value: situationalRows,
    patch,
    itemMetaMap,
  })
  const situationalItems = parseSituationalItemIds(situationalRows, {
    excludeBoots: true,
    limit: 18,
  })

  const items = Object.entries(statsData.items ?? {})
    .map(([itemId, value]) => {
      const numericId = toInt(itemId)
      if (numericId == null || numericId <= 0) return null
      const row = asRecord(value)
      return toItemRecommendation({
        itemId: numericId,
        patch,
        itemMetaMap,
        tier: toNum(row.tier),
        pickRate: toNum(row.pick_rate),
        winRate: toNum(row.win_rate),
        games: toNum(row.num_games),
      })
    })
    .filter((row): row is NonNullable<typeof row> => !!row)
    .sort((a, b) => (a.tier ?? 999) - (b.tier ?? 999) || (b.pickRate ?? -1) - (a.pickRate ?? -1))
    .slice(0, 36)

  // Ensure situational-only entries also carry PR/WR in UI even when absent from summary item map.
  const itemById = new Map(items.map((item) => [item.itemId, item]))
  for (const row of situationalRows) {
    const key = String(row.itemId)
    if (itemById.has(key)) continue
    itemById.set(
      key,
      toItemRecommendation({
        itemId: row.itemId,
        patch,
        itemMetaMap,
        tier: null,
        pickRate: row.pickRate,
        winRate: computeWinRate(row.games, row.wins),
        games: row.games,
      }),
    )
  }
  const mergedItems = Array.from(itemById.values()).sort(
    (a, b) => (a.tier ?? 999) - (b.tier ?? 999) || (b.pickRate ?? -1) - (a.pickRate ?? -1),
  )

  const augments = Object.entries(statsData.augments ?? {})
    .map(([augmentId, value]) => {
      const numericId = toInt(augmentId)
      if (numericId == null || numericId <= 0) return null

      const row = asRecord(value)
      const games = toNum(row.num_games)
      const wins = toNum(row.num_win_games)
      const meta = augmentMetaMap.get(numericId)
      return {
        augmentId: String(numericId),
        tier: toNum(row.tier),
        pickRate: toNum(row.pick_rate),
        winRate: toNum(row.win_rate) ?? computeWinRate(games, wins),
        games,
        name: meta?.nameTRA || `Augment #${numericId}`,
        tooltip: undefined,
        iconUrl: cdragonAugmentIconUrl(meta?.augmentSmallIconPath),
        rarity: meta?.rarity,
      }
    })
    .filter((row): row is NonNullable<typeof row> => !!row)
    .sort(
      (a, b) =>
        raritySortWeight(a.rarity) - raritySortWeight(b.rarity) || (b.pickRate ?? -1) - (a.pickRate ?? -1),
    )

  const summonerSpells = parseSummonerSpells(selectedBuild?.summonerSpells, spellMetaMap)
  const skillOrders = parseSkillOrders(selectedBuild?.skillOrders)
  const skillMasteries = parseSkillMasteries(skillOrders)

  return {
    mode: 'aram-mayhem',
    championId: String(params.championId),
    patch,
    dt: new Date().toISOString(),
    dataSource: BLITZ_ARAM_MAYHEM_SOURCE,
    position: asString(selectedBuild?.individual_position)?.toLowerCase() || undefined,
    summary: {
      winRate:
        statsData.win_rate ?? computeWinRate(statsData.num_games ?? null, statsData.num_win_games ?? null),
      pickRate: statsData.pick_rate ?? null,
      banRate: null,
      kda: null,
      tier: statsData.tier ?? null,
      rank: null,
      averagePlace: null,
      firstRate: null,
    },
    augments,
    items: mergedItems,
    ...(summonerSpells.length ? { summonerSpells } : {}),
    ...(skillOrders.length ? { skillOrders } : {}),
    ...(skillMasteries.length ? { skillMasteries } : {}),
    ...(startingItems.length ? { startingItems } : {}),
    ...(coreItems.length ? { coreItems } : {}),
    ...(bootsItems.length ? { bootsItems } : {}),
    ...(situationalItems.length ? { situationalItems } : {}),
  }
}

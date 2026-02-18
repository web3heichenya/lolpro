import type { ArenaBuildResult, RiotLocale } from '../../../../shared/contracts'
import type { CDragonAugment, ItemMeta, OpggChampionBuildResponse, SummonerSpellMeta } from '../types'
import { asArray, comboToItems, computeWinRate, toInt, toNum } from '../helpers'
import { transformOpggToAramMayhemBuild } from '../aram-mayhem/transform'

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

function resolveArenaItemMeta(itemId: number, itemMetaMap: Record<string, ItemMeta>) {
  const key = String(itemId)
  const directMeta = itemMetaMap[key]
  if (directMeta) return { meta: directMeta, iconId: itemId }

  // Some arena item ids are extended ids (e.g. 223115) whose base item id is the last 4 digits (3115).
  const baseId = itemId >= 100_000 ? itemId % 10_000 : null
  if (baseId != null && baseId >= 1000) {
    const baseMeta = itemMetaMap[String(baseId)]
    if (baseMeta) return { meta: baseMeta, iconId: baseId }
    return { meta: undefined, iconId: baseId }
  }

  return { meta: undefined, iconId: itemId }
}

// OPGG "arena" champion endpoint schema matches what we already parse for aram-mayhem builds
// (we previously used the arena endpoint for that mode). Keep a thin wrapper so we can diverge later.
export function transformOpggToArenaBuild(input: TransformInput): ArenaBuildResult {
  const base = transformOpggToAramMayhemBuild(input)

  const arenaData = input.arena.data || {}
  const startingItems = asArray(arenaData.starter_items)
    .map((combo) => comboToItems(combo, input.itemMetaMap, input.assetPatch))
    .filter((combo): combo is NonNullable<typeof combo> => !!combo)
    .sort((a, b) => (b.pickRate ?? -1) - (a.pickRate ?? -1))

  const coreItems = asArray(arenaData.core_items)
    .map((combo) => comboToItems(combo, input.itemMetaMap, input.assetPatch))
    .filter((combo): combo is NonNullable<typeof combo> => !!combo)
    .sort((a, b) => (b.pickRate ?? -1) - (a.pickRate ?? -1))

  const bootsItems = asArray(arenaData.boots)
    .map((combo) => comboToItems(combo, input.itemMetaMap, input.assetPatch))
    .filter((combo): combo is NonNullable<typeof combo> => !!combo)
    .sort((a, b) => (b.pickRate ?? -1) - (a.pickRate ?? -1))

  const situationalItems = asArray(arenaData.last_items).flatMap((combo) => {
    const pickRate = toNum(combo.pick_rate)
    const games = toNum(combo.play)
    const winRate =
      toNum((combo as { win_rate?: number }).win_rate) ?? computeWinRate(games, toNum(combo.win))
    return asArray(combo.ids)
      .map((id) => toInt(id))
      .filter((id): id is number => id != null)
      .map((id) => ({
        id,
        pickRate,
        winRate,
        games,
      }))
  })

  const prismaticItems = asArray(arenaData.prism_items)
    .map((combo) => comboToItems(combo, input.itemMetaMap, input.assetPatch))
    .filter((combo): combo is NonNullable<typeof combo> => !!combo)
    .sort((a, b) => (b.pickRate ?? -1) - (a.pickRate ?? -1))

  // Include prismatic + other item groups in the flat `items` list so overlay + generic item UIs see them too.
  const flat = new Map<string, (typeof base.items)[number]>()
  for (const item of base.items) flat.set(String(item.itemId), item)

  const upsertFlatItem = (params: {
    itemId: number
    tier: number | null
    pickRate: number | null
    winRate: number | null
    games: number | null
  }) => {
    const key = String(params.itemId)
    const { meta, iconId } = resolveArenaItemMeta(params.itemId, input.itemMetaMap)
    const existing = flat.get(key)
    const candidate = {
      itemId: key,
      tier: params.tier,
      pickRate: params.pickRate,
      winRate: params.winRate,
      games: params.games,
      name: meta?.name,
      description: meta?.description,
      iconUrl:
        meta?.iconUrl || `https://ddragon.leagueoflegends.com/cdn/${input.assetPatch}/img/item/${iconId}.png`,
      averageIndex: null,
    }

    if (!existing) {
      flat.set(key, candidate)
      return
    }

    // Keep the entry with the higher pick-rate; preserve the best tier (lowest number) across sources.
    const next = (candidate.pickRate ?? -1) > (existing.pickRate ?? -1) ? candidate : existing
    const mergedTier =
      existing.tier == null
        ? candidate.tier
        : candidate.tier == null
          ? existing.tier
          : Math.min(existing.tier, candidate.tier)
    flat.set(key, { ...next, tier: mergedTier })
  }

  startingItems.forEach((combo, idx) => {
    for (const id of combo.itemIds) {
      upsertFlatItem({
        itemId: id,
        tier: idx + 1,
        pickRate: combo.pickRate ?? null,
        winRate: combo.winRate ?? null,
        games: combo.games ?? null,
      })
    }
  })
  coreItems.forEach((combo, idx) => {
    for (const id of combo.itemIds) {
      upsertFlatItem({
        itemId: id,
        tier: idx + 1,
        pickRate: combo.pickRate ?? null,
        winRate: combo.winRate ?? null,
        games: combo.games ?? null,
      })
    }
  })
  bootsItems.forEach((combo, idx) => {
    for (const id of combo.itemIds) {
      upsertFlatItem({
        itemId: id,
        tier: idx + 1,
        pickRate: combo.pickRate ?? null,
        winRate: combo.winRate ?? null,
        games: combo.games ?? null,
      })
    }
  })
  prismaticItems.forEach((combo) => {
    for (const id of combo.itemIds) {
      upsertFlatItem({
        itemId: id,
        tier: 0,
        pickRate: combo.pickRate ?? null,
        winRate: combo.winRate ?? null,
        games: combo.games ?? null,
      })
    }
  })
  situationalItems.forEach((item, idx) => {
    upsertFlatItem({
      itemId: item.id,
      tier: 100 + idx,
      pickRate: item.pickRate ?? null,
      winRate: item.winRate ?? null,
      games: item.games ?? null,
    })
  })

  const items = Array.from(flat.values()).sort(
    (a, b) => (a.tier ?? 999) - (b.tier ?? 999) || (b.pickRate ?? -1) - (a.pickRate ?? -1),
  )

  return {
    ...base,
    mode: 'arena',
    ...(prismaticItems.length ? { prismaticItems } : {}),
    ...(startingItems.length ? { startingItems } : {}),
    ...(coreItems.length ? { coreItems } : {}),
    ...(bootsItems.length ? { bootsItems } : {}),
    ...(situationalItems.length ? { situationalItems: situationalItems.map((item) => item.id) } : {}),
    items,
  }
}

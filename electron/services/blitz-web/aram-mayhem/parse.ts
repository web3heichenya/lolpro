import type {
  ItemRecommendation,
  SkillOrderRecommendation,
  StartingItemsRecommendation,
  SummonerSpellRecommendation,
} from '../../../../shared/contracts'
import { computeWinRate, toInt, toNum } from '../../opgg/helpers'
import type { ItemMeta, SummonerSpellMeta } from '../../opgg/types'

const BOOT_ITEM_IDS = new Set([1001, 2422, 3006, 3009, 3020, 3047, 3111, 3117, 3158])

export type SituationalItemStat = {
  itemId: number
  games: number | null
  wins: number | null
  pickRate: number | null
  averageIndex: number | null
}

function toSituationalRow(value: unknown): SituationalItemStat | null {
  const record = asRecord(value)
  const itemId = toInt(record.itemId ?? record.item_id)
  if (itemId == null || !Number.isFinite(itemId) || itemId <= 0) return null

  return {
    itemId,
    games: toNum(record.games),
    wins: toNum(record.wins),
    pickRate: toNum(record.pickRate ?? record.pick_rate),
    averageIndex: toNum(record.averageIndex ?? record.average_index),
  }
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

export function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

export function parseItemIds(value: unknown): number[] {
  if (Array.isArray(value)) return value.map((id) => toInt(id)).filter((id): id is number => id != null)
  if (typeof value !== 'string') return []
  return value
    .split(',')
    .map((token) => toInt(token))
    .filter((id): id is number => id != null)
}

export function resolveItemMeta(
  itemId: number,
  itemMeta: Record<string, ItemMeta>,
): { meta?: ItemMeta; iconId: number } {
  const direct = itemMeta[String(itemId)]
  if (direct) return { meta: direct, iconId: itemId }

  if (itemId >= 100_000) {
    const baseId = itemId % 10_000
    if (baseId >= 1000) {
      const base = itemMeta[String(baseId)]
      return { meta: base, iconId: baseId }
    }
  }

  return { meta: undefined, iconId: itemId }
}

export function toItemRecommendation(params: {
  itemId: number
  patch: string
  itemMetaMap: Record<string, ItemMeta>
  tier?: number | null
  pickRate?: number | null
  winRate?: number | null
  games?: number | null
}): ItemRecommendation {
  const { meta, iconId } = resolveItemMeta(params.itemId, params.itemMetaMap)
  return {
    itemId: String(params.itemId),
    tier: params.tier ?? null,
    pickRate: params.pickRate ?? null,
    winRate: params.winRate ?? null,
    games: params.games ?? null,
    name: meta?.name,
    description: meta?.description,
    iconUrl:
      meta?.iconUrl || `https://ddragon.leagueoflegends.com/cdn/${params.patch}/img/item/${iconId}.png`,
    averageIndex: null,
  }
}

export function toComboRecommendation(params: {
  itemIds: number[]
  patch: string
  itemMetaMap: Record<string, ItemMeta>
  games?: number | null
  wins?: number | null
  pickRate?: number | null
}): StartingItemsRecommendation | null {
  if (!params.itemIds.length) return null

  return {
    itemIds: params.itemIds,
    games: params.games ?? null,
    pickRate: params.pickRate ?? null,
    winRate: computeWinRate(params.games ?? null, params.wins ?? null),
    items: params.itemIds.map((itemId) => {
      const { meta, iconId } = resolveItemMeta(itemId, params.itemMetaMap)
      return {
        id: itemId,
        name: meta?.name,
        iconUrl:
          meta?.iconUrl || `https://ddragon.leagueoflegends.com/cdn/${params.patch}/img/item/${iconId}.png`,
      }
    }),
  }
}

export function parseSummonerSpells(
  value: unknown,
  spellMetaMap: Record<number, SummonerSpellMeta>,
): SummonerSpellRecommendation[] {
  const rows: SummonerSpellRecommendation[] = []

  for (const entry of asArray(value)) {
    const record = asRecord(entry)
    const spellIds = parseItemIds(record.summonerSpellIds ?? record.summoner_spell_ids)
    if (!spellIds.length) continue

    const games = toNum(record.games)
    const wins = toNum(record.wins)
    rows.push({
      summonerSpellIds: spellIds,
      games,
      pickRate: toNum(record.pick_rate ?? record.pickRate),
      winRate: computeWinRate(games, wins),
      spells: spellIds.map((id) => ({
        id,
        name: spellMetaMap[id]?.name,
        iconUrl: spellMetaMap[id]?.iconUrl,
      })),
    })
  }

  return rows.sort((a, b) => (b.pickRate ?? -1) - (a.pickRate ?? -1)).slice(0, 6)
}

export function parseSkillOrders(value: unknown): SkillOrderRecommendation[] {
  const rows: SkillOrderRecommendation[] = []

  for (const entry of asArray(value)) {
    const record = asRecord(entry)
    const skillOrder = parseItemIds(record.skillOrder)
    if (!skillOrder.length) continue

    const games = toNum(record.games)
    const wins = toNum(record.wins)
    rows.push({
      skillOrder,
      games,
      pickRate: toNum(record.pick_rate),
      winRate: computeWinRate(games, wins),
    })
  }

  return rows.sort((a, b) => (b.pickRate ?? -1) - (a.pickRate ?? -1)).slice(0, 6)
}

export function parseSkillMasteries(skillOrders: SkillOrderRecommendation[]) {
  return skillOrders.slice(0, 3).map((order) => ({
    order: order.skillOrder.slice(0, 4).map((id) => {
      if (id === 1) return 'Q'
      if (id === 2) return 'W'
      if (id === 3) return 'E'
      if (id === 4) return 'R'
      return String(id)
    }),
    pickRate: order.pickRate,
    winRate: order.winRate,
  }))
}

export function parseSituationalRows(value: unknown): SituationalItemStat[] {
  return asArray(value)
    .map((entry) => toSituationalRow(entry))
    .filter((row): row is SituationalItemStat => !!row)
    .sort((a, b) => (b.pickRate ?? -1) - (a.pickRate ?? -1))
}

export function parseSituationalItemIds(
  value: unknown,
  opts: { excludeBoots?: boolean; limit?: number } = {},
): number[] {
  const excludeBoots = opts.excludeBoots ?? true
  const limit = opts.limit ?? 18

  const rows = parseSituationalRows(value).filter((row) => !excludeBoots || !BOOT_ITEM_IDS.has(row.itemId))
  return rows.slice(0, Math.max(1, limit)).map((row) => row.itemId)
}

export function parseBootCombos(params: {
  value: unknown
  patch: string
  itemMetaMap: Record<string, ItemMeta>
}): StartingItemsRecommendation[] {
  const rows = parseSituationalRows(params.value)
    .filter((row) => BOOT_ITEM_IDS.has(row.itemId))
    .sort((a, b) => (b.pickRate ?? -1) - (a.pickRate ?? -1))
    .slice(0, 8)

  return rows
    .map((row) =>
      toComboRecommendation({
        itemIds: [row.itemId],
        patch: params.patch,
        itemMetaMap: params.itemMetaMap,
        games: row.games,
        wins: row.wins,
        pickRate: row.pickRate,
      }),
    )
    .filter((row): row is StartingItemsRecommendation => !!row)
}

import type { ItemRecommendation, StartingItemsRecommendation } from '../../../../shared/contracts'

import { extractAllJsonObjectsFromChunk, extractNextFlightChunksFromHtml } from '../nextFlight'

type RawMetaItem = {
  id: number
  name?: string
  image_url?: string
  is_mystic?: boolean
}

type RawStarterItemTuple = [RawMetaItem, number]

type RawItemRow = {
  ids: number[]
  pick_rate?: number
  win_rate?: number
  play?: string
  metaItem?: RawMetaItem
  metaStarterItems?: RawStarterItemTuple[]
  metaBuildItems?: RawMetaItem[]
}

type RawItemsSection = {
  data?: RawItemRow[]
  mode?: string
}

function parseIntFromCompactNumberString(s?: string): number | null {
  if (!s) return null
  const n = Number(s.replace(/,/g, '').trim())
  return Number.isFinite(n) ? n : null
}

function extractSectionTitle(chunk: string): string | null {
  // Section title is usually `"children":"xxx"` in a header cell/div.
  const m = chunk.match(/"children":"([^"]{1,20})"/)
  return m?.[1] ?? null
}

function matchesTitle(title: string | null, candidates: string[]) {
  if (!title) return false
  return candidates.some((c) => title.trim() === c)
}

function mapItemRowsToItemRecommendations(rows: RawItemRow[]): ItemRecommendation[] {
  return rows
    .filter((r) => Array.isArray(r.ids) && r.ids.length && r.metaItem?.id != null)
    .map((r) => {
      const id = r.metaItem?.id ?? r.ids[0]
      const games = parseIntFromCompactNumberString(r.play)
      return {
        itemId: String(id),
        tier: null,
        // Items page `pick_rate`/`win_rate` look like percentages (e.g. 88.76).
        pickRate: typeof r.pick_rate === 'number' ? r.pick_rate / 100 : null,
        winRate: typeof r.win_rate === 'number' ? r.win_rate / 100 : null,
        games,
        name: r.metaItem?.name,
        description: undefined,
        iconUrl: r.metaItem?.image_url,
        averageIndex: null,
      }
    })
}

function mapSingleItemRowsToCombos(rows: RawItemRow[]): StartingItemsRecommendation[] {
  return rows
    .filter((r) => Array.isArray(r.ids) && r.ids.length && r.metaItem?.id != null)
    .map((r) => {
      const id = r.metaItem?.id ?? r.ids[0]
      const games = parseIntFromCompactNumberString(r.play)
      return {
        itemIds: r.ids,
        games,
        pickRate: typeof r.pick_rate === 'number' ? r.pick_rate / 100 : null,
        winRate: typeof r.win_rate === 'number' ? r.win_rate / 100 : null,
        items: [
          {
            id,
            name: r.metaItem?.name,
            iconUrl: r.metaItem?.image_url,
          },
        ],
      }
    })
}

function mapStartingItemsRows(rows: RawItemRow[]): StartingItemsRecommendation[] {
  return rows
    .filter(
      (r) =>
        Array.isArray(r.ids) &&
        r.ids.length &&
        Array.isArray(r.metaStarterItems) &&
        r.metaStarterItems.length,
    )
    .map((r) => {
      const games = parseIntFromCompactNumberString(r.play)
      const items: Array<{ id: number; name?: string; iconUrl?: string }> = []

      for (const tuple of r.metaStarterItems ?? []) {
        const meta = tuple?.[0]
        const count = tuple?.[1] ?? 1
        if (!meta?.id) continue
        const n = Math.max(1, Math.round(count))
        for (let i = 0; i < n; i++) {
          items.push({ id: meta.id, name: meta.name, iconUrl: meta.image_url })
        }
      }

      return {
        itemIds: r.ids,
        games,
        pickRate: typeof r.pick_rate === 'number' ? r.pick_rate / 100 : null,
        winRate: typeof r.win_rate === 'number' ? r.win_rate / 100 : null,
        items,
      }
    })
}

function mapBuildItemRowsToCombos(rows: RawItemRow[]): StartingItemsRecommendation[] {
  return rows
    .filter(
      (r) =>
        Array.isArray(r.ids) && r.ids.length && Array.isArray(r.metaBuildItems) && r.metaBuildItems.length,
    )
    .map((r) => {
      const games = parseIntFromCompactNumberString(r.play)
      const itemIds = r.ids.filter((id): id is number => typeof id === 'number' && Number.isFinite(id))
      const byId = new Map((r.metaBuildItems ?? []).map((item) => [item.id, item]))
      const items = itemIds.map((id) => {
        const meta = byId.get(id)
        return {
          id,
          name: meta?.name,
          iconUrl: meta?.image_url,
        }
      })

      return {
        itemIds,
        games,
        pickRate: typeof r.pick_rate === 'number' ? r.pick_rate / 100 : null,
        winRate: typeof r.win_rate === 'number' ? r.win_rate / 100 : null,
        items,
      }
    })
}

export function parseAramMayhemItems(html: string): {
  items: ItemRecommendation[]
  coreItems: StartingItemsRecommendation[]
  bootsItems: StartingItemsRecommendation[]
  startingItems: StartingItemsRecommendation[]
} {
  const flight = extractNextFlightChunksFromHtml(html)

  // Items page contains multiple `{"data":[...],"mode":"aram_mayhem"}` objects.
  // Infer section type from title label (locale-dependent) OR content shape.
  const sections: Array<{ title: string | null; payload: RawItemsSection }> = []

  for (const c of flight) {
    if (!c.raw.includes('"mode":"aram_mayhem"')) continue
    const payloads = extractAllJsonObjectsFromChunk(c.raw, '{"data":[')
    for (const p of payloads) {
      if (!p || typeof p !== 'object') continue
      const obj = p as RawItemsSection
      if (!Array.isArray(obj.data) || !obj.data.length) continue
      if (obj.mode !== 'aram_mayhem') continue

      const title = extractSectionTitle(c.raw)
      sections.push({ title, payload: obj })
    }
  }

  let starting: StartingItemsRecommendation[] = []
  let core: StartingItemsRecommendation[] = []
  let boots: StartingItemsRecommendation[] = []
  let itemList: ItemRecommendation[] = []

  for (const s of sections) {
    const rows = s.payload.data ?? []
    if (!rows.length) continue

    const looksLikeCore = rows.some((r) => Array.isArray(r.metaBuildItems) && r.metaBuildItems.length > 0)
    const looksLikeStarting = rows.some((r) => Array.isArray(r.metaStarterItems) && r.metaStarterItems.length)
    const looksLikeSingleItemRows = rows.every(
      (r) => Array.isArray(r.ids) && r.ids.length === 1 && r.metaItem,
    )

    if (looksLikeCore || matchesTitle(s.title, ['核心装备', 'Core Items'])) {
      core = mapBuildItemRowsToCombos(rows)
      continue
    }

    if (looksLikeStarting || matchesTitle(s.title, ['起始装备', 'Starter Items', 'Starting Items'])) {
      starting = mapStartingItemsRows(rows)
      continue
    }

    if (
      matchesTitle(s.title, ['鞋子', 'Boots']) ||
      (looksLikeSingleItemRows && rows.length <= 10 && !boots.length)
    ) {
      boots = mapSingleItemRowsToCombos(rows)
      continue
    }

    if (matchesTitle(s.title, ['装备', 'Items']) || looksLikeSingleItemRows) {
      itemList = mapItemRowsToItemRecommendations(rows)
      continue
    }

    if (!itemList.length) itemList = mapItemRowsToItemRecommendations(rows)
  }

  return { items: itemList, coreItems: core, bootsItems: boots, startingItems: starting }
}

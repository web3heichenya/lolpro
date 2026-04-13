import type { AramMayhemBuildResult, RiotLocale } from '../../../../shared/contracts'
import type { GameModeId } from '../../../../shared/contracts'
import { DATA_SOURCES } from '../../../../shared/cacheKeys'

import { normalizeChampionKey } from '../../../state/gameContextLogic'
import { extractAllJsonObjectsFromChunk, extractNextFlightChunksFromHtml } from '../nextFlight'
import { fetchHtml, isLikelyChallengePage, opggUrl, toOpggWebLocale } from './fetch'

type TierRow = {
  key?: string
  champion_id?: number
  id?: number
  tier?: number
  rank?: number
}

type CachedTierMap = {
  expiresAt: number
  locale: string
  map: Map<string, { tier: number | null; rank: number | null }>
}

let cached: CachedTierMap | null = null

type PersistentCache = {
  readModeTierList: <T>(params: {
    mode: GameModeId
    lang?: RiotLocale
    sourceKey: string
    maxAgeMs?: number
  }) => Promise<T | null>
  writeModeTierList: <T>(params: {
    mode: GameModeId
    lang?: RiotLocale
    sourceKey: string
    dataSource: string
    data: T
  }) => Promise<void>
}

type PersistedTierList = {
  // Array<[championKey, tier, rank]>
  entries: Array<[string, number | null, number | null]>
}

function isFiniteNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

export async function getAramMayhemTierSummary(params: {
  championKey: string
  lang?: RiotLocale
  timeoutMs?: number
  cache?: PersistentCache
}): Promise<AramMayhemBuildResult['summary']> {
  const key = normalizeChampionKey(params.championKey)
  const map = await getAramMayhemTierMap({
    lang: params.lang,
    timeoutMs: params.timeoutMs,
    cache: params.cache,
  })
  const row = map.get(key)

  return {
    winRate: null,
    pickRate: null,
    banRate: null,
    kda: null,
    tier: row?.tier ?? null,
    rank: row?.rank ?? null,
    averagePlace: null,
    firstRate: null,
  }
}

async function getAramMayhemTierMap(params: {
  lang?: RiotLocale
  timeoutMs?: number
  cache?: PersistentCache
}): Promise<Map<string, { tier: number | null; rank: number | null }>> {
  const locale = toOpggWebLocale(params.lang)
  const now = Date.now()
  const ttlMs = 10 * 60 * 1000
  const mode: GameModeId = 'aram-mayhem'
  const sourceKey = DATA_SOURCES.aramMayhemTierListOpggWebV1
  const dataSource = DATA_SOURCES.aramMayhemTierListOpggWebV1

  if (cached && cached.locale === locale && now < cached.expiresAt) {
    return cached.map
  }

  const persisted = await params.cache
    ?.readModeTierList<PersistedTierList>({
      mode,
      lang: params.lang,
      sourceKey,
      maxAgeMs: ttlMs,
    })
    .catch(() => null)
  if (persisted?.entries?.length) {
    const map = new Map<string, { tier: number | null; rank: number | null }>()
    for (const [k, tier, rank] of persisted.entries) {
      map.set(normalizeChampionKey(k), { tier, rank })
    }
    cached = { expiresAt: now + ttlMs, locale, map }
    return map
  }

  const html = await fetchHtml(opggUrl(locale, 'lol/modes/aram-mayhem'), params.timeoutMs ?? 15_000)
  if (isLikelyChallengePage(html)) {
    throw new Error('OP.GG challenge page detected while loading tier list.')
  }
  const flight = extractNextFlightChunksFromHtml(html)

  const map = new Map<string, { tier: number | null; rank: number | null }>()
  for (const c of flight) {
    if (!c.raw.includes('"champion_id":') || !c.raw.includes('"tier":') || !c.raw.includes('"rank":'))
      continue

    const objs = extractAllJsonObjectsFromChunk(c.raw, '"champion_id":')
    for (const o of objs) {
      if (!o || typeof o !== 'object') continue
      const row = o as TierRow
      if (typeof row.key !== 'string' || !row.key) continue
      if (!isFiniteNum(row.tier) && !isFiniteNum(row.rank)) continue

      const k = normalizeChampionKey(row.key)
      if (!k) continue
      map.set(k, {
        tier: isFiniteNum(row.tier) ? row.tier : null,
        rank: isFiniteNum(row.rank) ? row.rank : null,
      })
    }
  }

  if (params.cache) {
    const entries: PersistedTierList['entries'] = []
    for (const [k, v] of map.entries()) {
      entries.push([k, v.tier, v.rank])
    }
    void params.cache
      .writeModeTierList({
        mode,
        lang: params.lang,
        sourceKey,
        dataSource,
        data: { entries },
      })
      .catch(() => {})
  }

  cached = { expiresAt: now + ttlMs, locale, map }
  return map
}

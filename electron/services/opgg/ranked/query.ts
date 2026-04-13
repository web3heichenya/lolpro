import type { RankedBuildResult, RiotLocale } from '../../../../shared/contracts'
import { buildSourceKeyForMode } from '../../../../shared/cacheKeys'
import {
  DEFAULT_OPGG_REGION,
  DEFAULT_OPGG_TIER,
  isOpggRegion,
  isOpggTier,
  type OpggRegion,
  type OpggTier,
} from '../../../../shared/opgg'
import { fetchJson } from '../../net/http'
import { toNum } from '../helpers'
import type { OPGGAssetsService } from '../assets'
import type {
  ItemMeta,
  OpggChampionBuildResponse,
  PerkMeta,
  PerkStyleMeta,
  SummonerSpellMeta,
} from '../types'
import { transformOpggToRankedBuild } from './transform'

const OPGG_BASE_URL = 'https://lol-api-champion.op.gg'

const RANKED_POSITION_MAP = {
  top: 'top',
  jungle: 'jungle',
  mid: 'mid',
  middle: 'mid',
  adc: 'adc',
  bot: 'adc',
  bottom: 'adc',
  support: 'support',
  utility: 'support',
} as const

type RankedPosition = 'top' | 'jungle' | 'mid' | 'adc' | 'support'

function buildOpggUrl(path: string): string {
  return `${OPGG_BASE_URL}${path}`
}

function normalizeRankedPosition(value: unknown): RankedPosition | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toLowerCase()
  return RANKED_POSITION_MAP[normalized as keyof typeof RANKED_POSITION_MAP] ?? null
}

function resolvePrimaryRankedPosition(payload: OpggChampionBuildResponse): RankedPosition | null {
  const summary = payload.data?.summary as
    | { positions?: Array<{ name?: unknown; stats?: unknown }> }
    | undefined
  const positions = Array.isArray(summary?.positions) ? summary.positions : []

  let best: { position: RankedPosition; play: number; pickRate: number } | null = null
  for (const row of positions) {
    const position = normalizeRankedPosition(row.name)
    if (!position) continue
    const stats = (row.stats as { play?: unknown; pick_rate?: unknown } | undefined) ?? undefined
    const play = toNum(stats?.play) ?? -1
    const pickRate = toNum(stats?.pick_rate) ?? -1
    if (
      !best ||
      play > best.play ||
      (play === best.play && pickRate > best.pickRate) ||
      (play === best.play && pickRate === best.pickRate && position === 'mid')
    ) {
      best = { position, play, pickRate }
    }
  }

  return best?.position ?? null
}

async function fetchRankedPayload(params: {
  championId: number
  position: RankedPosition
  region: OpggRegion
  tier: OpggTier
}): Promise<OpggChampionBuildResponse> {
  const rankedUrl = buildOpggUrl(
    `/api/${params.region}/champions/ranked/${params.championId}/${params.position}?tier=${encodeURIComponent(params.tier)}`,
  )
  return await fetchJson<OpggChampionBuildResponse>(rankedUrl, { timeoutMs: 20_000 })
}

export async function fetchOpggRankedBuild(params: {
  championId: string
  lang?: RiotLocale
  region?: OpggRegion
  tier?: OpggTier
  assets: OPGGAssetsService
}): Promise<RankedBuildResult> {
  const championId = Number(params.championId)
  if (!Number.isFinite(championId) || championId <= 0) {
    throw new Error(`Invalid champion id: ${params.championId}`)
  }

  const region = isOpggRegion(params.region) ? params.region : DEFAULT_OPGG_REGION
  const tier = isOpggTier(params.tier) ? params.tier : DEFAULT_OPGG_TIER

  const probePosition: RankedPosition = 'mid'
  const probePayload = await fetchRankedPayload({
    championId,
    position: probePosition,
    region,
    tier,
  })

  const preferredPosition = resolvePrimaryRankedPosition(probePayload) ?? probePosition
  const rankedPayload =
    preferredPosition === probePosition
      ? probePayload
      : await fetchRankedPayload({
          championId,
          position: preferredPosition,
          region,
          tier,
        })

  const patch = rankedPayload.meta?.version || 'latest'
  const ddragonPatch = await params.assets.resolveDdragonPatch(patch).catch(() => patch)
  const [ddragonItemMetaMap, cdragonItemMetaMap, spellMetaMap, perkMetaMap, perkStyleMetaMap] =
    await Promise.all([
      params.assets.getItemMetaMap(ddragonPatch, params.lang).catch(() => ({}) as Record<string, ItemMeta>),
      params.assets.getCdragonItemMetaMap(params.lang).catch(() => ({}) as Record<string, ItemMeta>),
      params.assets
        .getSummonerSpellMetaMap(ddragonPatch, params.lang)
        .catch(() => ({}) as Record<number, SummonerSpellMeta>),
      params.assets.getPerkMetaMap(params.lang).catch(() => ({}) as Record<number, PerkMeta>),
      params.assets.getPerkStyleMetaMap(params.lang).catch(() => ({}) as Record<number, PerkStyleMeta>),
    ])

  const itemMetaMap: Record<string, ItemMeta> = { ...cdragonItemMetaMap, ...ddragonItemMetaMap }
  const sourceKey = buildSourceKeyForMode('ranked', { region, tier })

  return transformOpggToRankedBuild({
    championId,
    ranked: rankedPayload,
    patch,
    assetPatch: ddragonPatch,
    dataSource: sourceKey,
    itemMetaMap,
    spellMetaMap,
    perkMetaMap,
    perkStyleMetaMap,
    position: preferredPosition,
    _lang: params.lang,
  })
}

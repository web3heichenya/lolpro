import type { AramBuildResult, RiotLocale } from '../../../../shared/contracts'
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
import type { OPGGAssetsService } from '../assets'
import { transformOpggToAramBuild } from './transform'
import type {
  ItemMeta,
  OpggChampionBuildResponse,
  PerkMeta,
  PerkStyleMeta,
  SummonerSpellMeta,
} from '../types'

const OPGG_BASE_URL = 'https://lol-api-champion.op.gg'

function buildOpggUrl(path: string): string {
  return `${OPGG_BASE_URL}${path}`
}

export async function fetchOpggAramBuild(params: {
  championId: string
  lang?: RiotLocale
  region?: OpggRegion
  tier?: OpggTier
  assets: OPGGAssetsService
}): Promise<AramBuildResult> {
  const championId = Number(params.championId)
  if (!Number.isFinite(championId) || championId <= 0) {
    throw new Error(`Invalid champion id: ${params.championId}`)
  }

  const region = isOpggRegion(params.region) ? params.region : DEFAULT_OPGG_REGION
  const tier = isOpggTier(params.tier) ? params.tier : DEFAULT_OPGG_TIER
  const aramUrl = buildOpggUrl(
    `/api/${region}/champions/aram/${championId}/none?tier=${encodeURIComponent(tier)}`,
  )

  const aram = await fetchJson<OpggChampionBuildResponse>(aramUrl, { timeoutMs: 20_000 })
  const patch = aram.meta?.version || 'latest'
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
  const sourceKey = buildSourceKeyForMode('aram', { region, tier })

  return transformOpggToAramBuild({
    championId,
    aram,
    patch,
    assetPatch: ddragonPatch,
    dataSource: sourceKey,
    itemMetaMap,
    spellMetaMap,
    perkMetaMap,
    perkStyleMetaMap,
    _lang: params.lang,
  })
}

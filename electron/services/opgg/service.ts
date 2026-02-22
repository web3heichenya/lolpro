import type {
  AramBuildResult,
  AramMayhemBuildResult,
  ArenaBuildResult,
  ChampionProfile,
  GameModeId,
  RiotLocale,
} from '../../../shared/contracts'
import { buildSourceKeyForMode } from '../../../shared/cacheKeys'
import {
  DEFAULT_OPGG_TIER,
  DEFAULT_OPGG_REGION,
  isOpggTier,
  isOpggRegion,
  toArenaTier,
  type OpggTier,
  type OpggRegion,
} from '../../../shared/opgg'
import { fetchJson } from '../net/http'
import { opggMetaLocale, stripMarkup, toNum } from './helpers'
import { transformOpggToArenaBuild } from './arena/transform'
import { transformOpggToAramBuild } from './aram/transform'
import { OPGGAssetsService } from './assets'
import { scrapeAramMayhemFromOpggWeb } from '../opgg-web/aram-mayhem/scrape'
import { normalizeChampionKey } from '../../state/gameContextLogic'
import type {
  CDragonAugment,
  CachedValue,
  OpggChampionMetaData,
  OpggChampionMetaResponse,
  OpggChampionBuildResponse,
  ItemMeta,
  SummonerSpellMeta,
} from './types'

const OPGG_BASE_URL = 'https://lol-api-champion.op.gg'

function buildOpggUrl(path: string): string {
  return `${OPGG_BASE_URL}${path}`
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function opggChampionMetaUrl(locale?: RiotLocale): string {
  const hl = opggMetaLocale(locale)
  return buildOpggUrl(`/api/meta/champions?hl=${encodeURIComponent(hl)}`)
}

export class OPGGService {
  constructor(
    private readonly appCache?: {
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
    },
  ) {}

  private assets = new OPGGAssetsService()
  private cache = new Map<string, CachedValue<unknown>>()

  private getCached<T>(key: string): T | null {
    const cached = this.cache.get(key)
    if (!cached) return null
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key)
      return null
    }
    return cached.value as T
  }

  private setCached<T>(key: string, value: T, ttlMs: number): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    })
  }

  private async getChampionMetaList(lang?: RiotLocale): Promise<OpggChampionMetaData[]> {
    const locale = opggMetaLocale(lang)
    const cacheKey = `opgg:champion-meta:${locale}`
    const cached = this.getCached<OpggChampionMetaData[]>(cacheKey)
    if (cached) return cached

    const response = await fetchJson<OpggChampionMetaResponse>(opggChampionMetaUrl(lang), {
      timeoutMs: 20_000,
    })
    const data = Array.isArray(response.data) ? response.data : []
    this.setCached(cacheKey, data, 60 * 60 * 1000)
    return data
  }

  private async resolveChampionKeyForAram(championId: number, lang?: RiotLocale): Promise<string | null> {
    const list = await this.getChampionMetaList(lang)
    const found = list.find((row) => Number(row.id) === championId)
    if (!found?.key) return null
    const normalized = normalizeChampionKey(found.key)
    return normalized || null
  }

  async getAramMayhemBuild(params: {
    championId: string
    championKey?: string
    lang?: RiotLocale
    region?: OpggRegion
    tier?: OpggTier
  }): Promise<AramMayhemBuildResult> {
    const championId = Number(params.championId)
    if (!Number.isFinite(championId) || championId <= 0) {
      throw new Error(`Invalid champion id: ${params.championId}`)
    }

    const championKey =
      normalizeChampionKey(params.championKey ?? '') ||
      (await this.resolveChampionKeyForAram(championId, params.lang))
    if (!championKey) throw new Error('Missing championKey for aram-mayhem web scraping')

    const patch = await this.assets.resolveDdragonPatch('latest').catch(() => 'latest')
    const scraped = await scrapeAramMayhemFromOpggWeb({
      championKey,
      lang: params.lang,
      patch,
      timeoutMs: 20_000,
      cache: this.appCache,
    })

    return {
      mode: 'aram-mayhem',
      championId: String(championId),
      patch,
      dt: new Date().toISOString(),
      dataSource: buildSourceKeyForMode('aram-mayhem', {
        region: isOpggRegion(params.region) ? params.region : DEFAULT_OPGG_REGION,
        tier: isOpggTier(params.tier) ? params.tier : DEFAULT_OPGG_TIER,
      }),
      position: undefined,
      summary: scraped.summary,
      augments: scraped.augments,
      items: scraped.items,
      runes: undefined,
      summonerSpells: undefined,
      skillOrders: scraped.skillOrders,
      skillMasteries: scraped.skillMasteries,
      startingItems: scraped.startingItems,
      coreItems: scraped.coreItems,
      bootsItems: scraped.bootsItems,
      situationalItems: scraped.situationalItems,
      counters: undefined,
      synergies: undefined,
    }
  }

  async getAramBuild(params: {
    championId: string
    lang?: RiotLocale
    region?: OpggRegion
    tier?: OpggTier
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
    const ddragonPatch = await this.assets.resolveDdragonPatch(patch).catch(() => patch)
    const [ddragonItemMetaMap, cdragonItemMetaMap, spellMetaMap] = await Promise.all([
      this.assets.getItemMetaMap(ddragonPatch, params.lang).catch(() => ({}) as Record<string, ItemMeta>),
      this.assets.getCdragonItemMetaMap(params.lang).catch(() => ({}) as Record<string, ItemMeta>),
      this.assets
        .getSummonerSpellMetaMap(ddragonPatch, params.lang)
        .catch(() => ({}) as Record<number, SummonerSpellMeta>),
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
      _lang: params.lang,
    })
  }

  async getArenaBuild(params: {
    championId: string
    lang?: RiotLocale
    region?: OpggRegion
    tier?: OpggTier
  }): Promise<ArenaBuildResult> {
    const championId = Number(params.championId)
    if (!Number.isFinite(championId) || championId <= 0) {
      throw new Error(`Invalid champion id: ${params.championId}`)
    }

    const region = isOpggRegion(params.region) ? params.region : DEFAULT_OPGG_REGION
    const tier = isOpggTier(params.tier) ? params.tier : DEFAULT_OPGG_TIER
    const arenaTier = toArenaTier(tier)
    const arenaUrl = buildOpggUrl(
      `/api/${region}/champions/arena/${championId}?tier=${encodeURIComponent(arenaTier)}`,
    )

    const arena = await fetchJson<OpggChampionBuildResponse>(arenaUrl, { timeoutMs: 20_000 })

    const patch = arena.meta?.version || 'latest'
    const ddragonPatch = await this.assets.resolveDdragonPatch(patch).catch(() => patch)
    const [ddragonItemMetaMap, cdragonItemMetaMap, spellMetaMap, augmentMetaMap] = await Promise.all([
      this.assets.getItemMetaMap(ddragonPatch, params.lang).catch(() => ({}) as Record<string, ItemMeta>),
      this.assets.getCdragonItemMetaMap(params.lang).catch(() => ({}) as Record<string, ItemMeta>),
      this.assets
        .getSummonerSpellMetaMap(ddragonPatch, params.lang)
        .catch(() => ({}) as Record<number, SummonerSpellMeta>),
      this.assets.getAugmentMetaMap(params.lang).catch(() => new Map<number, CDragonAugment>()),
    ])

    const itemMetaMap: Record<string, ItemMeta> = { ...cdragonItemMetaMap, ...ddragonItemMetaMap }
    const sourceKey = buildSourceKeyForMode('arena', { region, tier })

    return transformOpggToArenaBuild({
      championId,
      arena,
      patch,
      assetPatch: ddragonPatch,
      dataSource: sourceKey,
      itemMetaMap,
      spellMetaMap,
      augmentMetaMap,
      _lang: params.lang,
    })
  }

  async getChampionProfile(params: { championId: string; lang?: RiotLocale }): Promise<ChampionProfile> {
    const championId = Number(params.championId)
    if (!Number.isFinite(championId) || championId <= 0) {
      throw new Error(`Invalid champion id: ${params.championId}`)
    }

    const list = await this.getChampionMetaList(params.lang)
    const champion = list.find((row) => Number(row.id) === championId)
    if (!champion) throw new Error(`Champion profile not found: ${params.championId}`)

    return {
      championId: String(championId),
      key: champion.key || String(championId),
      name: champion.name || String(championId),
      title: asOptionalString(champion.title),
      imageUrl: asOptionalString(champion.image_url),
      blurb: stripMarkup(champion.blurb),
      lore: stripMarkup(champion.lore),
      partype: asOptionalString(champion.partype),
      tags: champion.tags?.filter((tag): tag is string => typeof tag === 'string'),
      allyTips: champion.ally_tips?.map((tip) => stripMarkup(tip)).filter((tip): tip is string => !!tip),
      enemyTips: champion.enemy_tips?.map((tip) => stripMarkup(tip)).filter((tip): tip is string => !!tip),
      source: 'opgg',
      info: champion.info
        ? {
            attack: toNum(champion.info.attack) ?? undefined,
            defense: toNum(champion.info.defense) ?? undefined,
            magic: toNum(champion.info.magic) ?? undefined,
            difficulty: toNum(champion.info.difficulty) ?? undefined,
          }
        : undefined,
      passive: champion.passive
        ? {
            key: 'P',
            name: champion.passive.name || 'Passive',
            description: stripMarkup(champion.passive.description),
            iconUrl: asOptionalString(champion.passive.image_url),
            videoUrl: asOptionalString(champion.passive.video_url),
          }
        : undefined,
      spells: (champion.spells ?? [])
        .map((spell) => ({
          key: spell.key || '?',
          name: spell.name || 'Unknown',
          description: stripMarkup(spell.description),
          tooltip: stripMarkup(spell.tooltip),
          iconUrl: asOptionalString(spell.image_url),
          videoUrl: asOptionalString(spell.video_url),
          maxRank: toNum(spell.max_rank),
          cooldowns: spell.cooldown_burn_float?.map((v) => Number(v)).filter(Number.isFinite),
          costs: spell.cost_burn?.map((v) => Number(v)).filter(Number.isFinite),
          ranges: spell.range_burn?.map((v) => Number(v)).filter(Number.isFinite),
        }))
        .filter((spell) => !!spell.name),
    }
  }
}

import type { RiotLocale } from '../../../shared/contracts'
import { fetchJson } from '../net/http'
import { ddragonLocale, normalizeLocale } from './helpers'
import type {
  CDragonAugment,
  CachedValue,
  DDragonItemsResponse,
  DDragonSummonersResponse,
  ItemMeta,
  SummonerSpellMeta,
} from './types'

const DDRAGON_VERSIONS_URL = 'https://ddragon.leagueoflegends.com/api/versions.json'

function cdragonAugmentMetaUrl(locale: 'en_US' | 'zh_CN' | 'zh_TW'): string {
  const lowerLocale = locale.toLowerCase()
  return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/${lowerLocale}/v1/cherry-augments.json`
}

type CDragonItemRow = {
  id?: number
  name?: string
  description?: string
  iconPath?: string
}

function cdragonItemsMetaUrl(locale: 'en_US' | 'zh_CN' | 'zh_TW'): string {
  // Items are available under:
  // - global/default/v1/items.json (English)
  // - global/zh_cn/v1/items.json (Simplified Chinese)
  // - global/zh_tw/v1/items.json (Traditional Chinese)
  const lowerLocale = locale.toLowerCase()
  const cdLocale = lowerLocale.startsWith('zh_cn')
    ? 'zh_cn'
    : lowerLocale.startsWith('zh_tw')
      ? 'zh_tw'
      : 'default'
  return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/${cdLocale}/v1/items.json`
}

function cdragonAssetUrl(pathValue?: string): string | undefined {
  if (!pathValue) return undefined
  const normalized = pathValue.replace('/lol-game-data/assets/', '').toLowerCase()
  return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/${normalized}`
}

export class OPGGAssetsService {
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

  async getItemMetaMap(patch: string, lang?: RiotLocale): Promise<Record<string, ItemMeta>> {
    if (!patch) return {}
    const locale = ddragonLocale(lang)
    const cacheKey = `ddragon:items:${patch}:${locale}`
    const cached = this.getCached<Record<string, ItemMeta>>(cacheKey)
    if (cached) return cached

    const url = `https://ddragon.leagueoflegends.com/cdn/${patch}/data/${locale}/item.json`
    const json = await fetchJson<DDragonItemsResponse>(url, { timeoutMs: 20_000 })
    const map: Record<string, ItemMeta> = {}
    for (const [id, item] of Object.entries(json.data ?? {})) {
      map[id] = {
        name: item.name,
        description: item.plaintext || item.description,
        iconUrl: `https://ddragon.leagueoflegends.com/cdn/${patch}/img/item/${id}.png`,
      }
    }

    this.setCached(cacheKey, map, 60 * 60 * 1000)
    return map
  }

  async getCdragonItemMetaMap(lang?: RiotLocale): Promise<Record<string, ItemMeta>> {
    const locale = normalizeLocale(lang)
    const cacheKey = `cdragon:items:${locale}`
    const cached = this.getCached<Record<string, ItemMeta>>(cacheKey)
    if (cached) return cached

    const url = cdragonItemsMetaUrl(locale)
    const rows = await fetchJson<CDragonItemRow[]>(url, { timeoutMs: 20_000 })
    const map: Record<string, ItemMeta> = {}
    for (const row of rows ?? []) {
      const id = typeof row?.id === 'number' && Number.isFinite(row.id) ? row.id : null
      if (!id || id <= 0) continue
      map[String(id)] = {
        name: row.name,
        description: row.description,
        iconUrl: cdragonAssetUrl(row.iconPath),
      }
    }

    this.setCached(cacheKey, map, 12 * 60 * 60 * 1000)
    return map
  }

  async getSummonerSpellMetaMap(
    patch: string,
    lang?: RiotLocale,
  ): Promise<Record<number, SummonerSpellMeta>> {
    if (!patch) return {}
    const locale = ddragonLocale(lang)
    const cacheKey = `ddragon:summoner:${patch}:${locale}`
    const cached = this.getCached<Record<number, SummonerSpellMeta>>(cacheKey)
    if (cached) return cached

    const url = `https://ddragon.leagueoflegends.com/cdn/${patch}/data/${locale}/summoner.json`
    const json = await fetchJson<DDragonSummonersResponse>(url, { timeoutMs: 20_000 })
    const map: Record<number, SummonerSpellMeta> = {}

    for (const data of Object.values(json.data ?? {})) {
      const id = Number(data.key)
      if (!Number.isFinite(id)) continue
      map[id] = {
        id,
        name: data.name,
        iconUrl: data.image?.full
          ? `https://ddragon.leagueoflegends.com/cdn/${patch}/img/spell/${data.image.full}`
          : undefined,
      }
    }

    this.setCached(cacheKey, map, 60 * 60 * 1000)
    return map
  }

  async getAugmentMetaMap(lang?: RiotLocale): Promise<Map<number, CDragonAugment>> {
    const locale = normalizeLocale(lang)
    const cacheKey = `cdragon:augments:${locale}`
    const cached = this.getCached<Map<number, CDragonAugment>>(cacheKey)
    if (cached) return cached

    const payload = await fetchJson<CDragonAugment[]>(cdragonAugmentMetaUrl(locale), { timeoutMs: 20_000 })
    const map = new Map<number, CDragonAugment>()
    for (const row of payload) {
      if (typeof row.id === 'number' && Number.isFinite(row.id)) {
        map.set(row.id, row)
      }
    }

    this.setCached(cacheKey, map, 60 * 60 * 1000)
    return map
  }

  async resolveDdragonPatch(opggPatch: string): Promise<string> {
    if (!opggPatch || opggPatch === 'latest') {
      const versions = await this.getDdragonVersions()
      return versions[0] || 'latest'
    }

    if (/^\\d+\\.\\d+\\.\\d+$/.test(opggPatch)) return opggPatch

    const compactMatch = opggPatch.match(/^(\\d+)\\.(\\d{2})$/)
    if (!compactMatch) return opggPatch

    const major = Number(compactMatch[1])
    const minor = Number(compactMatch[2])
    if (!Number.isFinite(major) || !Number.isFinite(minor)) return opggPatch

    const prefix = `${major}.${minor}.`
    const versions = await this.getDdragonVersions()
    const matched = versions.find((version) => version.startsWith(prefix))
    if (matched) return matched

    return `${major}.${minor}.1`
  }

  private async getDdragonVersions(): Promise<string[]> {
    const cacheKey = 'ddragon:versions'
    const cached = this.getCached<string[]>(cacheKey)
    if (cached) return cached

    const versions = await fetchJson<string[]>(DDRAGON_VERSIONS_URL, { timeoutMs: 20_000 })
    const normalized = Array.isArray(versions)
      ? versions.filter((v) => typeof v === 'string' && v.length > 0)
      : []
    this.setCached(cacheKey, normalized, 60 * 60 * 1000)
    return normalized
  }
}

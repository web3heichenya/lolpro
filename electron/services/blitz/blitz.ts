import type { StructuredRepository } from '../db/structuredRepository'
import type { DataRepository } from '../db/dataRepository'
import { fetchJson } from '../net/http'
import { normalizeRiotLocale, type RiotLocale } from './locales'
import type { ChampionSummary } from '../../../shared/contracts'
import { APP_META_KEYS } from '../../../shared/cacheKeys'

export type { ChampionSummary } from '../../../shared/contracts'

type VersionsResponse = string[]

type DdragonChampionsResponse = {
  data: Record<
    string,
    {
      id?: string
      key?: string
      name?: string
      title?: string
    }
  >
}

const RIOT_DDRAGON_BASE = 'https://ddragon.leagueoflegends.com/cdn'
const RIOT_DDRAGON_VERSIONS_URL = 'https://ddragon.leagueoflegends.com/api/versions.json'

type BlitzDataRepository = Pick<DataRepository, 'readAppMeta' | 'writeAppMeta'>
type BlitzStructuredRepository = Pick<StructuredRepository, 'getFreshChampionsFromDb' | 'replaceChampions'>

export type BlitzServiceDependencies = {
  dataRepository: BlitzDataRepository
  structuredRepository: BlitzStructuredRepository
}

export class BlitzService {
  constructor(
    private readonly deps: BlitzServiceDependencies,
    private readonly httpFetch: typeof fetchJson = fetchJson,
  ) {}

  async getLatestDdragonVersion(): Promise<string> {
    const dataKey = APP_META_KEYS.riotLatestVersion
    const stored = await this.deps.dataRepository.readAppMeta<string>(dataKey, 6 * 60 * 60 * 1000)
    if (stored) return stored

    const versions = await this.httpFetch<VersionsResponse>(RIOT_DDRAGON_VERSIONS_URL, {
      timeoutMs: 10_000,
    })
    const version = versions?.[0]
    if (!version) throw new Error('Failed to fetch Riot versions')
    await this.deps.dataRepository.writeAppMeta(dataKey, version)
    return version
  }

  async getChampions(lang?: RiotLocale): Promise<ChampionSummary[]> {
    const locale = normalizeRiotLocale(lang)
    const stored = await this.deps.structuredRepository.getFreshChampionsFromDb(locale, 24 * 60 * 60 * 1000)
    if (stored?.length) return stored

    const dd = await this.getLatestDdragonVersion()
    const json = await this.httpFetch<DdragonChampionsResponse>(
      `${RIOT_DDRAGON_BASE}/${dd}/data/${locale}/champion.json`,
      {
        timeoutMs: 15_000,
      },
    )

    const list = Object.entries(json.data ?? {}).map(([slug, v]) => ({
      id: v.key ?? '',
      name: v.name ?? slug,
      title: v.title || undefined,
      slug,
      iconUrl: `https://ddragon.leagueoflegends.com/cdn/${dd}/img/champion/${slug}.png`,
      splashUrl: `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${slug}_0.jpg`,
    }))
    const filtered = list.filter((row) => row.id)

    filtered.sort((a, b) => a.name.localeCompare(b.name))
    await this.deps.structuredRepository.replaceChampions(locale, filtered)
    return filtered
  }
}

import type { BuildResult, GameModeId, RiotLocale } from '../../../shared/contracts'
import { buildSourceKeyForMode } from '../../../shared/buildSource'
import { DEFAULT_OPGG_REGION, DEFAULT_OPGG_TIER } from '../../../shared/opgg'

import type { BuildResolver } from '../../modes'
import type { BlitzService } from '../../services/blitz/blitz'
import type { DataRepository } from '../../services/db/dataRepository'
import type { SettingsStore } from '../../services/settings/settingsStore'

export class BuildFetcher {
  constructor(
    private readonly dataRepository: DataRepository,
    private readonly buildResolver: BuildResolver,
    private readonly settingsStore: Pick<SettingsStore, 'get'>,
    private readonly blitzService: Pick<BlitzService, 'getChampions'>,
  ) {}

  async getBuild(opts: {
    mode: GameModeId
    championId: string
    lang?: RiotLocale
    force?: boolean
  }): Promise<BuildResult> {
    const force = !!opts.force
    const opggSettings = this.settingsStore.get().dataSource?.opgg
    const region = opggSettings?.region ?? DEFAULT_OPGG_REGION
    const tier = opggSettings?.tier ?? DEFAULT_OPGG_TIER
    const sourceKey = buildSourceKeyForMode(opts.mode, { region, tier })

    if (!force) {
      const cached = await this.dataRepository.getBuild({
        mode: opts.mode,
        championId: opts.championId,
        lang: opts.lang,
        sourceKey,
      })
      if (cached && !this.buildResolver.shouldRefreshCachedBuild({ mode: opts.mode, build: cached })) {
        return cached
      }
    }

    const resolvedChampionKey = await (async () => {
      if (opts.mode !== 'aram-mayhem') return null
      try {
        const champs = await this.blitzService.getChampions(opts.lang)
        const found = champs.find((c) => c.id === opts.championId)
        return found?.slug ?? null
      } catch {
        // Do not block ARAM Mayhem build fetch if Blitz champion-list lookup fails on this platform/network.
        return null
      }
    })()

    const build = await this.buildResolver.getBuild({
      mode: opts.mode,
      championId: opts.championId,
      championKey: resolvedChampionKey ?? undefined,
      lang: opts.lang,
      region,
      tier,
    })

    await this.dataRepository.saveBuild({
      mode: opts.mode,
      championId: opts.championId,
      lang: opts.lang,
      sourceKey,
      dataSource: String(build.dataSource ?? sourceKey),
      build,
    })

    return build
  }
}

import type { BuildResult, GameModeId, RiotLocale } from '../../../shared/contracts'
import { buildSourceKeyForMode } from '../../../shared/buildSource'
import { DEFAULT_OPGG_REGION, DEFAULT_OPGG_TIER } from '../../../shared/opgg'

import type { BuildResolver } from '../../modes'
import type { BlitzService } from '../../services/blitz/blitz'
import type { DataRepository } from '../../services/db/dataRepository'
import type { SettingsStore } from '../../services/settings/settingsStore'

export class BuildFetcher {
  private static readonly ARENA_CACHE_SELF_HEAL_COOLDOWN_MS = 6 * 60 * 60 * 1000

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
      if (cached && !this.shouldRefreshCachedBuild(opts.mode, cached)) return cached
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

  private shouldRefreshCachedBuild(mode: GameModeId, build: BuildResult): boolean {
    const dtMs = Date.parse(build.dt ?? '')
    const recentlyFetched =
      Number.isFinite(dtMs) && Date.now() - dtMs < BuildFetcher.ARENA_CACHE_SELF_HEAL_COOLDOWN_MS

    if (mode === 'arena' && build.mode === 'arena') {
      const comboItems = [
        ...(build.startingItems ?? []),
        ...(build.coreItems ?? []),
        ...(build.bootsItems ?? []),
      ].flatMap((combo) => combo.items ?? [])

      const hasBrokenComboItem = comboItems.some(
        (item) => item.id >= 100_000 && (!item.name || !item.iconUrl),
      )
      const hasBrokenFlatItem = (build.items ?? []).some((item) => {
        const id = Number(item.itemId)
        return Number.isFinite(id) && id >= 100_000 && (!item.name || !item.iconUrl)
      })
      const hasBrokenArenaItems = hasBrokenComboItem || hasBrokenFlatItem
      if (!hasBrokenArenaItems) return false

      // Self-heal once per cooldown window. If still unresolved after refetch, stop retrying
      // and avoid infinite refresh loops.
      return !recentlyFetched
    }

    if (mode === 'aram-mayhem' && build.mode === 'aram-mayhem') {
      const hasBaseData = (build.augments?.length ?? 0) > 0 || (build.items?.length ?? 0) > 0
      // If a previous scrape cached an empty payload, always retry to self-heal.
      if (!hasBaseData) return true

      const missingCore = (build.coreItems?.length ?? 0) === 0
      const missingSituational = (build.situationalItems?.length ?? 0) === 0
      const missingSkills =
        (build.skillMasteries?.length ?? 0) === 0 && (build.skillOrders?.length ?? 0) === 0
      const looksLikeLegacyBrokenCache = missingCore || missingSituational || missingSkills
      if (!looksLikeLegacyBrokenCache) return false

      return !recentlyFetched
    }

    return false
  }
}

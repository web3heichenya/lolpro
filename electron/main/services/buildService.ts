import {
  championProfileSchema,
  type ChampionProfile,
  type GameModeId,
  type RiotLocale,
  type SupportedMode,
} from '../../../shared/contracts'
import { listSupportedModes } from '../../../shared/gameModes'
import { DATA_SOURCES } from '../../../shared/cacheKeys'
import type { BlitzService, ChampionSummary } from '../../services/blitz/blitz'
import type { OPGGService } from '../../services/opgg/service'
import type { DataRepository } from '../../services/db/dataRepository'
import type { StructuredRepository } from '../../services/db/structuredRepository'
import type { GameContextManager } from '../../state/gameContextManager'
import type { BuildFetcher } from './buildFetcher'

export class BuildService {
  constructor(
    private readonly gameContext: GameContextManager,
    private readonly dataRepository: DataRepository,
    private readonly structuredRepository: StructuredRepository,
    private readonly blitzService: Pick<BlitzService, 'getChampions'>,
    private readonly opggService: Pick<OPGGService, 'getChampionProfile'>,
    private readonly buildFetcher: BuildFetcher,
  ) {}

  async getChampions(opts?: { lang?: RiotLocale }): Promise<ChampionSummary[]> {
    return await this.blitzService.getChampions(opts?.lang)
  }

  async getSupportedModes(): Promise<SupportedMode[]> {
    const defaults = listSupportedModes().map(({ id, label, features }) => ({ id, label, features }))
    await this.structuredRepository.upsertModes(defaults)
    const stored = await this.structuredRepository.listStoredModes()
    return stored.length ? stored : defaults
  }

  async getChampionProfile(opts: { championId: string; lang?: RiotLocale }): Promise<ChampionProfile> {
    const lang = opts.lang ?? 'en_US'
    const cached = await this.dataRepository.readChampionProfile({
      championId: opts.championId,
      lang,
      maxAgeMs: 14 * 24 * 60 * 60 * 1000,
    })
    if (cached?.championId && String(cached.championId) === String(opts.championId)) return cached

    const profile = championProfileSchema.parse(
      await this.opggService.getChampionProfile({ championId: opts.championId, lang }),
    )
    await this.dataRepository.writeChampionProfile({
      championId: opts.championId,
      lang,
      dataSource: DATA_SOURCES.championProfileOpggMeta,
      profile,
    })
    return profile
  }

  async getBuild(opts: { mode: GameModeId; championId: string; lang?: RiotLocale; force?: boolean }) {
    const build = await this.buildFetcher.getBuild(opts)
    const snapshot = this.gameContext.getSnapshot()
    const detectedChampionId = snapshot.detectedChampionId
    const inGameLockActive = snapshot.isGameRelated && Number.isFinite(detectedChampionId)

    // While in-game/champ-select, keep overlay pinned to the detected player champion.
    // User-initiated lookups for other champions must not override activeBuild.
    if (inGameLockActive) {
      const requestedChampionId = Number(opts.championId)
      const sameAsDetected =
        Number.isFinite(requestedChampionId) &&
        requestedChampionId === detectedChampionId &&
        opts.mode === snapshot.modeId
      if (sameAsDetected) this.gameContext.setActiveBuild(build)
      return build
    }

    // Out of game, keep existing behavior: current query can drive active overlay content.
    this.gameContext.setActiveBuild(build)
    return build
  }

  async clearBuildCache(mode: GameModeId): Promise<void> {
    await this.dataRepository.clearModeData(mode)
  }
}

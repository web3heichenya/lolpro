import { EventEmitter } from 'node:events'

import type { BlitzService } from '../services/blitz/blitz'
import type { RiotLocale } from '../services/blitz/locales'
import { LiveClientWatcher, type LiveClientStatus } from '../services/game-client/liveClientWatcher'
import { log } from '../services/logging/logger'
import { LcuConnector, type LcuStatus } from '../services/lcu/connector'
import { DEFAULT_GAME_MODE, resolveSupportedModeByQueueId } from '../../shared/gameModes'
import type {
  BuildResult,
  GameContext as SharedGameContext,
  PlayerCareerSnapshot,
  SummonerInfo,
} from '../../shared/contracts'
import {
  buildChampionKeyToIdMap,
  computeIsGameRelated,
  detectChampion,
  normalizeChampionKey,
} from './gameContextLogic'

const logger = log('gameContext')
export type GameContext = SharedGameContext

type GameContextManagerDeps = {
  getBuild: (params: {
    mode: GameContext['modeId']
    championId: string
    lang?: RiotLocale
    force?: boolean
  }) => Promise<BuildResult>
  getChampions: BlitzService['getChampions']
}

const CONTEXT_EQUALS_SELECTORS: Array<(context: GameContext) => unknown> = [
  (context) => context.modeId,
  (context) => context.isSupportedMode,
  (context) => context.isGameRelated,
  (context) => context.detectedChampionId,
  (context) => context.detectedChampionSource,
  (context) => context.lcu.connected,
  (context) => context.lcu.phase,
  (context) => context.lcu.currentChampionId,
  (context) => context.lcu.queueId,
  (context) => context.lcu.inProgress,
  (context) => context.lcu.champSelectSession?.localPlayerCellId,
  (context) => context.lcu.champSelectSession?.myTeam.length,
  (context) => context.lcu.champSelectSession?.theirTeam.length,
  (context) => context.lcu.champSelectSession?.myTeam.map((p) => p.puuid ?? '').join('|'),
  (context) =>
    context.lcu.champSelectSession?.myTeam
      .map((p) => `${p.championId ?? 0}:${p.championPickIntent ?? 0}`)
      .join('|'),
  (context) => context.lcu.champSelectSession?.theirTeam.map((p) => p.puuid ?? '').join('|'),
  (context) =>
    context.lcu.champSelectSession?.theirTeam
      .map((p) => `${p.championId ?? 0}:${p.championPickIntent ?? 0}`)
      .join('|'),
  (context) => context.lcu.summoner?.puuid,
  (context) => context.lcu.summoner?.gameName,
  (context) => context.lcu.summoner?.displayName,
  (context) => context.lcu.summoner?.tagLine,
  (context) => context.lcu.summoner?.summonerLevel,
  (context) => context.lcu.summoner?.profileIconId,
  (context) => context.live.connected,
  (context) => context.live.championName,
  (context) => context.live.championId,
  (context) => context.live.gameMode,
  (context) => context.live.activePlayerName,
  (context) =>
    context.live.allPlayers
      ?.map(
        (player) =>
          `${player.team ?? ''}:${player.summonerName ?? ''}:${player.championId ?? 0}:${player.championName ?? ''}`,
      )
      .join('|'),
]

function contextsEqual(a: GameContext, b: GameContext) {
  return CONTEXT_EQUALS_SELECTORS.every((selector) => selector(a) === selector(b))
}

export class GameContextManager extends EventEmitter {
  private started = false

  private lcu = new LcuConnector()
  private live = new LiveClientWatcher()
  private liveRunning = false
  private lcuPollTimer: NodeJS.Timeout | null = null
  private lcuPolling = false

  private championKeyToId: Map<string, number> | null = null

  private lcuStatus: LcuStatus = { connected: false }
  private liveStatus: LiveClientStatus = { connected: false }

  private context: GameContext = {
    modeId: DEFAULT_GAME_MODE,
    isSupportedMode: false,
    isGameRelated: false,
    detectedChampionSource: null,
    lcu: { connected: false },
    live: { connected: false },
  }

  private activeBuild: BuildResult | null = null
  private buildDebounceTimer: NodeJS.Timeout | null = null
  private buildRequestSeq = 0
  private lang: RiotLocale | undefined

  constructor(private readonly deps: GameContextManagerDeps) {
    super()

    this.lcu.on('status', (status: LcuStatus) => {
      this.lcuStatus = status
      this.maybeUpdateLiveWatcher()
      this.recompute()
    })

    this.live.on('status', (status: LiveClientStatus) => {
      this.liveStatus = status
      this.recompute()
    })
  }

  getSnapshot(): GameContext {
    return this.context
  }

  isGameRelated(): boolean {
    return this.context.isGameRelated
  }

  getActiveBuild(): BuildResult | null {
    return this.activeBuild
  }

  async getPlayerCareer(puuid: string): Promise<PlayerCareerSnapshot> {
    return await this.lcu.getPlayerCareerByPuuid(puuid)
  }

  async getSummonerByPuuid(puuid: string): Promise<SummonerInfo | null> {
    return await this.lcu.getSummonerByPuuid(puuid)
  }

  setActiveBuild(build: BuildResult | null) {
    this.activeBuild = build
    this.emit('activeBuildChanged', this.activeBuild)
  }

  setLanguage(lang: RiotLocale | undefined) {
    const next = lang
    if (this.lang === next) return
    this.lang = next
    // Refresh build in the selected language if we have a detected champion.
    if (this.context.detectedChampionId && this.context.isSupportedMode) {
      this.scheduleBuildFetch(this.context.detectedChampionId)
    }
  }

  async start() {
    if (this.started) return
    this.started = true

    // Start LCU and LiveClient watchers.
    await this.lcu.start()
    this.startLcuPolling()
    this.maybeUpdateLiveWatcher()

    // Build champion map for LiveClient name -> id resolution (en_US is stable).
    this.deps
      .getChampions('en_US')
      .then((champions) => {
        this.championKeyToId = buildChampionKeyToIdMap(champions)
        this.live.updateResolver((name) => {
          const key = normalizeChampionKey(name)
          return this.championKeyToId?.get(key) ?? null
        })
      })
      .catch(() => {
        // ignore
      })
  }

  stop() {
    this.started = false
    this.buildRequestSeq++
    if (this.lcuPollTimer) clearInterval(this.lcuPollTimer)
    this.lcuPollTimer = null
    this.lcuPolling = false
    this.lcu.stop()
    this.live.stop()
    this.liveRunning = false
    if (this.buildDebounceTimer) clearTimeout(this.buildDebounceTimer)
    this.buildDebounceTimer = null
  }

  async refreshNow() {
    await Promise.all([this.lcu.refreshNow().catch(() => {}), this.live.refreshNow().catch(() => {})])
    this.recompute()
  }

  private maybeUpdateLiveWatcher() {
    if (!this.started) return
    const lcu = this.lcuStatus

    // Optimization:
    // - If LCU is connected, only poll 2999 during InProgress for in-game hero detection.
    // - If LCU is not connected, keep 2999 probing to detect in-progress games anyway.
    const shouldRun = !lcu.connected || lcu.phase === 'InProgress'

    if (shouldRun && !this.liveRunning) {
      this.liveRunning = true
      logger.info('starting liveclient watcher', {
        reason: lcu.connected ? 'lcu-inprogress' : 'lcu-disconnected',
      })
      this.live.start()
    } else if (!shouldRun && this.liveRunning) {
      this.liveRunning = false
      logger.info('stopping liveclient watcher', { phase: lcu.phase ?? null })
      this.live.stop()
    }
  }

  private startLcuPolling() {
    if (this.lcuPollTimer) return
    this.lcuPollTimer = setInterval(() => {
      if (!this.started || this.lcuPolling || !this.shouldPollLcu()) return
      this.lcuPolling = true
      void this.lcu
        .refreshNow()
        .catch(() => {})
        .finally(() => {
          this.lcuPolling = false
        })
    }, 1500)
  }

  private shouldPollLcu() {
    // Keep lightweight polling whenever connected so we don't miss state changes if websocket
    // push is delayed/dropped or phase values are temporarily unrecognized.
    return this.lcuStatus.connected
  }

  private recompute() {
    const prev = this.context
    const lcu = this.lcuStatus
    const live = this.liveStatus
    const isGameRelated = computeIsGameRelated(lcu, live)
    const resolvedModeId = resolveSupportedModeByQueueId(lcu.queueId)
    const isSupportedMode = resolvedModeId != null
    const { detectedChampionId, detectedChampionSource } = detectChampion(lcu, live)

    const next: GameContext = {
      modeId: resolvedModeId ?? DEFAULT_GAME_MODE,
      isSupportedMode,
      isGameRelated,
      detectedChampionId,
      detectedChampionSource,
      lcu,
      live,
    }

    if (!contextsEqual(prev, next)) {
      this.context = next
      this.emit('changed', this.context)

      if (
        (prev.detectedChampionId !== next.detectedChampionId || prev.modeId !== next.modeId) &&
        next.detectedChampionId &&
        next.isSupportedMode
      ) {
        this.emit('detectedChampionChanged', next.detectedChampionId)
        this.scheduleBuildFetch(next.detectedChampionId)
      }

      if (!next.isSupportedMode && this.activeBuild) {
        this.buildRequestSeq++
        this.setActiveBuild(null)
      }

      if (prev.isGameRelated && !next.isGameRelated) {
        this.emit('gameEnded')
      }
    }
  }

  private scheduleBuildFetch(championId: number) {
    const requestSeq = ++this.buildRequestSeq
    if (this.buildDebounceTimer) clearTimeout(this.buildDebounceTimer)
    this.buildDebounceTimer = setTimeout(() => {
      this.fetchBuild(String(championId), requestSeq).catch(() => {})
    }, 300)
  }

  private async fetchBuild(championId: string, requestSeq: number) {
    if (!this.context.isSupportedMode) {
      if (requestSeq === this.buildRequestSeq) this.setActiveBuild(null)
      return
    }

    const expectedMode = this.context.modeId
    const expectedChampionId = Number(championId)

    try {
      const build = await this.deps.getBuild({
        mode: expectedMode,
        championId,
        lang: this.lang,
      })

      if (requestSeq !== this.buildRequestSeq) return
      if (!this.context.isSupportedMode || this.context.modeId !== expectedMode) return
      if (!Number.isFinite(expectedChampionId) || this.context.detectedChampionId !== expectedChampionId)
        return

      this.activeBuild = build
      this.emit('activeBuildChanged', this.activeBuild)
    } catch (err) {
      if (requestSeq !== this.buildRequestSeq) return
      const e = err instanceof Error ? err : new Error(String(err))
      logger.warn('fetchBuild failed', { championId, message: e.message })
      throw err
    }
  }
}

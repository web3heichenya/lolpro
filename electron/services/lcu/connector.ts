import { EventEmitter } from 'node:events'

import { findReadableLockfile, getDefaultLockfileCandidates, readLockfile } from './lockfile'
import {
  extractQueueId,
  parseChampSelectSession,
  parseGameflowSession,
  parseRecentMatches,
  parseSummonerRow,
} from './parsers'
import { requestLcuJson } from './http'
import { TtlCache } from './ttlCache'
import { queryLeagueClientUxCredentials } from './uxCommandLine'
import { LcuWsClient } from './wsClient'
import { log } from '../logging/logger'
import type { LcuStatus, PlayerCareerSnapshot, SummonerInfo } from '../../../shared/contracts'

export type { LcuStatus } from '../../../shared/contracts'

const SUBSCRIPTIONS = [
  '/lol-gameflow/v1/gameflow-phase',
  '/lol-gameflow/v1/session',
  '/lol-champ-select/v1/current-champion',
  '/lol-champ-select/v1/session',
] as const

const logger = log('lcu')
const PLAYER_CAREER_CACHE_TTL_MS = 45_000
const SUMMONER_CACHE_TTL_MS = 20_000

export class LcuConnector extends EventEmitter {
  private timer: NodeJS.Timeout | null = null
  private ws: LcuWsClient | null = null
  private connecting = false
  private port: number | null = null
  private password: string | null = null

  private status: LcuStatus = { connected: false }
  private lastChampionId: number | null = null
  private currentSummoner: LcuStatus['summoner'] | undefined
  private lastErrorAt = 0
  private nextProbeAt = 0
  private probeDelayMs = 2000
  private playerCareerCache = new TtlCache<string, PlayerCareerSnapshot>(PLAYER_CAREER_CACHE_TTL_MS)
  private summonerCache = new TtlCache<string, SummonerInfo | null>(SUMMONER_CACHE_TTL_MS)

  getStatus(): LcuStatus {
    return this.status
  }

  async getPlayerCareerByPuuid(puuid: string): Promise<PlayerCareerSnapshot> {
    const cached = this.playerCareerCache.get(puuid)
    if (cached) return cached
    if (!this.status.connected) throw new Error('LCU not connected')
    const encoded = encodeURIComponent(puuid)
    const [summonerPayload, matchesPayload] = await Promise.all([
      this.getJson(`/lol-summoner/v2/summoners/puuid/${encoded}`).catch(() => undefined),
      this.getJson(`/lol-match-history/v1/products/lol/${encoded}/matches?begIndex=0&endIndex=10`).catch(
        () => undefined,
      ),
    ])

    const snapshot: PlayerCareerSnapshot = {
      puuid,
      summoner: parseSummonerRow(summonerPayload),
      recentMatches: parseRecentMatches(matchesPayload, puuid),
    }
    this.playerCareerCache.set(puuid, snapshot)
    if (snapshot.summoner) {
      this.summonerCache.set(puuid, snapshot.summoner)
    }
    return snapshot
  }

  async getSummonerByPuuid(puuid: string): Promise<SummonerInfo | null> {
    const cached = this.summonerCache.get(puuid)
    if (cached !== undefined) return cached
    if (!this.status.connected) return null
    const encoded = encodeURIComponent(puuid)
    const payload = await this.getJson(`/lol-summoner/v2/summoners/puuid/${encoded}`).catch(() => undefined)
    const summoner = parseSummonerRow(payload) ?? null
    this.summonerCache.set(puuid, summoner)
    return summoner
  }

  async start() {
    if (this.timer) return

    // Low overhead: only attempts to connect when disconnected.
    this.timer = setInterval(() => {
      this.probeConnection().catch(() => {})
    }, 2000)

    await this.probeConnection()
  }

  async refreshNow() {
    await this.probeConnection({ force: true })
    if (this.status.connected) {
      await this.refreshConnectedSnapshot()
    }
  }

  stop() {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    this.ws?.disconnect()
    this.ws = null
    this._setDisconnected()
  }

  private _setDisconnected() {
    this.playerCareerCache.clear()
    this.summonerCache.clear()
    this.status = {
      connected: false,
      summoner: this.currentSummoner,
      champSelectSession: undefined,
    }
    this.emit('status', this.status)
    this.lastChampionId = null
  }

  private async probeConnection(options: { force?: boolean } = {}) {
    if (this.ws?.isConnected) return
    if (this.connecting) return

    const now = Date.now()
    if (!options.force && now < this.nextProbeAt) return
    this.connecting = true

    try {
      const ux = await queryLeagueClientUxCredentials()
      const lockfilePath = await findReadableLockfile(getDefaultLockfileCandidates())

      if (!ux && !lockfilePath) {
        this.logRateLimited('no credentials found (ux cmdline + lockfile both missing)')
        this._setDisconnected()
        this.bumpBackoff()
        return
      }

      let info: Awaited<ReturnType<typeof readLockfile>> | null = null
      if (lockfilePath) {
        try {
          info = await readLockfile(lockfilePath)
        } catch (error) {
          logger.warn('lockfile unreadable, ignoring', {
            path: lockfilePath,
            message: error instanceof Error ? error.message : String(error),
          })
        }
      }
      const port = ux?.port ?? info?.port
      const password = ux?.authToken ?? info?.password
      if (!port || !password) {
        this.logRateLimited('credentials incomplete (missing port/password)')
        this._setDisconnected()
        this.bumpBackoff()
        return
      }

      this.port = port
      this.password = password

      this.ws?.disconnect()
      this.ws = new LcuWsClient({ port, password })

      this.ws.on('connected', () => {
        if (!this.status.connected) logger.info('connected')
        this.status = { ...this.status, connected: true, summoner: this.currentSummoner }
        this.emit('status', this.status)
        void this.refreshConnectedSnapshot()
      })

      this.ws.on('disconnected', () => {
        if (this.status.connected) logger.warn('disconnected')
        this._setDisconnected()
      })

      this.ws.on('/lol-gameflow/v1/gameflow-phase', (evt: { data?: unknown }) => {
        const phase = typeof evt?.data === 'string' ? evt.data : undefined
        const inProgress = phase === 'InProgress' ? true : phase === 'ChampSelect' ? false : undefined
        this.status = { ...this.status, connected: true, phase, inProgress, summoner: this.currentSummoner }
        if (phase !== 'ChampSelect') {
          this.lastChampionId = null
        }
        if (phase !== 'ChampSelect' && phase !== 'InProgress') {
          this.status.currentChampionId = undefined
          this.status.champSelectSession = undefined
        }
        this.emit('status', this.status)
      })

      this.ws.on('/lol-gameflow/v1/session', (evt: { data?: unknown }) => {
        const queueId = extractQueueId(evt?.data)
        const gameflowTeamSession = parseGameflowSession(evt?.data, {
          selfPuuid: this.currentSummoner?.puuid,
        })
        this.status = {
          ...this.status,
          connected: true,
          queueId: queueId ?? this.status.queueId,
          champSelectSession: gameflowTeamSession ?? this.status.champSelectSession,
          summoner: this.currentSummoner,
        }
        this.emit('status', this.status)
      })

      this.ws.on('/lol-champ-select/v1/current-champion', (evt: { data?: unknown }) => {
        const cid = typeof evt?.data === 'number' ? evt.data : Number(evt?.data)
        const championId = Number.isFinite(cid) && cid > 0 ? cid : null
        this.status = {
          ...this.status,
          connected: true,
          currentChampionId: championId ?? undefined,
          summoner: this.currentSummoner,
        }
        this.emit('status', this.status)
        if (championId != null && championId !== this.lastChampionId) {
          this.lastChampionId = championId
          this.emit('championChanged', championId)
        }
      })

      this.ws.on('/lol-champ-select/v1/session', (evt: { data?: unknown }) => {
        const champSelectSession = parseChampSelectSession(evt?.data)
        this.status = {
          ...this.status,
          connected: true,
          champSelectSession,
          summoner: this.currentSummoner,
        }
        this.emit('status', this.status)
      })

      await this.ws.connect([...SUBSCRIPTIONS])
      this.resetBackoff()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logRateLimited(`connect failed: ${message}`)
      this._setDisconnected()
      this.bumpBackoff()
    } finally {
      this.connecting = false
    }
  }

  private async refreshCurrentSummoner() {
    const payload = await this.getJson('/lol-summoner/v1/current-summoner')
    const summoner = parseSummonerRow(payload)
    if (!summoner) return
    this.currentSummoner = summoner
    this.status = { ...this.status, summoner }
    this.emit('status', this.status)
  }

  private async refreshGameflowPhase() {
    const payload = await this.getJson('/lol-gameflow/v1/gameflow-phase')
    const phase = typeof payload === 'string' ? payload : undefined
    const inProgress = phase === 'InProgress' ? true : phase === 'ChampSelect' ? false : undefined
    this.status = { ...this.status, phase, inProgress, summoner: this.currentSummoner }
  }

  private async refreshGameflowSession() {
    const payload = await this.getJson('/lol-gameflow/v1/session')
    const queueId = extractQueueId(payload)
    const gameflowTeamSession = parseGameflowSession(payload, {
      selfPuuid: this.currentSummoner?.puuid,
    })
    this.status = {
      ...this.status,
      queueId,
      champSelectSession: gameflowTeamSession ?? this.status.champSelectSession,
      summoner: this.currentSummoner,
    }
  }

  private async refreshCurrentChampion() {
    const payload = await this.getJson('/lol-champ-select/v1/current-champion')
    const cid = typeof payload === 'number' ? payload : Number(payload)
    const championId = Number.isFinite(cid) && cid > 0 ? cid : undefined
    this.status = { ...this.status, currentChampionId: championId, summoner: this.currentSummoner }
  }

  private async refreshChampSelectSession() {
    const payload = await this.getJson('/lol-champ-select/v1/session')
    this.status = {
      ...this.status,
      champSelectSession: parseChampSelectSession(payload),
      summoner: this.currentSummoner,
    }
  }

  private async refreshConnectedSnapshot() {
    await Promise.all([
      this.refreshCurrentSummoner().catch(() => {}),
      this.refreshGameflowPhase().catch(() => {}),
      this.refreshGameflowSession().catch(() => {}),
      this.refreshCurrentChampion().catch(() => {}),
      this.refreshChampSelectSession().catch(() => {}),
    ])
    this.emit('status', this.status)
  }

  private async getJson(endpoint: string): Promise<unknown> {
    if (!this.port || !this.password) throw new Error('LCU credentials unavailable')
    return await requestLcuJson({
      port: this.port,
      password: this.password,
      endpoint,
    })
  }

  private resetBackoff() {
    this.probeDelayMs = 2000
    this.nextProbeAt = Date.now() + this.probeDelayMs
  }

  private bumpBackoff() {
    const next = Math.min(15_000, Math.floor(this.probeDelayMs * 1.5))
    this.probeDelayMs = Math.max(2000, next)
    this.nextProbeAt = Date.now() + this.probeDelayMs
  }

  private logRateLimited(msg: string) {
    const now = Date.now()
    if (now - this.lastErrorAt < 15_000) return
    this.lastErrorAt = now
    logger.warn(msg)
  }
}

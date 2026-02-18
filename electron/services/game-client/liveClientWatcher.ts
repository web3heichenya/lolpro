import { EventEmitter } from 'node:events'
import https from 'node:https'

import { log } from '../logging/logger'
import type { LiveClientStatus } from '../../../shared/contracts'

export type { LiveClientStatus } from '../../../shared/contracts'

type Options = {
  /** Called to convert a championName (e.g. "MonkeyKing") into numeric id. */
  resolveChampionId?: (championName: string) => number | null
  timeoutMs?: number
  probeIntervalMs?: number
  activeIntervalMs?: number
}

const LIVECLIENT_URL = 'https://127.0.0.1:2999/liveclientdata/allgamedata'
const logger = log('liveclient')

export class LiveClientWatcher extends EventEmitter {
  private timer: NodeJS.Timeout | null = null
  private agent = new https.Agent({
    rejectUnauthorized: false,
    keepAlive: true,
    maxSockets: 16,
  })

  private resolveChampionId: Options['resolveChampionId']
  private timeoutMs: number
  private probeIntervalMs: number
  private activeIntervalMs: number

  private status: LiveClientStatus = { connected: false }
  private running = false
  private generation = 0

  constructor(opts: Options = {}) {
    super()
    this.resolveChampionId = opts.resolveChampionId
    this.timeoutMs = opts.timeoutMs ?? 800
    this.probeIntervalMs = opts.probeIntervalMs ?? 5000
    this.activeIntervalMs = opts.activeIntervalMs ?? 1500
  }

  updateResolver(resolveChampionId?: (championName: string) => number | null) {
    this.resolveChampionId = resolveChampionId
  }

  getStatus(): LiveClientStatus {
    return this.status
  }

  async refreshNow() {
    await this.pollOnce()
  }

  start() {
    if (this.running) return
    this.running = true
    const gen = ++this.generation
    const tick = async () => {
      if (!this.running || gen !== this.generation) return
      await this.pollOnce()
      if (!this.running || gen !== this.generation) return
      const next = this.status.connected ? this.activeIntervalMs : this.probeIntervalMs
      this.timer = setTimeout(() => {
        tick().catch(() => {})
      }, next)
    }
    tick().catch(() => {})
  }

  stop() {
    this.running = false
    this.generation++
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
    this._setStatus({ connected: false })
  }

  private _setStatus(next: LiveClientStatus) {
    const prev = this.status
    const prevPlayersSig = this.playersSignature(prev.allPlayers)
    const nextPlayersSig = this.playersSignature(next.allPlayers)
    const changed =
      prev.connected !== next.connected ||
      prev.championName !== next.championName ||
      prev.championId !== next.championId ||
      prev.gameMode !== next.gameMode ||
      prev.activePlayerName !== next.activePlayerName ||
      prevPlayersSig !== nextPlayersSig
    this.status = next
    if (prev.connected !== next.connected) {
      if (next.connected) logger.info('connected')
      else logger.warn('disconnected')
    }
    if (changed) this.emit('status', this.status)
  }

  private async pollOnce() {
    try {
      const data = await this.getJson<unknown>(LIVECLIENT_URL, this.timeoutMs)

      const championName = this.extractChampionName(data)
      const gameMode = this.extractGameMode(data)
      const activePlayerName = this.extractActivePlayerName(data)
      const championId =
        championName && this.resolveChampionId
          ? (this.resolveChampionId(championName) ?? undefined)
          : undefined
      const allPlayers = this.extractAllPlayers(data)

      this._setStatus({
        connected: true,
        championName: championName ?? undefined,
        championId,
        gameMode: gameMode ?? undefined,
        activePlayerName: activePlayerName ?? undefined,
        allPlayers,
      })
    } catch {
      this._setStatus({ connected: false })
    }
  }

  private extractChampionName(data: unknown): string | null {
    if (!data || typeof data !== 'object') return null
    const root = data as Record<string, unknown>
    const activePlayer = root.activePlayer
    if (!activePlayer || typeof activePlayer !== 'object') return null
    const ap = activePlayer as Record<string, unknown>
    const name = ap.championName
    return typeof name === 'string' && name.length ? name : null
  }

  private extractGameMode(data: unknown): string | null {
    if (!data || typeof data !== 'object') return null
    const root = data as Record<string, unknown>
    const gameData = root.gameData
    if (!gameData || typeof gameData !== 'object') return null
    const gd = gameData as Record<string, unknown>
    const mode = gd.gameMode
    return typeof mode === 'string' && mode.length ? mode : null
  }

  private extractActivePlayerName(data: unknown): string | null {
    if (!data || typeof data !== 'object') return null
    const root = data as Record<string, unknown>
    const activePlayer = root.activePlayer
    if (!activePlayer || typeof activePlayer !== 'object') return null
    const row = activePlayer as Record<string, unknown>

    const riotIdGameName = row.riotIdGameName
    if (typeof riotIdGameName === 'string' && riotIdGameName.length) return riotIdGameName

    const summonerName = row.summonerName
    if (typeof summonerName === 'string' && summonerName.length) return summonerName

    const riotId = row.riotId
    if (typeof riotId === 'string' && riotId.length) {
      const [gameName] = riotId.split('#')
      return gameName?.trim() || null
    }

    return null
  }

  private extractAllPlayers(data: unknown): NonNullable<LiveClientStatus['allPlayers']> {
    if (!data || typeof data !== 'object') return []
    const root = data as Record<string, unknown>
    const allPlayers = root.allPlayers
    if (!Array.isArray(allPlayers)) return []

    const rows: NonNullable<LiveClientStatus['allPlayers']> = []

    for (const entry of allPlayers) {
      if (!entry || typeof entry !== 'object') continue
      const row = entry as Record<string, unknown>
      const championName = typeof row.championName === 'string' ? row.championName : undefined
      const championId =
        championName && this.resolveChampionId
          ? (this.resolveChampionId(championName) ?? undefined)
          : undefined
      const team = typeof row.team === 'string' ? row.team : undefined

      const riotIdGameName = typeof row.riotIdGameName === 'string' ? row.riotIdGameName : undefined
      const summonerNameRaw = typeof row.summonerName === 'string' ? row.summonerName : undefined
      const riotId = typeof row.riotId === 'string' ? row.riotId : undefined
      const riotIdName = riotId?.split('#')?.[0]?.trim() || undefined
      const summonerName = riotIdGameName || summonerNameRaw || riotIdName

      const parsed = {
        team,
        summonerName,
        championName,
        championId,
        isBot: row.isBot === true,
      }

      if (!parsed.summonerName && !parsed.championName && !parsed.championId && !parsed.team) continue
      rows.push(parsed)
    }

    return rows
  }

  private playersSignature(players: LiveClientStatus['allPlayers']): string {
    if (!players?.length) return ''
    return players
      .map(
        (player, index) =>
          `${index}:${player.team ?? ''}:${player.summonerName ?? ''}:${player.championId ?? 0}:${player.championName ?? ''}`,
      )
      .join('|')
  }

  private async getJson<T>(url: string, timeoutMs: number): Promise<T> {
    return await new Promise<T>((resolve, reject) => {
      const req = https.request(
        url,
        {
          method: 'GET',
          agent: this.agent,
          rejectUnauthorized: false,
          headers: { accept: 'application/json' },
        },
        (res) => {
          const chunks: Buffer[] = []
          res.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
          res.on('end', () => {
            if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
              reject(new Error(`LiveClient HTTP ${res.statusCode ?? '???'}`))
              return
            }
            try {
              const body = Buffer.concat(chunks).toString('utf8')
              resolve(JSON.parse(body) as T)
            } catch {
              reject(new Error('LiveClient parse error'))
            }
          })
        },
      )

      req.setTimeout(timeoutMs, () => {
        req.destroy(new Error('timeout'))
      })
      req.on('error', reject)
      req.end()
    })
  }
}

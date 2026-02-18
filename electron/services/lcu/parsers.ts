import type { LcuStatus, PlayerCareerSnapshot } from '../../../shared/contracts'
export { parseGameflowSession } from './gameflowParsers'

function toInt(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value)
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return Math.trunc(parsed)
  }
  return undefined
}

function toNum(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

function buildParticipantPuuidMap(payload: unknown): Map<number, string> {
  const map = new Map<number, string>()
  if (!Array.isArray(payload)) return map
  for (const entry of payload) {
    if (!entry || typeof entry !== 'object') continue
    const row = entry as Record<string, unknown>
    const participantId = toInt(row.participantId)
    if (!participantId || participantId <= 0) continue
    const player = row.player
    const puuid =
      player && typeof player === 'object' && typeof (player as Record<string, unknown>).puuid === 'string'
        ? ((player as Record<string, unknown>).puuid as string)
        : null
    if (!puuid) continue
    map.set(participantId, puuid.toLowerCase())
  }
  return map
}

function getParticipantPuuid(
  participant: Record<string, unknown>,
  participantPuuidMap: Map<number, string>,
): string | null {
  const direct = typeof participant.puuid === 'string' ? participant.puuid : null
  if (direct) return direct.toLowerCase()

  const player = participant.player
  if (player && typeof player === 'object' && typeof (player as Record<string, unknown>).puuid === 'string') {
    return ((player as Record<string, unknown>).puuid as string).toLowerCase()
  }

  const participantId = toInt(participant.participantId)
  if (participantId && participantId > 0) {
    return participantPuuidMap.get(participantId) ?? null
  }

  return null
}

export function extractQueueId(session: unknown): number | undefined {
  if (!session || typeof session !== 'object') return undefined
  const root = session as Record<string, unknown>
  const gameData = root.gameData
  if (gameData && typeof gameData === 'object') {
    const gd = gameData as Record<string, unknown>
    const queueId = toInt(gd.queueId)
    if (queueId && queueId > 0) return queueId
    const queue = gd.queue
    if (queue && typeof queue === 'object') {
      const q = queue as Record<string, unknown>
      const id = toInt(q.id ?? q.queueId)
      if (id && id > 0) return id
    }
  }
  const queueId = toInt(root.queueId)
  if (queueId && queueId > 0) return queueId
  return undefined
}

export function parseSummonerRow(payload: unknown): LcuStatus['summoner'] | undefined {
  if (!payload || typeof payload !== 'object') return undefined
  const row = payload as Record<string, unknown>
  return {
    puuid: typeof row.puuid === 'string' ? row.puuid : undefined,
    gameName: typeof row.gameName === 'string' ? row.gameName : undefined,
    displayName: typeof row.displayName === 'string' ? row.displayName : undefined,
    tagLine: typeof row.tagLine === 'string' ? row.tagLine : undefined,
    summonerLevel: typeof row.summonerLevel === 'number' ? row.summonerLevel : undefined,
    profileIconId: typeof row.profileIconId === 'number' ? row.profileIconId : undefined,
  }
}

type ParsedPickAction = {
  pickedChampionId?: number
  hoveringChampionId?: number
}

function parsePickActions(payload: unknown): Map<number, ParsedPickAction> {
  const map = new Map<number, ParsedPickAction>()
  if (!Array.isArray(payload)) return map

  for (const round of payload) {
    if (!Array.isArray(round)) continue
    for (const action of round) {
      if (!action || typeof action !== 'object') continue
      const row = action as Record<string, unknown>
      if (row.type !== 'pick') continue
      const cellId = toInt(row.actorCellId)
      const championId = toInt(row.championId)
      if (!cellId || !championId || championId <= 0) continue

      const prev = map.get(cellId) ?? {}
      const completed = row.completed === true
      const inProgress = row.isInProgress === true

      map.set(cellId, {
        pickedChampionId: completed ? championId : prev.pickedChampionId,
        hoveringChampionId: inProgress ? championId : prev.hoveringChampionId,
      })
    }
  }

  return map
}

function parseChampSelectTeam(
  payload: unknown,
  pickActions: Map<number, ParsedPickAction>,
): NonNullable<LcuStatus['champSelectSession']>['myTeam'] {
  if (!Array.isArray(payload)) return []
  return payload.map((entry) => {
    const row = entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : {}
    const cellId = toInt(row.cellId)
    const actionState = cellId ? pickActions.get(cellId) : undefined
    const championId = toInt(row.championId) ?? actionState?.pickedChampionId
    const championPickIntent = toInt(row.championPickIntent) ?? actionState?.hoveringChampionId
    return {
      cellId,
      puuid: typeof row.puuid === 'string' ? row.puuid : undefined,
      championId: championId && championId > 0 ? championId : undefined,
      championPickIntent: championPickIntent && championPickIntent > 0 ? championPickIntent : undefined,
      assignedPosition: typeof row.assignedPosition === 'string' ? row.assignedPosition : undefined,
    }
  })
}

export function parseChampSelectSession(payload: unknown): LcuStatus['champSelectSession'] | undefined {
  if (!payload || typeof payload !== 'object') return undefined
  const row = payload as Record<string, unknown>
  const pickActions = parsePickActions(row.actions)
  return {
    localPlayerCellId: toInt(row.localPlayerCellId),
    myTeam: parseChampSelectTeam(row.myTeam, pickActions),
    theirTeam: parseChampSelectTeam(row.theirTeam, pickActions),
  }
}

export function parseRecentMatches(payload: unknown, puuid: string): PlayerCareerSnapshot['recentMatches'] {
  if (!payload || typeof payload !== 'object') return []
  const root = payload as Record<string, unknown>
  const gamesRoot = root.games
  const games =
    (Array.isArray(gamesRoot) ? gamesRoot : undefined) ??
    (gamesRoot && typeof gamesRoot === 'object'
      ? (((gamesRoot as Record<string, unknown>).games as unknown[] | undefined) ??
        ((gamesRoot as Record<string, unknown>).matches as unknown[] | undefined))
      : undefined) ??
    (Array.isArray(root.matches) ? root.matches : undefined) ??
    []

  const normalizedPuuid = puuid.toLowerCase()
  const rows: PlayerCareerSnapshot['recentMatches'] = []
  for (const entry of games) {
    if (rows.length >= 10) break
    const game = entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : {}
    const participants = Array.isArray(game.participants) ? game.participants : []
    const participantPuuidMap = buildParticipantPuuidMap(game.participantIdentities)
    const me = participants.find((p) => {
      if (!p || typeof p !== 'object') return false
      const row = p as Record<string, unknown>
      const candidatePuuid = getParticipantPuuid(row, participantPuuidMap)
      return !!candidatePuuid && candidatePuuid === normalizedPuuid
    }) as Record<string, unknown> | undefined
    if (!me) continue
    const stats =
      me?.stats && typeof me.stats === 'object' ? (me.stats as Record<string, unknown>) : (me ?? {})

    const kills = toNum(stats.kills) ?? null
    const deaths = toNum(stats.deaths) ?? null
    const assists = toNum(stats.assists) ?? null
    const kda =
      kills == null || deaths == null || assists == null
        ? null
        : deaths === 0
          ? kills + assists
          : (kills + assists) / deaths

    const winValue = stats.win
    const win =
      typeof winValue === 'boolean'
        ? winValue
        : typeof winValue === 'number'
          ? winValue > 0
          : typeof winValue === 'string'
            ? winValue.toLowerCase() === 'win' || winValue.toLowerCase() === 'true'
            : null

    rows.push({
      gameId: toInt(game.gameId),
      queueId: toInt(game.queueId),
      championId: toInt(me?.championId ?? stats.championId),
      win,
      kills,
      deaths,
      assists,
      kda,
      gameCreation: toNum(game.gameCreation),
      gameDuration: toNum(game.gameDuration),
    })
  }

  return rows
}

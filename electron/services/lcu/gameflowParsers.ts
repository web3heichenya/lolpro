import type { LcuStatus } from '../../../shared/contracts'

function toInt(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value)
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return Math.trunc(parsed)
  }
  return undefined
}

type SessionTeamPlayer = NonNullable<LcuStatus['champSelectSession']>['myTeam'][number]

function parseSessionTeamPlayers(payload: unknown): SessionTeamPlayer[] {
  if (!Array.isArray(payload)) return []
  return payload
    .map((entry) => {
      const row = entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : {}
      const championId =
        toInt(row.championId ?? row.selectedChampionId ?? row.characterId ?? row.pickChampionId) ?? undefined
      const championPickIntent = toInt(row.championPickIntent ?? row.hoverChampionId ?? row.intentChampionId)
      const puuid =
        typeof row.puuid === 'string'
          ? row.puuid
          : row.player &&
              typeof row.player === 'object' &&
              typeof (row.player as Record<string, unknown>).puuid === 'string'
            ? ((row.player as Record<string, unknown>).puuid as string)
            : undefined
      return {
        cellId: toInt(row.cellId ?? row.participantId ?? row.playerId),
        puuid,
        championId: championId && championId > 0 ? championId : undefined,
        championPickIntent: championPickIntent && championPickIntent > 0 ? championPickIntent : undefined,
        assignedPosition:
          typeof row.assignedPosition === 'string'
            ? row.assignedPosition
            : typeof row.position === 'string'
              ? row.position
              : typeof row.role === 'string'
                ? row.role
                : undefined,
      }
    })
    .filter((row) => !!row.championId || !!row.puuid || row.cellId != null)
}

type ParsedGameflowTeam = {
  team: string
  players: SessionTeamPlayer[]
}

function normalizeTeamToken(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) return String(Math.trunc(value))
  if (typeof value === 'string' && value.trim()) return value.trim().toUpperCase()
  return null
}

function parseGameflowTeamsFromSelections(payload: unknown): ParsedGameflowTeam[] {
  if (!Array.isArray(payload)) return []
  const map = new Map<string, SessionTeamPlayer[]>()

  for (const entry of payload) {
    if (!entry || typeof entry !== 'object') continue
    const row = entry as Record<string, unknown>
    const team = normalizeTeamToken(row.team ?? row.teamId ?? row.teamIndex)
    if (!team) continue

    const player: SessionTeamPlayer = {
      cellId: toInt(row.cellId ?? row.participantId ?? row.playerId),
      puuid:
        typeof row.puuid === 'string'
          ? row.puuid
          : row.player &&
              typeof row.player === 'object' &&
              typeof (row.player as Record<string, unknown>).puuid === 'string'
            ? ((row.player as Record<string, unknown>).puuid as string)
            : undefined,
      championId:
        toInt(row.championId ?? row.selectedChampionId ?? row.characterId ?? row.pickChampionId) ?? undefined,
      championPickIntent: undefined,
      assignedPosition:
        typeof row.assignedPosition === 'string'
          ? row.assignedPosition
          : typeof row.position === 'string'
            ? row.position
            : typeof row.role === 'string'
              ? row.role
              : undefined,
    }

    if (!player.championId && !player.puuid && player.cellId == null) continue
    const players = map.get(team) ?? []
    players.push(player)
    map.set(team, players)
  }

  return Array.from(map.entries()).map(([team, players]) => ({ team, players }))
}

function groupLooksLikeMyTeam(group: SessionTeamPlayer[], selfPuuidLower?: string): boolean {
  if (!selfPuuidLower) return false
  return group.some((player) => player.puuid?.toLowerCase() === selfPuuidLower)
}

function toGameflowTeamSession(
  payload: unknown,
  selfPuuid?: string,
): LcuStatus['champSelectSession'] | undefined {
  if (!payload || typeof payload !== 'object') return undefined
  const root = payload as Record<string, unknown>
  const gameData =
    root.gameData && typeof root.gameData === 'object' ? (root.gameData as Record<string, unknown>) : null
  if (!gameData) return undefined

  const selfPuuidLower = selfPuuid?.toLowerCase()

  const teamOne = parseSessionTeamPlayers(gameData.teamOne)
  const teamTwo = parseSessionTeamPlayers(gameData.teamTwo)
  if (teamOne.length || teamTwo.length) {
    const selfInTeamTwo = groupLooksLikeMyTeam(teamTwo, selfPuuidLower)
    return {
      localPlayerCellId: undefined,
      myTeam: selfInTeamTwo ? teamTwo : teamOne,
      theirTeam: selfInTeamTwo ? teamOne : teamTwo,
    }
  }

  const grouped = parseGameflowTeamsFromSelections(gameData.playerChampionSelections)
  if (!grouped.length) return undefined

  const myGroup =
    grouped.find((group) => groupLooksLikeMyTeam(group.players, selfPuuidLower)) ??
    grouped.sort((a, b) => b.players.length - a.players.length)[0]
  const theirPlayers = grouped.filter((group) => group !== myGroup).flatMap((group) => group.players)

  return {
    localPlayerCellId: undefined,
    myTeam: myGroup?.players ?? [],
    theirTeam: theirPlayers,
  }
}

export function parseGameflowSession(
  payload: unknown,
  options?: { selfPuuid?: string },
): LcuStatus['champSelectSession'] | undefined {
  return toGameflowTeamSession(payload, options?.selfPuuid)
}

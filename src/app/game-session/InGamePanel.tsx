import { useEffect, useMemo, useRef, useState } from 'react'
import { Shield, Users } from 'lucide-react'

import type { ChampionSummary, GameContext, PlayerCareerSnapshot, SummonerInfo } from '@/app/types'
import { useI18n } from '@/app/i18n'
import { TeamCard } from '@/app/game-session/team-card'
import { PlayerCareerSheet, type CareerDrawerState } from '@/app/game-session/player-career-sheet'
import type { TeamPlayerRow } from '@/app/game-session/types'

type Props = {
  champions: ChampionSummary[]
  gameContext: GameContext | null
  onOpenChampion: (championId: string) => void
  onLoadPlayerCareer: (puuid: string) => Promise<PlayerCareerSnapshot>
  onLoadSummonerByPuuid: (puuid: string) => Promise<SummonerInfo | null>
}

function resolvePickState(championId?: number, championPickIntent?: number): TeamPlayerRow['pickState'] {
  if (championId && championId > 0) return 'locked'
  if (championPickIntent && championPickIntent > 0) return 'hover'
  return 'pending'
}

function normalizeName(value?: string | null): string {
  return (value ?? '').trim().toLowerCase()
}

function pickPreferredTeamRows(params: {
  sessionRows: TeamPlayerRow[]
  liveRows: TeamPlayerRow[]
}): TeamPlayerRow[] {
  const { sessionRows, liveRows } = params
  if (liveRows.length > sessionRows.length) return liveRows
  if (sessionRows.length > liveRows.length) return sessionRows

  const sessionWithPuuid = sessionRows.reduce((acc, row) => acc + (row.puuid ? 1 : 0), 0)
  const liveWithPuuid = liveRows.reduce((acc, row) => acc + (row.puuid ? 1 : 0), 0)
  if (liveWithPuuid > sessionWithPuuid) return liveRows
  return sessionRows
}

export function InGamePanel({
  champions,
  gameContext,
  onOpenChampion,
  onLoadPlayerCareer,
  onLoadSummonerByPuuid,
}: Props) {
  const { t } = useI18n()
  const [career, setCareer] = useState<CareerDrawerState>({
    open: false,
    loading: false,
    error: null,
    puuid: null,
    fallbackName: null,
    data: null,
  })

  const championMap = useMemo(() => {
    const map = new Map<string, ChampionSummary>()
    for (const champion of champions) map.set(champion.id, champion)
    return map
  }, [champions])

  const session = gameContext?.lcu.champSelectSession
  const livePlayers = gameContext?.live.allPlayers ?? []
  const selfPuuid = gameContext?.lcu.summoner?.puuid
  const selfName =
    gameContext?.lcu.summoner?.gameName ??
    gameContext?.lcu.summoner?.displayName ??
    t('sidebar.player.unknown')
  const [summonerNameByPuuid, setSummonerNameByPuuid] = useState<Record<string, string>>({})
  const loadingNamePuuids = useRef<Set<string>>(new Set())

  useEffect(() => {
    const puuidSet = new Set<string>()
    for (const p of session?.myTeam ?? []) {
      if (p.puuid) puuidSet.add(p.puuid)
    }
    for (const p of session?.theirTeam ?? []) {
      if (p.puuid) puuidSet.add(p.puuid)
    }

    for (const puuid of puuidSet) {
      if (summonerNameByPuuid[puuid]) continue
      if (loadingNamePuuids.current.has(puuid)) continue
      loadingNamePuuids.current.add(puuid)
      void onLoadSummonerByPuuid(puuid)
        .then((summoner) => {
          const name = summoner?.gameName ?? summoner?.displayName
          if (!name) return
          setSummonerNameByPuuid((prev) => (prev[puuid] ? prev : { ...prev, [puuid]: name }))
        })
        .finally(() => {
          loadingNamePuuids.current.delete(puuid)
        })
    }
  }, [onLoadSummonerByPuuid, session?.myTeam, session?.theirTeam, summonerNameByPuuid])

  const sessionMyTeam: TeamPlayerRow[] = session?.myTeam?.length
    ? session.myTeam.map((player, index) => {
        const championId =
          player.championId && player.championId > 0 ? player.championId : player.championPickIntent
        const isSelf = player.puuid && selfPuuid ? player.puuid === selfPuuid : false
        return {
          key: `my-${player.cellId ?? index}`,
          puuid: player.puuid,
          championId: championId ? String(championId) : undefined,
          summonerName:
            (player.puuid ? summonerNameByPuuid[player.puuid] : undefined) ??
            (isSelf ? selfName : t('ingame.player.unknown', { index: index + 1 })),
          assignedPosition: player.assignedPosition,
          pickState: resolvePickState(player.championId, player.championPickIntent),
          isSelf,
        }
      })
    : []

  const sessionEnemyTeam: TeamPlayerRow[] = session?.theirTeam?.length
    ? session.theirTeam.map((player, index) => {
        const championId =
          player.championId && player.championId > 0 ? player.championId : player.championPickIntent
        return {
          key: `enemy-${player.cellId ?? index}`,
          puuid: player.puuid,
          championId: championId ? String(championId) : undefined,
          summonerName:
            (player.puuid ? summonerNameByPuuid[player.puuid] : undefined) ??
            t('ingame.player.enemy', { index: index + 1 }),
          assignedPosition: player.assignedPosition,
          pickState: resolvePickState(player.championId, player.championPickIntent),
        }
      })
    : []

  const liveTeams = (() => {
    if (gameContext?.lcu.phase !== 'InProgress') return { myTeam: [], enemyTeam: [] }
    if (!livePlayers.length) return { myTeam: [], enemyTeam: [] }

    const selfCandidates = new Set(
      [
        normalizeName(gameContext?.live.activePlayerName),
        normalizeName(gameContext?.lcu.summoner?.gameName),
        normalizeName(gameContext?.lcu.summoner?.displayName),
      ].filter(Boolean),
    )

    const normalizedPlayers = livePlayers.map((player) => ({
      ...player,
      team: (player.team ?? '').trim().toUpperCase(),
      normalizedName: normalizeName(player.summonerName),
    }))

    let selfTeam =
      normalizedPlayers.find((player) => player.normalizedName && selfCandidates.has(player.normalizedName))
        ?.team ?? ''

    if (!selfTeam && gameContext?.detectedChampionId) {
      selfTeam =
        normalizedPlayers.find((player) => Number(player.championId) === gameContext.detectedChampionId)
          ?.team ?? ''
    }

    if (!selfTeam) return { myTeam: [], enemyTeam: [] }

    const myPlayers = normalizedPlayers.filter((player) => player.team === selfTeam)
    const enemyPlayers = normalizedPlayers.filter((player) => !!player.team && player.team !== selfTeam)

    const myTeamRows: TeamPlayerRow[] = myPlayers.map((player, index) => {
      const isSelf = player.normalizedName ? selfCandidates.has(player.normalizedName) : false
      return {
        key: `live-my-${index}-${player.normalizedName || 'unknown'}`,
        puuid: undefined,
        championId: player.championId ? String(player.championId) : undefined,
        summonerName:
          player.summonerName ?? (isSelf ? selfName : t('ingame.player.unknown', { index: index + 1 })),
        assignedPosition: undefined,
        pickState: 'locked',
        isSelf,
      }
    })

    const enemyTeamRows: TeamPlayerRow[] = enemyPlayers.map((player, index) => ({
      key: `live-enemy-${index}-${player.normalizedName || 'unknown'}`,
      puuid: undefined,
      championId: player.championId ? String(player.championId) : undefined,
      summonerName: player.summonerName ?? t('ingame.player.enemy', { index: index + 1 }),
      assignedPosition: undefined,
      pickState: 'locked',
    }))

    return { myTeam: myTeamRows, enemyTeam: enemyTeamRows }
  })()

  const hasSessionTeams = sessionMyTeam.length > 0 || sessionEnemyTeam.length > 0
  const hasLiveTeams = liveTeams.myTeam.length > 0 || liveTeams.enemyTeam.length > 0
  const inProgress = gameContext?.lcu.phase === 'InProgress'

  const myTeam = inProgress
    ? pickPreferredTeamRows({ sessionRows: sessionMyTeam, liveRows: liveTeams.myTeam })
    : !hasSessionTeams && hasLiveTeams
      ? liveTeams.myTeam
      : sessionMyTeam

  const enemyTeam = inProgress
    ? pickPreferredTeamRows({ sessionRows: sessionEnemyTeam, liveRows: liveTeams.enemyTeam })
    : !hasSessionTeams && hasLiveTeams
      ? liveTeams.enemyTeam
      : sessionEnemyTeam

  async function openCareerDrawer(player: TeamPlayerRow) {
    if (!player.puuid) return
    setCareer({
      open: true,
      loading: true,
      error: null,
      puuid: player.puuid,
      fallbackName: player.summonerName,
      data: null,
    })

    try {
      const data = await onLoadPlayerCareer(player.puuid)
      setCareer({
        open: true,
        loading: false,
        error: null,
        puuid: player.puuid,
        fallbackName: player.summonerName,
        data,
      })
    } catch (error) {
      setCareer({
        open: true,
        loading: false,
        error: error instanceof Error ? error.message : String(error),
        puuid: player.puuid,
        fallbackName: player.summonerName,
        data: null,
      })
    }
  }

  return (
    <>
      <div className="space-y-4">
        <div className="grid gap-4 xl:grid-cols-2">
          <TeamCard
            title={t('ingame.card.team')}
            icon={<Users className="size-4 text-brand" />}
            players={myTeam}
            championMap={championMap}
            emptyText={t('ingame.team.empty')}
            onOpenChampion={onOpenChampion}
            onOpenCareer={openCareerDrawer}
            t={t}
          />

          <TeamCard
            title={t('ingame.card.enemy')}
            icon={<Shield className="size-4 text-brand" />}
            players={enemyTeam}
            championMap={championMap}
            emptyText={t('ingame.team.enemyEmpty')}
            onOpenChampion={onOpenChampion}
            onOpenCareer={openCareerDrawer}
            t={t}
          />
        </div>
      </div>

      <PlayerCareerSheet
        state={career}
        championMap={championMap}
        onOpenChange={(open) => setCareer((prev) => ({ ...prev, open }))}
        t={t}
      />
    </>
  )
}

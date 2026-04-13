import type { ReactNode } from 'react'
import type { ChampionSummary } from '@/app/types'
import { fallbackChar } from '@/app/main/utils'
import { cn } from '@/lib/utils'
import type { TeamPlayerRow } from '@/app/game-session/types'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function pickStateBadgeClass(pickState: TeamPlayerRow['pickState']) {
  if (pickState === 'locked') return 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
  if (pickState === 'hover') return 'bg-amber-500/20 text-amber-300 border-amber-400/30'
  return 'bg-secondary text-muted-foreground'
}

const interactiveTextClass =
  'rounded-sm px-1 -mx-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60'

export function TeamCard({
  title,
  icon,
  players,
  championMap,
  emptyText,
  onOpenChampion,
  onOpenCareer,
  t,
}: {
  title: string
  icon: ReactNode
  players: TeamPlayerRow[]
  championMap: Map<string, ChampionSummary>
  emptyText: string
  onOpenChampion: (championId: string) => void
  onOpenCareer: (player: TeamPlayerRow) => void
  t: (key: string, params?: Record<string, string | number | null | undefined>) => string
}) {
  return (
    <Card className="detail-surface overflow-hidden rounded-3xl">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {players.length ? (
          players.map((player) => {
            const champion = player.championId ? (championMap.get(player.championId) ?? null) : null
            const championLabel = champion?.name ?? t('ingame.pick.none')
            return (
              <div
                key={player.key}
                className="surface-unified flex items-center justify-between gap-3 rounded-2xl border px-3 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <button
                    type="button"
                    className="shrink-0"
                    onClick={() => (player.championId ? onOpenChampion(player.championId) : undefined)}
                  >
                    <Avatar className="size-10 border border-border/50 bg-background/40">
                      <AvatarImage src={champion?.iconUrl} alt={championLabel} />
                      <AvatarFallback>{fallbackChar(championLabel)}</AvatarFallback>
                    </Avatar>
                  </button>

                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <button
                        type="button"
                        className={cn(
                          'truncate text-sm font-medium',
                          player.championId &&
                            `${interactiveTextClass} cursor-pointer hover:bg-secondary/60 hover:text-foreground hover:underline hover:underline-offset-4`,
                        )}
                        onClick={() => (player.championId ? onOpenChampion(player.championId) : undefined)}
                      >
                        {championLabel}
                      </button>
                      {player.puuid ? (
                        <button
                          type="button"
                          className={cn(
                            'truncate text-xs text-muted-foreground',
                            `${interactiveTextClass} cursor-pointer hover:bg-secondary/60 hover:text-foreground hover:underline hover:underline-offset-4`,
                          )}
                          onClick={() => void onOpenCareer(player)}
                        >
                          {player.isSelf ? t('ingame.team.self') : player.summonerName}
                        </button>
                      ) : (
                        <span className="truncate text-xs text-muted-foreground">
                          {player.isSelf ? t('ingame.team.self') : player.summonerName}
                        </span>
                      )}
                    </div>
                    {player.assignedPosition ? (
                      <div className="text-[11px] text-muted-foreground">{player.assignedPosition}</div>
                    ) : null}
                  </div>
                </div>

                <Badge variant="outline" className={cn('border', pickStateBadgeClass(player.pickState))}>
                  {t(`ingame.pick.${player.pickState}`)}
                </Badge>
              </div>
            )
          })
        ) : (
          <div className="text-sm text-muted-foreground">{emptyText}</div>
        )}
      </CardContent>
    </Card>
  )
}

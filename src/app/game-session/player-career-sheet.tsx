import type { ChampionSummary, PlayerCareerSnapshot } from '@/app/types'
import { fallbackChar } from '@/app/main/utils'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetClose, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { X } from 'lucide-react'

type CareerDrawerState = {
  open: boolean
  loading: boolean
  error: string | null
  puuid: string | null
  fallbackName: string | null
  data: PlayerCareerSnapshot | null
}

function profileIconUrl(profileIconId: number | undefined) {
  if (!profileIconId) return null
  return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${profileIconId}.jpg`
}

function fmtKda(v: number | null | undefined) {
  if (v == null || !Number.isFinite(v)) return '-'
  return v.toFixed(2)
}

export function PlayerCareerSheet({
  state,
  championMap,
  onOpenChange,
  t,
}: {
  state: CareerDrawerState
  championMap: Map<string, ChampionSummary>
  onOpenChange: (open: boolean) => void
  t: (key: string, params?: Record<string, string | number | null | undefined>) => string
}) {
  const careerName =
    state.data?.summoner?.gameName ?? state.data?.summoner?.displayName ?? state.fallbackName ?? '-'
  const careerTag = state.data?.summoner?.tagLine ? `#${state.data.summoner.tagLine}` : null

  return (
    <Sheet open={state.open} onOpenChange={onOpenChange}>
      <SheetContent className="min-w-0 w-[420px] max-w-[calc(100vw-2.5rem)] overflow-x-hidden">
        <div className="border-b border-border/60 px-5 py-5">
          <div className="app-drag flex h-12 items-center justify-between gap-3">
            <SheetTitle className="truncate font-display text-xl font-semibold tracking-tight">
              {t('ingame.career.title')}
            </SheetTitle>
            <div className="app-no-drag flex items-center justify-end gap-2">
              <SheetClose asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className="rounded-2xl"
                  aria-label={t('common.close')}
                >
                  <X />
                </Button>
              </SheetClose>
            </div>
          </div>
        </div>

        <div className="p-5">
          <div className="surface-unified flex items-center gap-3 rounded-2xl border p-3">
            <Avatar className="size-12 border border-border/55 bg-background/45">
              <AvatarImage
                src={profileIconUrl(state.data?.summoner?.profileIconId) ?? undefined}
                alt={careerName}
              />
              <AvatarFallback>{fallbackChar(careerName)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="truncate text-base font-semibold">
                {careerName}
                {careerTag ? <span className="ml-1 text-sm text-muted-foreground">{careerTag}</span> : null}
              </div>
              <div className="truncate text-xs text-muted-foreground">{t('ingame.career.recentMatches')}</div>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 px-5 pb-5">
          <ScrollArea className="h-full">
            <div className="space-y-2 pr-2">
              {state.loading ? (
                Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-2xl" />)
              ) : state.error ? (
                <div className="text-sm text-destructive">{state.error}</div>
              ) : state.data?.recentMatches.length ? (
                state.data.recentMatches.map((match, idx) => {
                  const champion = match.championId ? championMap.get(String(match.championId)) : null
                  return (
                    <div
                      key={`${match.gameId ?? idx}`}
                      className="surface-unified flex items-center justify-between rounded-2xl border px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {champion?.name ??
                            (match.championId ? t('ingame.match.champion', { id: match.championId }) : '-')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {match.kills ?? '-'} / {match.deaths ?? '-'} / {match.assists ?? '-'} · KDA{' '}
                          {fmtKda(match.kda)}
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          match.win == null
                            ? 'bg-secondary text-muted-foreground'
                            : match.win
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                              : 'bg-red-500/20 text-red-300 border-red-400/30'
                        }
                      >
                        {match.win == null ? '-' : match.win ? t('ingame.match.win') : t('ingame.match.loss')}
                      </Badge>
                    </div>
                  )
                })
              ) : (
                <div className="text-sm text-muted-foreground">{t('ingame.career.empty')}</div>
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export type { CareerDrawerState }

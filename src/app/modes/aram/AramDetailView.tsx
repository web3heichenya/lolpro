import { RefreshCw, Swords } from 'lucide-react'

import type { BuildResult, ChampionProfile, ChampionSummary } from '@/app/types'
import { fmtPct } from '@/app/main/utils'
import { useI18n } from '@/app/i18n'
import { HeroBannerProfile } from '@/app/modes/components/HeroBannerProfile'
import { HeroBasicsPanel } from '@/app/modes/components/HeroBasicsPanel'
import { BuildItemsCard } from '@/app/modes/components/BuildItemsCard'
import { BuildRunesCard } from '@/app/modes/components/BuildRunesCard'
import { BuildSkillsCard } from '@/app/modes/components/BuildSkillsCard'
import { BuildSummonerSpellsCard } from '@/app/modes/components/BuildSummonerSpellsCard'
import { BuildSynergiesCard } from '@/app/modes/components/BuildSynergiesCard'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'

type Props = {
  champions: ChampionSummary[]
  selectedChampion: ChampionSummary | null
  championProfile: ChampionProfile | null
  build: BuildResult | null
  gameRelated: boolean
  loading: boolean
  refreshing: boolean
  selectedId: string | null
  showAllAugments: boolean
  onToggleShowAllAugments: () => void
  onRefreshBuild: (championId: string) => Promise<void>
}

export function AramDetailView({
  champions,
  selectedChampion,
  championProfile,
  build,
  loading,
  refreshing,
  selectedId,
  onRefreshBuild,
}: Props) {
  const { t } = useI18n()

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4">
        <Card className="detail-surface overflow-hidden rounded-3xl">
          <CardContent className="relative flex flex-col justify-end px-6 py-5 lg:py-6">
            <div className="flex flex-col gap-3">
              <HeroBannerProfile champion={selectedChampion} profile={championProfile} build={build} />

              <div className="flex flex-wrap items-center gap-2">
                {build?.summary?.winRate != null ? (
                  <Badge variant="secondary" className="h-8 rounded-full px-3 text-xs">
                    {t('detail.summary.winRate')} {fmtPct(build.summary.winRate)}
                  </Badge>
                ) : null}
                {build?.summary?.pickRate != null ? (
                  <Badge variant="secondary" className="h-8 rounded-full px-3 text-xs">
                    {t('detail.summary.pickRate')} {fmtPct(build.summary.pickRate)}
                  </Badge>
                ) : null}
                {build?.summary?.banRate != null ? (
                  <Badge variant="secondary" className="h-8 rounded-full px-3 text-xs">
                    {t('detail.summary.banRate')} {fmtPct(build.summary.banRate)}
                  </Badge>
                ) : null}
                {build?.summary?.kda != null ? (
                  <Badge variant="secondary" className="h-8 rounded-full px-3 text-xs">
                    KDA {build.summary.kda.toFixed(2)}
                  </Badge>
                ) : null}
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8 rounded-full px-3 text-xs"
                  aria-label={t('detail.refreshBuild')}
                  disabled={loading || refreshing || !selectedId}
                  onClick={() => (selectedId ? void onRefreshBuild(selectedId) : undefined)}
                >
                  Patch {build?.patch ?? '-'}
                  {loading ? (
                    <Skeleton className="ml-1 size-4 rounded-full" />
                  ) : (
                    <RefreshCw className={refreshing ? 'ml-1 size-4 animate-spin' : 'ml-1 size-4'} />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="space-y-4">
            <Card className="detail-surface overflow-hidden rounded-3xl">
              <CardContent className="space-y-4 p-4 pt-4">
                <Skeleton className="h-8 w-28 rounded-xl" />
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 rounded-2xl" />
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="detail-surface overflow-hidden rounded-3xl">
              <CardContent className="space-y-4 p-4 pt-4">
                <Skeleton className="h-8 w-24 rounded-xl" />
                <div className="space-y-3">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 rounded-2xl" />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : build ? (
          <div className="space-y-6">
            <BuildItemsCard build={build} />
            <BuildSkillsCard build={build} />
            {build.mode === 'aram' || build.mode === 'ranked' ? (
              <>
                <BuildSummonerSpellsCard build={build} />
                <BuildRunesCard build={build} />
              </>
            ) : null}
            <BuildSynergiesCard build={build} champions={champions} />
            <HeroBasicsPanel profile={championProfile} />
          </div>
        ) : (
          <Card className="detail-surface overflow-hidden rounded-3xl">
            <CardContent className="p-4 pt-4">
              <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                <div className="grid size-14 place-items-center rounded-3xl border border-border/50 bg-background/40">
                  <Swords className="size-5 text-muted-foreground" />
                </div>
                <div className="max-w-md text-sm text-muted-foreground">{t('detail.noData')}</div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ScrollArea>
  )
}

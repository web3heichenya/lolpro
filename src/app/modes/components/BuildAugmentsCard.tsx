import { useMemo, useState } from 'react'

import type { AugmentRecommendation, BuildResult } from '@/app/types'
import { pct } from '@/app/format'
import { useI18n } from '@/app/i18n'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

type Props = {
  build: BuildResult
  showAllAugments: boolean
  onToggleShowAllAugments: () => void
}

type AugmentTab = 'prismatic' | 'gold' | 'silver'

function byRarity(items: AugmentRecommendation[]) {
  return {
    prismatic: items.filter((a) => a.rarity === 'kPrismatic'),
    gold: items.filter((a) => a.rarity === 'kGold'),
    silver: items.filter((a) => a.rarity === 'kSilver' || !a.rarity),
  }
}

function aramAugmentGrade(tier: number | null | undefined): string | null {
  if (typeof tier !== 'number' || !Number.isFinite(tier) || tier < 0) return null
  // OP.GG aram-mayhem uses numeric tiers starting at 0.
  // Map best-effort to visual grades.
  const map = ['S', 'A', 'B', 'C', 'D', 'F']
  return map[tier] ?? null
}

export function BuildAugmentsCard({ build, showAllAugments, onToggleShowAllAugments }: Props) {
  const { t } = useI18n()
  const grouped = useMemo(() => byRarity(build.augments), [build.augments])
  const [tab, setTab] = useState<AugmentTab>('prismatic')

  const activeTab: AugmentTab = grouped[tab].length
    ? tab
    : grouped.prismatic.length
      ? 'prismatic'
      : grouped.gold.length
        ? 'gold'
        : 'silver'
  const currentItems = grouped[activeTab]

  function renderTab(items: AugmentRecommendation[], label: string) {
    const visibleItems = showAllAugments ? items : items.slice(0, 30)
    if (!visibleItems.length) {
      return <div className="text-sm text-muted-foreground">{t('panel.augments.empty', { label })}</div>
    }
    return (
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {visibleItems.map((augment) => {
          const title = augment.name ?? t('hex.augmentFallback', { id: augment.augmentId })
          const grade = build.mode === 'aram-mayhem' ? aramAugmentGrade(augment.tier) : null
          return (
            <div
              key={augment.augmentId}
              className="flex items-center justify-between gap-3 rounded-3xl border border-border/50 bg-background/40 p-3"
            >
              <div className="flex min-w-0 items-center gap-2">
                <Avatar className="size-10 border border-border/50 bg-muted/30">
                  <AvatarImage src={augment.iconUrl} alt={title} className="object-cover" loading="lazy" />
                  <AvatarFallback className="text-[10px] text-muted-foreground">#</AvatarFallback>
                </Avatar>
                <div className="truncate text-sm font-semibold">{title}</div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {build.mode === 'aram-mayhem' ? (
                  grade ? (
                    <Badge variant="secondary" className="rounded-full">
                      {t('panel.augments.grade')} {grade}
                    </Badge>
                  ) : null
                ) : (
                  <Badge variant="secondary" className="rounded-full">
                    WR {pct(augment.winRate)}
                  </Badge>
                )}
                <Badge variant="secondary" className="rounded-full">
                  PR {pct(augment.pickRate)}
                </Badge>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <Card className="detail-surface overflow-hidden rounded-3xl">
      <CardContent className="space-y-4 p-4 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-semibold">{t('panel.augments')}</div>
          {currentItems.length > 30 ? (
            <Button variant="secondary" size="sm" onClick={onToggleShowAllAugments}>
              {showAllAugments ? t('panel.augments.showLess') : t('panel.augments.showMore')}
            </Button>
          ) : null}
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setTab(value as AugmentTab)}>
          <TabsList className="rounded-2xl">
            <TabsTrigger value="prismatic">
              {t('panel.augments.prismatic')} ({grouped.prismatic.length})
            </TabsTrigger>
            <TabsTrigger value="gold">
              {t('panel.augments.gold')} ({grouped.gold.length})
            </TabsTrigger>
            <TabsTrigger value="silver">
              {t('panel.augments.silver')} ({grouped.silver.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="prismatic" className="mt-4">
            {renderTab(grouped.prismatic, t('panel.augments.prismatic'))}
          </TabsContent>
          <TabsContent value="gold" className="mt-4">
            {renderTab(grouped.gold, t('panel.augments.gold'))}
          </TabsContent>
          <TabsContent value="silver" className="mt-4">
            {renderTab(grouped.silver, t('panel.augments.silver'))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

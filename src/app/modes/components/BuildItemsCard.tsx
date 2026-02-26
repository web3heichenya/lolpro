import { useMemo } from 'react'

import { compareItemsByCompositeScore } from '@shared/itemSort'
import type { BuildResult, ItemRecommendation, StartingItemsRecommendation } from '@/app/types'
import { fmtPct } from '@/app/main/utils'
import { useI18n } from '@/app/i18n'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

type Props = {
  build: BuildResult
}

function ItemComboList({
  combos,
  emptyText,
  showItemNames = false,
}: {
  combos: StartingItemsRecommendation[]
  emptyText: string
  showItemNames?: boolean
}) {
  if (!combos.length) {
    return <div className="text-sm text-muted-foreground">{emptyText}</div>
  }
  const orderedCombos = [...combos].sort(compareItemsByCompositeScore)

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {orderedCombos.map((combo, idx) => (
        <div
          key={idx}
          className="flex items-center justify-between gap-3 rounded-3xl border border-border/50 bg-background/40 p-3"
        >
          <div className="min-w-0 flex flex-1 items-center gap-2">
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {(combo.items ?? []).map((item) => (
                <Avatar key={item.id} className="size-10 border border-border/50 bg-muted/30">
                  <AvatarImage
                    src={item.iconUrl}
                    alt={item.name ?? String(item.id)}
                    className="object-cover"
                    loading="lazy"
                  />
                  <AvatarFallback className="text-[10px] text-muted-foreground">#</AvatarFallback>
                </Avatar>
              ))}
            </div>
            {showItemNames ? (
              <div className="min-w-0 truncate text-sm font-medium text-foreground/85">
                {(combo.items ?? []).map((item) => item.name ?? String(item.id)).join(' · ')}
              </div>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <Badge variant="secondary" className="rounded-full">
              PR {fmtPct(combo.pickRate)}
            </Badge>
            <Badge variant="secondary" className="rounded-full">
              WR {fmtPct(combo.winRate)}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  )
}

function SituationalItemList({ items }: { items: ItemRecommendation[] }) {
  const { t } = useI18n()
  if (!items.length) {
    return <div className="text-sm text-muted-foreground">{t('panel.items.situationalEmpty')}</div>
  }
  const orderedItems = [...items].sort(compareItemsByCompositeScore)

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {orderedItems.map((item) => (
        <div
          key={item.itemId}
          className="flex items-center justify-between gap-3 rounded-3xl border border-border/50 bg-background/40 p-3"
        >
          <div className="min-w-0 flex flex-1 items-center gap-2">
            <Avatar className="size-10 border border-border/50 bg-muted/30">
              <AvatarImage
                src={item.iconUrl}
                alt={item.name ?? String(item.itemId)}
                className="object-cover"
                loading="lazy"
              />
              <AvatarFallback className="text-[10px] text-muted-foreground">#</AvatarFallback>
            </Avatar>
            <div className="min-w-0 truncate text-sm font-medium text-foreground/85">
              {item.name ?? t('items.fallback', { id: item.itemId })}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <Badge variant="secondary" className="rounded-full">
              PR {fmtPct(item.pickRate)}
            </Badge>
            <Badge variant="secondary" className="rounded-full">
              WR {fmtPct(item.winRate)}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  )
}

export function BuildItemsCard({ build }: Props) {
  const { t } = useI18n()
  const isArena = build.mode === 'arena'
  const situationalItems = useMemo<ItemRecommendation[]>(() => {
    const ids = build.situationalItems ?? []
    const itemMap = new Map((build.items ?? []).map((item) => [String(item.itemId), item]))
    const seen = new Set<string>()

    return ids
      .map((id) => String(id))
      .filter((id) => {
        if (seen.has(id)) return false
        seen.add(id)
        return true
      })
      .map((id) => {
        const fromBuild = itemMap.get(id)
        if (fromBuild) return fromBuild
        return {
          itemId: id,
          tier: null,
          pickRate: null,
          winRate: null,
          games: null,
          name: t('items.fallback', { id }),
          description: undefined,
          iconUrl: `https://ddragon.leagueoflegends.com/cdn/${build.patch}/img/item/${id}.png`,
          averageIndex: null,
        }
      })
      .sort(compareItemsByCompositeScore)
  }, [build.items, build.patch, build.situationalItems, t])

  return (
    <Card className="detail-surface overflow-hidden rounded-3xl">
      <CardContent className="space-y-4 p-4 pt-4">
        <div className="text-sm font-semibold">{t('panel.items')}</div>

        <Tabs defaultValue="starting">
          <TabsList className="rounded-2xl">
            {isArena ? <TabsTrigger value="prismatic">{t('panel.items.prismatic')}</TabsTrigger> : null}
            <TabsTrigger value="starting">{t('panel.items.starting')}</TabsTrigger>
            <TabsTrigger value="core">{t('panel.items.core')}</TabsTrigger>
            <TabsTrigger value="boots">{t('panel.items.boots')}</TabsTrigger>
            <TabsTrigger value="situational">{t('panel.items.situational')}</TabsTrigger>
          </TabsList>

          {isArena ? (
            <TabsContent value="prismatic" className="mt-4">
              <ItemComboList
                combos={build.prismaticItems ?? []}
                emptyText={t('panel.items.empty')}
                showItemNames
              />
            </TabsContent>
          ) : null}

          <TabsContent value="starting" className="mt-4">
            <ItemComboList
              combos={build.startingItems ?? []}
              emptyText={t('panel.items.empty')}
              showItemNames
            />
          </TabsContent>

          <TabsContent value="core" className="mt-4">
            <ItemComboList combos={build.coreItems ?? []} emptyText={t('panel.items.empty')} />
          </TabsContent>

          <TabsContent value="boots" className="mt-4">
            <ItemComboList combos={build.bootsItems ?? []} emptyText={t('panel.items.empty')} showItemNames />
          </TabsContent>

          <TabsContent value="situational" className="mt-4">
            <SituationalItemList items={situationalItems} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

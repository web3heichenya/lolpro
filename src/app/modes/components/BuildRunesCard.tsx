import { useMemo } from 'react'

import type { BuildResult } from '@/app/types'
import { fmtPct } from '@/app/main/utils'
import { useI18n } from '@/app/i18n'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type Props = {
  build: BuildResult
}

type RuneEntry = NonNullable<BuildResult['runes']>[number]
type RunePerk = { id: number; name?: string; iconUrl?: string }

function RuneOverviewCard({ rune }: { rune: RuneEntry }) {
  const { t } = useI18n()

  return (
    <div className="rounded-2xl border border-border/50 bg-background/40 p-3">
      <div className="text-center text-xs text-muted-foreground">{t('panel.skills.runeOverview')}</div>

      <div className="mt-2 flex items-center gap-2">
        <Avatar className="size-8 border border-border/50 bg-muted/30">
          <AvatarImage
            src={rune.primaryStyleIconUrl}
            alt={rune.primaryStyleName ?? String(rune.primaryStyleId)}
            loading="lazy"
          />
          <AvatarFallback className="text-[10px] text-muted-foreground">{rune.primaryStyleId}</AvatarFallback>
        </Avatar>
        <Avatar className="size-8 border border-border/50 bg-muted/30">
          <AvatarImage
            src={rune.subStyleIconUrl}
            alt={rune.subStyleName ?? String(rune.subStyleId)}
            loading="lazy"
          />
          <AvatarFallback className="text-[10px] text-muted-foreground">{rune.subStyleId}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 text-sm font-medium text-foreground/90">
          <div className="truncate">
            {(rune.primaryStyleName ?? `#${rune.primaryStyleId}`) +
              ' + ' +
              (rune.subStyleName ?? `#${rune.subStyleId}`)}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="rounded-full">
          PR {fmtPct(rune.pickRate)}
        </Badge>
        <Badge variant="secondary" className="rounded-full">
          WR {fmtPct(rune.winRate)}
        </Badge>
        {rune.games != null ? (
          <Badge variant="secondary" className="rounded-full">
            {t('items.games')} {rune.games.toLocaleString()}
          </Badge>
        ) : null}
      </div>
    </div>
  )
}

function RunePerkCard({ title, perks }: { title: string; perks: RunePerk[] }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-background/40 p-3">
      <div className="text-center text-xs text-muted-foreground">{title}</div>
      <div className="mt-2 space-y-1.5">
        {perks.length ? (
          perks.map((perk) => (
            <div
              key={perk.id}
              className="flex items-center gap-2 rounded-xl border border-border/40 bg-background/35 px-2 py-1.5"
            >
              <Avatar className="size-8 border border-border/50 bg-muted/30">
                <AvatarImage src={perk.iconUrl} alt={perk.name ?? String(perk.id)} loading="lazy" />
                <AvatarFallback className="text-[10px] text-muted-foreground">{perk.id}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 truncate text-sm text-foreground/85">{perk.name ?? `#${perk.id}`}</div>
            </div>
          ))
        ) : (
          <div className="text-sm text-muted-foreground">-</div>
        )}
      </div>
    </div>
  )
}

export function BuildRunesCard({ build }: Props) {
  const { t } = useI18n()
  const runeGroups = useMemo(() => {
    const out = new Map<
      number,
      {
        styleId: number
        styleName: string
        styleIconUrl?: string
        runes: NonNullable<BuildResult['runes']>
      }
    >()

    for (const rune of build.runes ?? []) {
      const existing = out.get(rune.primaryStyleId)
      if (existing) {
        existing.runes.push(rune)
        continue
      }
      out.set(rune.primaryStyleId, {
        styleId: rune.primaryStyleId,
        styleName: rune.primaryStyleName ?? `#${rune.primaryStyleId}`,
        styleIconUrl: rune.primaryStyleIconUrl,
        runes: [rune],
      })
    }

    return Array.from(out.values()).sort((a, b) => {
      const aTop = a.runes.reduce((max, rune) => Math.max(max, rune.pickRate ?? -1), -1)
      const bTop = b.runes.reduce((max, rune) => Math.max(max, rune.pickRate ?? -1), -1)
      return bTop - aTop
    })
  }, [build.runes])

  return (
    <Card className="detail-surface overflow-hidden rounded-3xl">
      <CardContent className="space-y-4 p-4 pt-4">
        <div className="text-sm font-semibold">{t('panel.skills.runes')}</div>

        {runeGroups.length ? (
          <Tabs defaultValue={String(runeGroups[0]?.styleId)}>
            <TabsList className="max-w-full justify-start gap-1 overflow-x-auto rounded-2xl">
              {runeGroups.map((group) => (
                <TabsTrigger key={group.styleId} value={String(group.styleId)} className="gap-1.5 px-2.5">
                  <Avatar className="size-5 border border-border/50 bg-muted/30">
                    <AvatarImage src={group.styleIconUrl} alt={group.styleName} loading="lazy" />
                    <AvatarFallback className="text-[9px] text-muted-foreground">
                      {group.styleId}
                    </AvatarFallback>
                  </Avatar>
                  <span>{group.styleName}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {runeGroups.map((group) => {
              const rune =
                [...group.runes].sort((a, b) => (b.pickRate ?? -1) - (a.pickRate ?? -1))[0] ?? group.runes[0]
              return (
                <TabsContent key={group.styleId} value={String(group.styleId)} className="mt-4">
                  <div className="grid gap-3 lg:grid-cols-2">
                    <RuneOverviewCard rune={rune} />
                    <RunePerkCard title={t('panel.skills.runePrimary')} perks={rune.primaryPerks ?? []} />
                    <RunePerkCard title={t('panel.skills.runeSecondary')} perks={rune.secondaryPerks ?? []} />
                    <RunePerkCard title={t('panel.skills.runeShards')} perks={rune.statMods ?? []} />
                  </div>
                </TabsContent>
              )
            })}
          </Tabs>
        ) : (
          <div className="text-sm text-muted-foreground">{t('panel.skills.runesEmpty')}</div>
        )}
      </CardContent>
    </Card>
  )
}

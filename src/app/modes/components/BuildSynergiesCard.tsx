import { useMemo } from 'react'

import type { BuildResult, ChampionSummary } from '@/app/types'
import { fmtPct } from '@/app/main/utils'
import { useI18n } from '@/app/i18n'
import { championIconUrlById } from './view-helpers'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

type Props = {
  build: BuildResult
  champions: ChampionSummary[]
}

export function BuildSynergiesCard({ build, champions }: Props) {
  const { t } = useI18n()
  const synergies = useMemo(
    () =>
      [...(build.synergies ?? [])].sort(
        (a, b) => (b.winRate ?? -1) - (a.winRate ?? -1) || (b.pickRate ?? -1) - (a.pickRate ?? -1),
      ),
    [build.synergies],
  )
  if (!synergies.length) return null

  return (
    <Card className="detail-surface overflow-hidden rounded-3xl">
      <CardContent className="space-y-3 p-4 pt-4">
        <div className="text-sm font-semibold">{t('panel.synergy')}</div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {synergies.slice(0, 10).map((synergy) => {
            const championName =
              champions.find((champion) => champion.id === String(synergy.championId))?.name ?? null

            return (
              <div
                key={synergy.championId}
                className="flex items-center justify-between gap-3 rounded-3xl border border-border/50 bg-background/40 p-3"
              >
                <div className="flex items-center gap-2">
                  <img
                    src={championIconUrlById(synergy.championId)}
                    alt={championName ?? 'Champion'}
                    className="size-9 rounded-xl border border-border/50 bg-muted/30 object-cover"
                    loading="lazy"
                  />
                  {championName ? (
                    <div className="min-w-0 truncate text-sm font-medium text-foreground/85">
                      {championName}
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="rounded-full">
                    WR {fmtPct(synergy.winRate)}
                  </Badge>
                  <Badge variant="secondary" className="rounded-full">
                    PR {fmtPct(synergy.pickRate)}
                  </Badge>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

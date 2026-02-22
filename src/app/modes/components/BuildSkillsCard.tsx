import type { BuildResult } from '@/app/types'
import { fmtPct, skillKey } from '@/app/main/utils'
import { useI18n } from '@/app/i18n'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type Props = {
  build: BuildResult
}

function skillChipClass(token: string): string {
  const normalized = token.trim().toUpperCase()
  if (normalized === 'Q') return 'skill-chip skill-chip-q'
  if (normalized === 'W') return 'skill-chip skill-chip-w'
  if (normalized === 'E') return 'skill-chip skill-chip-e'
  if (normalized === 'R') return 'skill-chip skill-chip-r'
  return 'skill-chip'
}

export function BuildSkillsCard({ build }: Props) {
  const { t } = useI18n()

  return (
    <Card className="detail-surface overflow-hidden rounded-3xl">
      <CardContent className="space-y-4 p-4 pt-4">
        <div className="text-sm font-semibold">{t('panel.skills')}</div>

        <Tabs defaultValue="order">
          <TabsList className="rounded-2xl">
            <TabsTrigger value="order">{t('panel.skills.order')}</TabsTrigger>
            <TabsTrigger value="mastery">{t('panel.skills.mastery')}</TabsTrigger>
          </TabsList>

          <TabsContent value="order" className="mt-4 space-y-2">
            {build.skillOrders?.length ? (
              build.skillOrders.slice(0, 3).map((so, idx) => (
                <div key={idx} className="rounded-3xl border border-border/50 bg-background/40 p-3">
                  <div className="flex flex-wrap items-center gap-1">
                    {so.skillOrder.slice(0, 18).map((n, i) => {
                      const token = skillKey(n)
                      return (
                        <Badge
                          key={i}
                          variant="secondary"
                          className={`rounded-full px-2 py-0.5 ${skillChipClass(token)}`}
                        >
                          {token}
                        </Badge>
                      )
                    })}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="rounded-full">
                      PR {fmtPct(so.pickRate)}
                    </Badge>
                    <Badge variant="secondary" className="rounded-full">
                      WR {fmtPct(so.winRate)}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">{t('panel.skills.orderEmpty')}</div>
            )}
          </TabsContent>

          <TabsContent value="mastery" className="mt-4 space-y-2">
            {build.skillMasteries?.length ? (
              build.skillMasteries.slice(0, 3).map((mastery, idx) => (
                <div key={idx} className="rounded-3xl border border-border/50 bg-background/40 p-3">
                  <div className="flex flex-wrap items-center gap-1">
                    {mastery.order.map((token, i) => (
                      <Badge
                        key={`${token}-${i}`}
                        variant="secondary"
                        className={`rounded-full px-2 py-0.5 ${skillChipClass(token)}`}
                      >
                        {token}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="rounded-full">
                      PR {fmtPct(mastery.pickRate)}
                    </Badge>
                    <Badge variant="secondary" className="rounded-full">
                      WR {fmtPct(mastery.winRate)}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">{t('panel.skills.masteryEmpty')}</div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

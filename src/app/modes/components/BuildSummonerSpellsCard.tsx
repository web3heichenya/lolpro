import type { BuildResult } from '@/app/types'
import { fmtPct } from '@/app/main/utils'
import { useI18n } from '@/app/i18n'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

type Props = {
  build: BuildResult
}

export function BuildSummonerSpellsCard({ build }: Props) {
  const { t } = useI18n()

  return (
    <Card className="detail-surface overflow-hidden rounded-3xl">
      <CardContent className="space-y-4 p-4 pt-4">
        <div className="text-sm font-semibold">{t('panel.skills.spells')}</div>

        {build.summonerSpells?.length ? (
          <div className="space-y-2">
            {build.summonerSpells.slice(0, 3).map((combo, idx) => (
              <div key={idx} className="rounded-3xl border border-border/50 bg-background/40 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  {combo.summonerSpellIds.map((id, i) => {
                    const spell = combo.spells?.find((s) => s.id === id)
                    return (
                      <div key={`${id}-${i}`} className="flex items-center gap-2">
                        <Avatar className="size-8 border border-border/50 bg-muted/30">
                          <AvatarImage src={spell?.iconUrl} alt={spell?.name ?? String(id)} loading="lazy" />
                          <AvatarFallback className="text-[10px] text-muted-foreground">#{id}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-foreground/85">{spell?.name ?? `#${id}`}</span>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
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
        ) : (
          <div className="text-sm text-muted-foreground">{t('panel.skills.spellsEmpty')}</div>
        )}
      </CardContent>
    </Card>
  )
}

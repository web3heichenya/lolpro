import type { ChampionProfile } from '@/app/types'
import { useI18n } from '@/app/i18n'

import { Card, CardContent } from '@/components/ui/card'

type Props = {
  profile: ChampionProfile | null
}

export function HeroBasicsPanel({ profile }: Props) {
  const { t } = useI18n()
  if (!profile) return null

  const hasAllyTips = !!profile.allyTips?.length
  const hasEnemyTips = !!profile.enemyTips?.length
  if (!hasAllyTips && !hasEnemyTips) return null

  return (
    <Card className="detail-surface overflow-hidden rounded-3xl">
      <CardContent className="space-y-3 p-4 pt-4">
        <div className="text-sm font-semibold">{t('panel.tips')}</div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {hasAllyTips ? (
            <div className="group rounded-3xl border border-border/50 bg-background/40 p-3">
              <div className="mb-1 text-xs font-semibold text-muted-foreground">{t('panel.tips.ally')}</div>
              <ul className="space-y-1.5 text-sm leading-6 text-muted-foreground transition-colors group-hover:text-foreground/85">
                {profile.allyTips?.slice(0, 5).map((tip, idx) => (
                  <li key={idx}>{tip}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {hasEnemyTips ? (
            <div className="group rounded-3xl border border-border/50 bg-background/40 p-3">
              <div className="mb-1 text-xs font-semibold text-muted-foreground">{t('panel.tips.enemy')}</div>
              <ul className="space-y-1.5 text-sm leading-6 text-muted-foreground transition-colors group-hover:text-foreground/85">
                {profile.enemyTips?.slice(0, 5).map((tip, idx) => (
                  <li key={idx}>{tip}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

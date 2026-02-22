import { useMemo } from 'react'

import type { BuildResult } from '@/app/types'
import { useI18n } from '@/app/i18n'

import { OverlayBuildEntry } from '../components/BuildEntry'
import { resolveLateItems } from '../utils'

type AramBuild = Extract<BuildResult, { mode: 'aram' }>

export function AramOverlayContent({ build }: { build: AramBuild }) {
  const { t } = useI18n()
  const visibleItems = useMemo(() => resolveLateItems(build).slice(0, 10), [build])

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-foreground">
          {t('panel.items.core')} / {t('panel.items.situational')}
        </div>
        {visibleItems.length ? (
          <div className="grid grid-cols-2 gap-2">
            {visibleItems.map((item) => (
              <OverlayBuildEntry
                key={item.itemId}
                iconUrl={item.iconUrl}
                title={item.name}
                fallback={t('items.fallback', { id: item.itemId })}
                winRate={item.winRate}
                pickRate={item.pickRate}
                hideTitle
              />
            ))}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">{t('panel.items.empty')}</div>
        )}
      </div>
    </div>
  )
}

import { useMemo } from 'react'

import type { BuildResult } from '@/app/types'
import { useI18n } from '@/app/i18n'

import { Badge } from '@/components/ui/badge'

import { OverlayBuildEntry } from '../components/BuildEntry'
import {
  type OverlayAugmentRarity,
  groupAugmentsByRarity,
  resolveLateItems,
  selectActiveAugmentRarity,
  sortAugmentsByWinRateDesc,
} from '../utils'

type ArenaBuild = Extract<BuildResult, { mode: 'arena' }>

export function ArenaOverlayContent({
  build,
  selectedAugmentRarity,
}: {
  build: ArenaBuild
  selectedAugmentRarity: OverlayAugmentRarity
}) {
  const { t } = useI18n()

  const groupedAugments = useMemo(() => groupAugmentsByRarity(build.augments), [build.augments])
  const activeAugmentRarity = useMemo(
    () => selectActiveAugmentRarity(groupedAugments, selectedAugmentRarity),
    [groupedAugments, selectedAugmentRarity],
  )
  const visibleAugments = useMemo(
    () => sortAugmentsByWinRateDesc(groupedAugments[activeAugmentRarity]).slice(0, 10),
    [activeAugmentRarity, groupedAugments],
  )
  const visibleItems = useMemo(() => resolveLateItems(build).slice(0, 10), [build])

  const augmentRarityLabel = useMemo(() => {
    if (activeAugmentRarity === 'gold') return t('panel.augments.gold')
    if (activeAugmentRarity === 'silver') return t('panel.augments.silver')
    return t('panel.augments.prismatic')
  }, [activeAugmentRarity, t])

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 text-xs font-medium text-muted-foreground">
          <span>{t('overlay.section.augments')}</span>
          <div className="inline-flex items-center gap-1.5">
            <span className="text-[10px] opacity-90">{t('overlay.hotkey.cycleAugments')}</span>
            <Badge variant="secondary" className="rounded-full bg-background/40 text-[11px]">
              {augmentRarityLabel}
            </Badge>
          </div>
        </div>
        {visibleAugments.length ? (
          <div className="space-y-2">
            {visibleAugments.map((augment) => (
              <OverlayBuildEntry
                key={augment.augmentId}
                iconUrl={augment.iconUrl}
                title={augment.name}
                fallback={t('hex.augmentFallback', { id: augment.augmentId })}
                winRate={augment.winRate}
                pickRate={augment.pickRate}
              />
            ))}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">
            {t('panel.augments.empty', { label: augmentRarityLabel })}
          </div>
        )}
      </div>

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

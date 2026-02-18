import { useMemo } from 'react'

import type { BuildResult, Settings } from '@/app/types'
import { useI18n } from '@/app/i18n'
import { Badge } from '@/components/ui/badge'

import { OverlayBuildEntry } from '../components/BuildEntry'
import {
  aramAugmentGrade,
  groupAugmentsByRarity,
  resolveLateItems,
  selectActiveAugmentRarity,
  sortAugmentsByAramGrade,
} from '../utils'

type AramMayhemBuild = Extract<BuildResult, { mode: 'aram-mayhem' }>

export function AramMayhemOverlayContent({
  build,
  selectedAugmentRarity,
}: {
  build: AramMayhemBuild
  selectedAugmentRarity: Settings['overlay']['augmentRarity']
}) {
  const { t } = useI18n()
  const groupedAugments = useMemo(() => groupAugmentsByRarity(build.augments), [build.augments])
  const topPrismatic = useMemo(
    () => sortAugmentsByAramGrade(groupedAugments.prismatic).slice(0, 10),
    [groupedAugments.prismatic],
  )
  const topGold = useMemo(
    () => sortAugmentsByAramGrade(groupedAugments.gold).slice(0, 10),
    [groupedAugments.gold],
  )
  const topSilver = useMemo(
    () => sortAugmentsByAramGrade(groupedAugments.silver).slice(0, 10),
    [groupedAugments.silver],
  )
  const visibleItems = useMemo(() => resolveLateItems(build).slice(0, 10), [build])

  const sections = [
    { key: 'prismatic', label: t('panel.augments.prismatic'), items: topPrismatic },
    { key: 'gold', label: t('panel.augments.gold'), items: topGold },
    { key: 'silver', label: t('panel.augments.silver'), items: topSilver },
  ] as const satisfies Array<{
    key: Settings['overlay']['augmentRarity']
    label: string
    items: typeof topPrismatic
  }>
  const activeRarity = selectActiveAugmentRarity(groupedAugments, selectedAugmentRarity)
  const activeSection = sections.find((section) => section.key === activeRarity) ?? sections[0]

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 text-xs font-medium text-muted-foreground">
          <span>{t('overlay.section.augments')}</span>
          <div className="inline-flex items-center gap-1.5">
            <span className="text-[10px] opacity-90">{t('overlay.hotkey.cycleAugments')}</span>
            <Badge variant="secondary" className="rounded-full bg-background/40 text-[11px]">
              {activeSection.label}
            </Badge>
          </div>
        </div>
        {activeSection.items.length ? (
          <div className="space-y-2">
            {activeSection.items.map((augment) => (
              <OverlayBuildEntry
                key={augment.augmentId}
                iconUrl={augment.iconUrl}
                title={augment.name}
                fallback={t('hex.augmentFallback', { id: augment.augmentId })}
                winRate={null}
                pickRate={augment.pickRate}
                extraBadge={`${t('panel.augments.grade')} ${aramAugmentGrade(augment.tier) ?? '-'}`}
                showWinRate={false}
              />
            ))}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">
            {t('panel.augments.empty', { label: activeSection.label })}
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

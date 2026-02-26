import { useEffect, useMemo } from 'react'

import type { RiotLocale, Settings } from '@/app/types'
import { resolveUiLocale, useI18n } from '@/app/i18n'
import {
  useActiveBuildQuery,
  useChampionsQuery,
  useGameContextQuery,
  useSettingsQuery,
} from '@/app/hooks/use-lol-queries'
import { cn } from '@/lib/utils'
import { GripHorizontal } from 'lucide-react'
import { ModeOverlayContent } from '@/app/overlay/modes/ModeOverlayContent'

import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { TooltipProvider } from '@/components/ui/tooltip'

type OverlayAugmentRarity = Settings['overlay']['augmentRarity']

export default function OverlayApp() {
  const { t } = useI18n()

  const { data: settingsData } = useSettingsQuery()
  const settings = settingsData ?? null
  const { data: gameContextData } = useGameContextQuery()
  const gameContext = gameContextData ?? null
  const { data: buildData } = useActiveBuildQuery()
  const build = buildData ?? null

  const effectiveLang = useMemo<RiotLocale>(() => resolveUiLocale(settings?.language), [settings?.language])

  const { data: championsData } = useChampionsQuery(effectiveLang)
  const champions = championsData ?? null

  const resolvedChampionId =
    build?.championId ?? (gameContext?.detectedChampionId ? String(gameContext.detectedChampionId) : null)
  const showOperationHints = Boolean(resolvedChampionId)
  const champion = useMemo(() => {
    if (!resolvedChampionId || !champions) return null
    return champions.find((c) => c.id === resolvedChampionId) ?? null
  }, [resolvedChampionId, champions])

  const selectedAugmentRarity: OverlayAugmentRarity = settings?.overlay.augmentRarity ?? 'prismatic'

  useEffect(() => {
    document.documentElement.classList.add('overlay-route')
    document.body.classList.add('overlay-route')
    return () => {
      document.documentElement.classList.remove('overlay-route')
      document.body.classList.remove('overlay-route')
    }
  }, [])

  useEffect(() => {
    const api = window.overlayApi
    if (!api) return

    const minIntervalMs = 250
    let lastReportedAt = 0

    const reportInteraction = () => {
      const now = Date.now()
      if (now - lastReportedAt < minIntervalMs) return
      lastReportedAt = now
      void api.reportOverlayInteraction().catch(() => {})
    }

    const onPointer = () => reportInteraction()
    const onWheel = () => reportInteraction()
    const onKeyDown = () => reportInteraction()

    window.addEventListener('pointerdown', onPointer, { passive: true })
    window.addEventListener('wheel', onWheel, { passive: true })
    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  return (
    <TooltipProvider delayDuration={150}>
      <div
        className={cn(
          'pointer-events-auto h-full w-full select-none overflow-hidden bg-transparent p-3 text-[13px] text-foreground',
        )}
      >
        <div className="overlay-frost-hover glass-panel-strong flex w-[420px] max-h-[calc(100vh-24px)] flex-col overflow-hidden rounded-3xl shadow-[0_22px_70px_-30px_rgba(0,0,0,0.65)]">
          <div className="flex h-10 shrink-0 items-center justify-between border-b border-border/60 bg-background/45 px-3 text-[11px] text-muted-foreground/95">
            <div className="flex min-w-0 items-center gap-2">
              <div className="app-drag inline-flex shrink-0 items-center gap-1 rounded-full border border-border/50 bg-background/35 px-2 py-1 text-[10px] text-muted-foreground">
                <GripHorizontal className="size-3 shrink-0" />
                <span>{t('overlay.dragHint')}</span>
              </div>
              <div className="truncate text-sm font-semibold text-foreground">
                {champion?.name ??
                  (resolvedChampionId ? `Champion #${resolvedChampionId}` : t('overlay.championUnknown'))}
              </div>
              {build?.patch ? (
                <Badge variant="ghost" className="shrink-0 bg-background/45 text-[10px]">
                  Patch {build.patch}
                </Badge>
              ) : null}
            </div>
            <div className="app-no-drag inline-flex items-center" />
          </div>

          <div className="app-no-drag overflow-hidden">
            <ScrollArea
              className="max-h-[calc(100vh-76px)]"
              viewportClassName="h-auto max-h-[calc(100vh-76px)]"
            >
              <div className="space-y-4 p-4">
                {build ? (
                  <ModeOverlayContent build={build} selectedAugmentRarity={selectedAugmentRarity} />
                ) : champions ? (
                  <div className="space-y-3 text-xs text-muted-foreground">
                    <div>{t('overlay.empty.line1')}</div>
                    {showOperationHints ? (
                      <div className="text-[11px] opacity-90">{t('overlay.empty.line2')}</div>
                    ) : null}
                    {gameContext && !gameContext.isGameRelated ? (
                      <div className="text-[11px] opacity-90">{t('overlay.empty.notGameRelated')}</div>
                    ) : null}
                    {gameContext && gameContext.isGameRelated && !gameContext.isSupportedMode ? (
                      <div className="text-[11px] opacity-90">{t('overlay.unsupportedMode')}</div>
                    ) : null}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Skeleton className="h-12 rounded-2xl" />
                    <Skeleton className="h-24 rounded-2xl" />
                    <Skeleton className="h-20 rounded-2xl" />
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}

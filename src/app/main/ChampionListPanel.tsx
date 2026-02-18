import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { ChampionSummary } from '@/app/types'
import { fallbackChar } from '@/app/main/utils'
import { useI18n } from '@/app/i18n'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'

export const ChampionListPanel = memo(function ChampionListPanel({
  active,
  champions,
  filteredChampions,
  onOpenChampion,
}: {
  active: boolean
  champions: ChampionSummary[]
  filteredChampions: ChampionSummary[]
  onOpenChampion: (championId: string) => void
}) {
  const { t } = useI18n()
  const GRID_GAP = 16
  const GRID_MAX_COLUMNS = 3
  const GRID_MIN_CARD_WIDTH = 280

  const viewportRef = useRef<HTMLDivElement | null>(null)
  const scrollRafRef = useRef<number | null>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return

    const updateSize = () => {
      setViewportSize((prev) => {
        const next = { width: el.clientWidth, height: el.clientHeight }
        if (prev.width === next.width && prev.height === next.height) return prev
        return next
      })
    }

    updateSize()
    const ro = new ResizeObserver(updateSize)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (!active) return
    const el = viewportRef.current
    if (!el) return
    setViewportSize({ width: el.clientWidth, height: el.clientHeight })
  }, [active])

  useEffect(() => {
    return () => {
      if (scrollRafRef.current != null) {
        cancelAnimationFrame(scrollRafRef.current)
        scrollRafRef.current = null
      }
    }
  }, [])

  const handleViewportScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const el = event.currentTarget
    if (scrollRafRef.current != null) return
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null
      setScrollTop(el.scrollTop)
    })
  }, [])

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    el.scrollTop = 0
    queueMicrotask(() => setScrollTop(0))
  }, [filteredChampions.length])

  const columnCount = useMemo(() => {
    const width = viewportSize.width
    if (width <= 0) return 1
    const fit = Math.floor((width + GRID_GAP) / (GRID_MIN_CARD_WIDTH + GRID_GAP))
    return Math.max(1, Math.min(GRID_MAX_COLUMNS, fit))
  }, [viewportSize.width])

  const cardHeight = 206
  const rowGap = GRID_GAP
  const rowHeight = cardHeight + rowGap
  const rowCount = Math.ceil(filteredChampions.length / columnCount)
  const viewportHeight = Math.max(viewportSize.height, rowHeight)
  const overscanRows = 3
  const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - overscanRows)
  const endRow = Math.min(rowCount, Math.ceil((scrollTop + viewportHeight) / rowHeight) + overscanRows)
  const startIndex = startRow * columnCount
  const endIndex = Math.min(filteredChampions.length, endRow * columnCount)
  const visibleChampions = filteredChampions.slice(startIndex, endIndex)
  const topSpacerHeight = startRow * rowHeight
  const bottomSpacerHeight = Math.max(0, (rowCount - endRow) * rowHeight)

  return (
    <ScrollArea className="h-full" viewportRef={viewportRef} onViewportScroll={handleViewportScroll}>
      {champions.length === 0 ? (
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}>
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-[190px] rounded-3xl" />
          ))}
        </div>
      ) : filteredChampions.length === 0 ? (
        <div className="mt-10 text-center text-sm text-muted-foreground">{t('list.noMatch')}</div>
      ) : (
        <div>
          {topSpacerHeight > 0 ? <div style={{ height: topSpacerHeight }} aria-hidden /> : null}
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
          >
            {visibleChampions.map((c) => (
              <Button
                key={c.id}
                variant="ghost"
                className="h-auto p-0"
                onClick={() => onOpenChampion(c.id)}
                aria-label={t('list.openChampion', { name: c.name })}
              >
                <Card className="cv-auto h-[206px] w-full overflow-hidden rounded-3xl">
                  <div className="relative h-[138px] w-full">
                    {c.splashUrl ? (
                      <img
                        src={c.splashUrl}
                        alt={c.name}
                        className="absolute inset-0 h-full w-full object-cover opacity-90"
                        loading="lazy"
                        decoding="async"
                        fetchPriority="low"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,hsl(0_0%_0%/0.25)_55%,hsl(0_0%_0%/0.55)_100%)]" />
                  </div>
                  <CardContent className="flex items-center gap-3 p-4 pt-4">
                    <Avatar className="size-10 border border-border/50 bg-background/40">
                      <AvatarImage src={c.iconUrl} alt={c.name} />
                      <AvatarFallback>{fallbackChar(c.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1 text-left">
                      <div className="truncate text-base font-semibold">{c.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{c.slug}</div>
                    </div>
                    <Badge variant="secondary" className="rounded-full text-[10px]">
                      #{c.id}
                    </Badge>
                  </CardContent>
                </Card>
              </Button>
            ))}
          </div>
          {bottomSpacerHeight > 0 ? <div style={{ height: bottomSpacerHeight }} aria-hidden /> : null}
        </div>
      )}
    </ScrollArea>
  )
})

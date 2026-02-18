import { pct } from '@/app/format'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

function fallbackChar(name: string) {
  const s = name.trim()
  return s ? s.slice(0, 1).toUpperCase() : '?'
}

export function OverlayBuildEntry({
  iconUrl,
  title,
  fallback,
  winRate,
  pickRate,
  extraBadge,
  showWinRate = true,
}: {
  iconUrl?: string
  title?: string
  fallback: string
  winRate: number | null
  pickRate: number | null
  extraBadge?: string | null
  showWinRate?: boolean
}) {
  return (
    <div className="glass-panel flex min-w-0 items-center justify-between gap-2 rounded-2xl px-2.5 py-2.5">
      <div className="min-w-0 flex flex-1 items-center gap-2">
        <Avatar className="size-8 border border-glass-border bg-muted/20">
          <AvatarImage src={iconUrl} alt={title ?? fallback} className="object-cover" loading="lazy" />
          <AvatarFallback className="text-[10px]">{fallbackChar(title ?? fallback)}</AvatarFallback>
        </Avatar>
        <div className="truncate text-xs font-medium">{title ?? fallback}</div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {extraBadge ? (
          <Badge variant="secondary" className="rounded-full bg-background/40 px-2 py-0 text-[11px]">
            {extraBadge}
          </Badge>
        ) : null}
        {showWinRate ? (
          <Badge variant="secondary" className="rounded-full bg-background/40 px-2 py-0 text-[11px]">
            WR {pct(winRate)}
          </Badge>
        ) : null}
        <Badge variant="secondary" className="rounded-full bg-background/40 px-2 py-0 text-[11px]">
          PR {pct(pickRate)}
        </Badge>
      </div>
    </div>
  )
}

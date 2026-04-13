import type { ReactNode } from 'react'
import { ChevronLeft, Minus, Pin, PinOff, Search, X } from 'lucide-react'

import { useI18n } from '@/app/i18n'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Props = {
  showBackButton: boolean
  showSearch: boolean
  query: string
  title: ReactNode | null
  overlayPinned: boolean
  onBack: () => void
  onQueryChange: (value: string) => void
  onToggleOverlayPinned: () => Promise<void>
  onWindowMinimize: () => Promise<void>
  onWindowClose: () => Promise<void>
}

export function MainHeader({
  showBackButton,
  showSearch,
  query,
  title,
  overlayPinned,
  onBack,
  onQueryChange,
  onToggleOverlayPinned,
  onWindowMinimize,
  onWindowClose,
}: Props) {
  const { t } = useI18n()

  return (
    <header className="border-b border-border/60 px-5 py-5">
      <div className="app-drag grid h-12 grid-cols-[auto_1fr_auto] items-center gap-3">
        <div className="flex items-center gap-2">
          {showBackButton ? (
            <div>
              <Button
                variant="secondary"
                size="icon"
                className="rounded-2xl"
                aria-label={t('common.back')}
                onClick={onBack}
              >
                <ChevronLeft />
              </Button>
            </div>
          ) : (
            <div className="size-10" aria-hidden />
          )}
        </div>

        <div className="flex items-center justify-center">
          {showSearch ? (
            <div className="app-no-drag relative mx-auto w-full max-w-[520px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder={t('header.searchPlaceholder')}
                className="h-11 rounded-2xl pl-10"
              />
            </div>
          ) : (
            <div className="truncate text-center font-display text-xl font-semibold tracking-tight">
              {title ?? t('header.selectedChampionFallback')}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button
            variant="secondary"
            size="icon"
            className={cn('rounded-2xl', overlayPinned && 'ring-1 ring-ring')}
            aria-label={overlayPinned ? t('sidebar.hideOverlay') : t('sidebar.showOverlay')}
            aria-pressed={overlayPinned}
            onClick={() => void onToggleOverlayPinned()}
          >
            {overlayPinned ? <PinOff /> : <Pin />}
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="rounded-2xl"
            aria-label={t('common.minimize')}
            onClick={() => void onWindowMinimize()}
          >
            <Minus />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="rounded-2xl"
            aria-label={t('common.close')}
            onClick={() => void onWindowClose()}
          >
            <X />
          </Button>
        </div>
      </div>
    </header>
  )
}

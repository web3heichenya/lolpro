import { useState } from 'react'
import { Flame, Gamepad2, Gem, RefreshCw, Shield, Snowflake, Swords, type LucideIcon } from 'lucide-react'

import { DEFAULT_GAME_MODE, type GameModeId } from '@shared/gameModes'

import type { AppUpdateStatus, GameContext, Settings, SettingsPatch, SupportedMode } from '@/app/types'
import type { MainPanel } from '@/app/store/useAppStore'
import { useI18n } from '@/app/i18n'
import { SettingsSheet } from '@/app/main/SettingsSheet'
import { fallbackChar } from '@/app/main/utils'
import { cn } from '@/lib/utils'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'

const APP_ICON_URL = new URL('../../assets/app-icon.png', import.meta.url).toString()

type ModeVisual = {
  icon: LucideIcon
}

const MODE_VISUALS: Record<GameModeId, ModeVisual> = {
  ranked: {
    icon: Shield,
  },
  aram: {
    icon: Snowflake,
  },
  urf: {
    icon: Flame,
  },
  'aram-mayhem': {
    icon: Gem,
  },
  arena: {
    icon: Swords,
  },
}

type Props = {
  modeId: GameModeId
  setModeId: (modeId: GameModeId) => void
  onModeSwitchToList: (modeId: GameModeId) => void
  mainPanel: MainPanel
  setMainPanel: (panel: MainPanel) => void
  showInGameTab: boolean
  supportedModes: SupportedMode[] | null
  settings: Settings | null
  gameContext: GameContext | null
  clearingCacheMode: GameModeId | null
  onRefreshGameContext: () => Promise<void>
  onApplySettingsPatch: (patch: SettingsPatch) => Promise<void>
  onClearCacheForMode: (mode: GameModeId) => Promise<void>
  onResetSettings: () => Promise<void>
  appUpdateStatus: AppUpdateStatus | null
  onCheckAppUpdate: () => Promise<void>
  onDownloadAppUpdate: () => Promise<void>
  onInstallAppUpdate: () => Promise<void>
}

function profileIconUrl(profileIconId: number | undefined) {
  if (!profileIconId) return null
  return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${profileIconId}.jpg`
}

export function ModeSidebar({
  modeId,
  setModeId,
  onModeSwitchToList,
  mainPanel,
  setMainPanel,
  showInGameTab,
  supportedModes,
  settings,
  gameContext,
  clearingCacheMode,
  onRefreshGameContext,
  onApplySettingsPatch,
  onClearCacheForMode,
  onResetSettings,
  appUpdateStatus,
  onCheckAppUpdate,
  onDownloadAppUpdate,
  onInstallAppUpdate,
}: Props) {
  const { t } = useI18n()
  const [refreshingStatus, setRefreshingStatus] = useState(false)

  function resolveModeLabel(id: GameModeId, fallback: string) {
    const key = `app.mode.${id}`
    const localized = t(key)
    return localized !== key ? localized : fallback
  }

  const isClientConnected = !!gameContext?.lcu.connected
  const summoner = gameContext?.lcu.summoner
  const playerName = summoner?.gameName ?? summoner?.displayName ?? t('sidebar.player.unknown')
  const avatarSrc = profileIconUrl(summoner?.profileIconId)

  async function onRefreshStatus() {
    setRefreshingStatus(true)
    try {
      await onRefreshGameContext()
    } finally {
      setRefreshingStatus(false)
    }
  }

  return (
    <aside className="app-drag w-[300px] shrink-0 border-r border-border/60 bg-card">
      <div className="flex h-full flex-col justify-between gap-5 p-5">
        <div className="app-drag flex h-14 items-center gap-3">
          <div className="grid size-11 place-items-center overflow-hidden rounded-2xl border border-border/50 bg-background/50">
            <img
              src={APP_ICON_URL}
              alt="LOLPro"
              className="block h-full w-full object-cover"
              draggable={false}
            />
          </div>
          <div className="leading-tight">
            <div className="font-display text-lg font-semibold tracking-tight">LOLPro</div>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-3">
          <ScrollArea className="h-full" viewportClassName="pt-px">
            <div className="space-y-2 pb-2">
              {showInGameTab ? (
                <Button
                  variant="ghost"
                  className={cn(
                    'group h-auto w-full justify-start gap-3 rounded-2xl border px-3 py-3 text-foreground hover:bg-transparent! hover:text-foreground!',
                    mainPanel === 'ingame'
                      ? 'border-brand/45 bg-linear-to-r from-brand/26 via-brand/14 to-transparent shadow-sm'
                      : 'border-brand/30 bg-background/30 hover:border-brand/45 hover:bg-linear-to-r hover:from-brand/26 hover:via-brand/14 hover:to-transparent hover:shadow-sm',
                  )}
                  onClick={() => setMainPanel('ingame')}
                >
                  <div
                    className={cn(
                      'grid size-9 place-items-center rounded-2xl border bg-background/40',
                      mainPanel === 'ingame'
                        ? 'border-brand/45 bg-brand/16'
                        : 'border-brand/35 bg-brand/10 group-hover:border-brand/45 group-hover:bg-brand/16',
                    )}
                  >
                    <Gamepad2 className="size-4 text-brand" />
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="truncate text-sm font-semibold">{t('sidebar.tab.ingame')}</div>
                  </div>
                </Button>
              ) : null}

              {(
                supportedModes ?? [{ id: DEFAULT_GAME_MODE, label: t('app.mode.aram-mayhem'), features: [] }]
              ).map((m) => {
                const visual = MODE_VISUALS[m.id]
                const ModeIcon = visual.icon
                const active = mainPanel === 'build' && m.id === modeId

                return (
                  <Button
                    key={m.id}
                    variant="ghost"
                    className={cn(
                      'sidebar-mode-item sidebar-mode-item-regular group h-auto w-full justify-start gap-3 rounded-2xl border px-3 py-3 text-foreground hover:bg-transparent! hover:text-foreground!',
                      active
                        ? 'sidebar-mode-item-active border-border/70 bg-linear-to-r from-accent/90 via-accent/62 to-transparent shadow-sm hover:border-border/70 hover:bg-linear-to-r hover:from-accent/90 hover:via-accent/62 hover:to-transparent hover:shadow-sm'
                        : 'sidebar-mode-item-inactive border-border/45 bg-background/30 hover:border-border/70 hover:bg-linear-to-r hover:from-accent/90 hover:via-accent/62 hover:to-transparent hover:shadow-sm',
                    )}
                    onClick={() => {
                      setMainPanel('build')
                      setModeId(m.id)
                      onModeSwitchToList(m.id)
                    }}
                  >
                    <div
                      className={cn(
                        'sidebar-mode-item-icon grid size-9 place-items-center rounded-2xl border',
                        active
                          ? 'sidebar-mode-item-icon-active border-border/70 bg-linear-to-r from-accent/85 via-accent/62 to-transparent'
                          : 'sidebar-mode-item-icon-inactive border-border/50 bg-background/50 group-hover:border-border/70 group-hover:bg-linear-to-r group-hover:from-accent/85 group-hover:via-accent/62 group-hover:to-transparent',
                      )}
                    >
                      <ModeIcon className="size-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 text-left">
                      <div className="truncate text-sm font-semibold">{resolveModeLabel(m.id, m.label)}</div>
                    </div>
                  </Button>
                )
              })}
            </div>
          </ScrollArea>
        </div>

        <div className="surface-unified app-no-drag flex min-w-0 items-center gap-3 rounded-2xl border px-3 py-2.5">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {!gameContext ? (
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Skeleton className="size-10 rounded-full" />
                <Skeleton className="h-3 w-24 rounded-full" />
              </div>
            ) : (
              <>
                <div className="relative shrink-0">
                  <Avatar className="size-10 border border-border/55 bg-background/45">
                    <AvatarImage src={avatarSrc ?? undefined} alt={playerName} />
                    <AvatarFallback>{fallbackChar(playerName)}</AvatarFallback>
                  </Avatar>
                  <span
                    className={cn(
                      'pointer-events-none absolute right-0 bottom-0 z-10 inline-flex size-2.5 rounded-full border border-background shadow-sm',
                      isClientConnected ? 'bg-emerald-500' : 'bg-slate-500',
                    )}
                    aria-hidden
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{playerName}</div>
                </div>
              </>
            )}
          </div>

          <div className="app-no-drag flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="rounded-2xl"
              aria-label={t('sidebar.refreshStatus')}
              disabled={refreshingStatus}
              onClick={() => void onRefreshStatus()}
            >
              <RefreshCw className={cn('size-4', refreshingStatus && 'animate-spin')} />
            </Button>

            <SettingsSheet
              settings={settings}
              supportedModes={supportedModes}
              clearingCacheMode={clearingCacheMode}
              onApplySettingsPatch={onApplySettingsPatch}
              onClearCacheForMode={onClearCacheForMode}
              onResetSettings={onResetSettings}
              appUpdateStatus={appUpdateStatus}
              onCheckAppUpdate={onCheckAppUpdate}
              onDownloadAppUpdate={onDownloadAppUpdate}
              onInstallAppUpdate={onInstallAppUpdate}
            />
          </div>
        </div>
      </div>
    </aside>
  )
}

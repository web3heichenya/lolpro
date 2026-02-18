import { Settings2, X } from 'lucide-react'

import { DEFAULT_GAME_MODE, type GameModeId } from '@shared/gameModes'
import {
  DEFAULT_OPGG_TIER,
  DEFAULT_OPGG_REGION,
  OPGG_TIERS,
  OPGG_REGIONS,
  type OpggTier,
  type OpggRegion,
} from '@shared/opgg'

import type { Settings, SettingsPatch, SupportedMode } from '@/app/types'
import { useI18n } from '@/app/i18n'
import { getHotkeyRows } from '@/app/main/hotkeyRows'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetClose, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'

type Props = {
  settings: Settings | null
  supportedModes: SupportedMode[] | null
  clearingCacheMode: GameModeId | null
  onApplySettingsPatch: (patch: SettingsPatch) => Promise<void>
  onClearCacheForMode: (mode: GameModeId) => Promise<void>
  onResetSettings: () => Promise<void>
}

export function SettingsSheet({
  settings,
  supportedModes,
  clearingCacheMode,
  onApplySettingsPatch,
  onClearCacheForMode,
  onResetSettings,
}: Props) {
  const { t } = useI18n()
  const selectedRegion = settings?.dataSource.opgg.region ?? DEFAULT_OPGG_REGION
  const selectedTier = settings?.dataSource.opgg.tier ?? DEFAULT_OPGG_TIER
  const selectedTheme = settings?.theme.preference ?? 'system'
  const hotkeyRows = getHotkeyRows(t, settings)

  function resolveModeLabel(id: GameModeId, fallback: string) {
    const key = `app.mode.${id}`
    const localized = t(key)
    return localized !== key ? localized : fallback
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="secondary" size="icon" className="rounded-2xl" aria-label={t('common.settings')}>
          <Settings2 />
        </Button>
      </SheetTrigger>
      <SheetContent className="min-w-0 w-[420px] max-w-[calc(100vw-2.5rem)] overflow-x-hidden">
        <div className="border-b border-border/60 px-5 py-5">
          <div className="app-drag flex h-12 items-center justify-between gap-3">
            <div className="truncate font-display text-xl font-semibold tracking-tight">
              {t('settings.title')}
            </div>
            <div className="app-no-drag flex items-center justify-end gap-2">
              <SheetClose asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className="rounded-2xl"
                  aria-label={t('common.close')}
                >
                  <X />
                </Button>
              </SheetClose>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1">
          <ScrollArea className="h-full w-full">
            <div className="space-y-6 overflow-x-hidden p-5 pr-7 text-sm">
              <div className="space-y-3">
                <div className="font-semibold">{t('settings.section.language')}</div>
                <Select
                  value={settings?.language ?? 'auto'}
                  onValueChange={(v) => {
                    const next: Settings['language'] =
                      v === 'auto' || v === 'en_US' || v === 'zh_CN' ? v : 'auto'
                    void onApplySettingsPatch({ language: next })
                  }}
                >
                  <SelectTrigger className="w-full max-w-full">
                    <SelectValue placeholder={t('settings.language.placeholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">{t('settings.language.auto')}</SelectItem>
                    <SelectItem value="en_US">{t('settings.language.en_US')}</SelectItem>
                    <SelectItem value="zh_CN">{t('settings.language.zh_CN')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="font-semibold">{t('settings.section.theme')}</div>
                <Select
                  value={selectedTheme}
                  onValueChange={(v) => {
                    const next = v === 'light' || v === 'dark' || v === 'system' ? v : 'system'
                    void onApplySettingsPatch({ theme: { preference: next } })
                  }}
                >
                  <SelectTrigger className="w-full max-w-full">
                    <SelectValue placeholder={t('settings.theme.placeholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">{t('settings.theme.system')}</SelectItem>
                    <SelectItem value="light">{t('settings.theme.light')}</SelectItem>
                    <SelectItem value="dark">{t('settings.theme.dark')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="font-semibold">{t('settings.section.opgg')}</div>

                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">{t('settings.opgg.region.help')}</div>
                  <Select
                    value={selectedRegion}
                    onValueChange={(v) => {
                      const nextRegion: OpggRegion = OPGG_REGIONS.includes(v as OpggRegion)
                        ? (v as OpggRegion)
                        : DEFAULT_OPGG_REGION
                      void onApplySettingsPatch({ dataSource: { opgg: { region: nextRegion } } })
                    }}
                  >
                    <SelectTrigger className="w-full max-w-full">
                      <SelectValue placeholder={t('settings.opgg.region')} />
                    </SelectTrigger>
                    <SelectContent>
                      {OPGG_REGIONS.map((region) => (
                        <SelectItem key={region} value={region}>
                          {t(`settings.opgg.region.${region}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">{t('settings.opgg.tier.help')}</div>
                  <Select
                    value={selectedTier}
                    onValueChange={(v) => {
                      const nextTier: OpggTier = OPGG_TIERS.includes(v as OpggTier)
                        ? (v as OpggTier)
                        : DEFAULT_OPGG_TIER
                      void onApplySettingsPatch({ dataSource: { opgg: { tier: nextTier } } })
                    }}
                  >
                    <SelectTrigger className="w-full max-w-full">
                      <SelectValue placeholder={t('settings.opgg.tier')} />
                    </SelectTrigger>
                    <SelectContent>
                      {OPGG_TIERS.map((tier) => (
                        <SelectItem key={tier} value={tier}>
                          {t(`settings.opgg.tier.${tier}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="font-semibold">{t('settings.section.overlay')}</div>

                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium">{t('settings.overlay.pinned.title')}</div>
                    <div className="text-xs text-muted-foreground">{t('settings.overlay.pinned.desc')}</div>
                  </div>
                  <Switch
                    checked={!!settings?.overlay.pinned}
                    onCheckedChange={(checked) => void onApplySettingsPatch({ overlay: { pinned: checked } })}
                  />
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium">{t('settings.overlay.interactive.title')}</div>
                    <div className="text-xs text-muted-foreground">
                      {t('settings.overlay.interactive.desc')}
                    </div>
                  </div>
                  <Switch
                    checked={!!settings?.overlay.interactive}
                    onCheckedChange={(checked) =>
                      void onApplySettingsPatch({ overlay: { interactive: checked } })
                    }
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="font-semibold">{t('settings.section.hotkeys')}</div>

                <div className="space-y-2 rounded-2xl border border-border/50 bg-background/35 px-3 py-2">
                  <div className="text-xs font-medium text-foreground">
                    {t('settings.hotkeys.shortcutsTitle')}
                  </div>
                  <div className="space-y-1.5">
                    {hotkeyRows.map((row) => (
                      <div key={row.label} className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-muted-foreground">{row.label}</span>
                        <Badge
                          variant="secondary"
                          className="rounded-full bg-background/50 font-mono text-[11px]"
                        >
                          {row.value}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="font-semibold">{t('settings.section.cache')}</div>

                <div className="space-y-3">
                  {(
                    supportedModes ?? [
                      { id: DEFAULT_GAME_MODE, label: t('app.mode.aram-mayhem'), features: [] },
                    ]
                  ).map((m) => {
                    const label = resolveModeLabel(m.id, m.label)
                    const busy = clearingCacheMode === m.id
                    const disabled = clearingCacheMode !== null
                    const featurePreview = t('settings.cache.previewFallback')

                    return (
                      <div key={m.id} className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-medium">{label}</div>
                          <div className="mt-0.5 truncate text-xs text-muted-foreground">
                            {featurePreview}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          className="shrink-0"
                          disabled={disabled}
                          onClick={() => void onClearCacheForMode(m.id)}
                        >
                          {busy ? (
                            <>
                              <Skeleton className="mr-2 size-4 rounded-full" />
                              {t('common.clearing')}
                            </>
                          ) : (
                            t('common.clear')
                          )}
                        </Button>
                      </div>
                    )
                  })}
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold">{t('settings.section.reset.title')}</div>
                  <div className="text-xs text-muted-foreground">{t('settings.section.reset.desc')}</div>
                </div>
                <Button variant="outline" onClick={() => void onResetSettings()}>
                  {t('common.reset')}
                </Button>
              </div>
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  )
}

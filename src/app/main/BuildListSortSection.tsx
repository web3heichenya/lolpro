import type { Settings, SettingsPatch } from '@/app/types'
import { useI18n } from '@/app/i18n'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function BuildListSortSection({
  settings,
  onApplySettingsPatch,
}: {
  settings: Settings | null
  onApplySettingsPatch: (patch: SettingsPatch) => Promise<void>
}) {
  const { t } = useI18n()
  const selectedBuildListSortMode = settings?.buildLists.sortMode ?? 'composite'

  return (
    <div className="space-y-3">
      <div className="font-semibold">{t('settings.section.buildLists')}</div>
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">{t('settings.buildLists.sortMode.help')}</div>
        <Select
          value={selectedBuildListSortMode}
          onValueChange={(v) => {
            const sortMode = v === 'composite' || v === 'winRate' || v === 'pickRate' ? v : 'composite'
            void onApplySettingsPatch({ buildLists: { sortMode } })
          }}
        >
          <SelectTrigger className="w-full max-w-full">
            <SelectValue placeholder={t('settings.buildLists.sortMode')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="composite">{t('settings.buildLists.sortMode.composite')}</SelectItem>
            <SelectItem value="winRate">{t('settings.buildLists.sortMode.winRate')}</SelectItem>
            <SelectItem value="pickRate">{t('settings.buildLists.sortMode.pickRate')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

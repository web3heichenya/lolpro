import { Download, RefreshCw, RotateCcw } from 'lucide-react'

import type { AppUpdateStatus } from '@/app/types'
import { useI18n } from '@/app/i18n'
import { cn } from '@/lib/utils'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type Props = {
  appUpdateStatus: AppUpdateStatus | null
  onCheckAppUpdate: () => Promise<void>
  onDownloadAppUpdate: () => Promise<void>
  onInstallAppUpdate: () => Promise<void>
}

function formatBytes(input: number) {
  if (!Number.isFinite(input) || input <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let value = input
  let index = 0
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024
    index += 1
  }
  const digits = value >= 100 || index === 0 ? 0 : 1
  return `${value.toFixed(digits)} ${units[index]}`
}

export function UpdateSection({
  appUpdateStatus,
  onCheckAppUpdate,
  onDownloadAppUpdate,
  onInstallAppUpdate,
}: Props) {
  const { t } = useI18n()
  const updateStage = appUpdateStatus?.stage ?? 'disabled'
  const updateStatusLabelKey = `settings.update.status.${updateStage}`
  const updateStatusLabel = t(updateStatusLabelKey)
  const updateStatusText =
    updateStatusLabel !== updateStatusLabelKey ? updateStatusLabel : updateStage.replaceAll('-', ' ')

  const updateCurrentVersion = appUpdateStatus?.currentVersion ?? 'unknown'
  const updateLatestVersion = appUpdateStatus?.latestVersion ?? updateCurrentVersion

  const canCheckUpdate = !!appUpdateStatus?.canCheck
  const canDownloadUpdate = !!appUpdateStatus?.canDownload
  const canInstallUpdate = !!appUpdateStatus?.canInstall

  return (
    <div className="space-y-3">
      <div className="font-semibold">{t('settings.section.update')}</div>

      <div className="space-y-3 rounded-2xl border border-border/50 bg-background/35 px-3 py-3">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground">{t('settings.update.currentVersion')}</span>
          <Badge variant="secondary" className="rounded-full bg-background/50 font-mono text-[11px]">
            {updateCurrentVersion}
          </Badge>
        </div>

        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground">{t('settings.update.latestVersion')}</span>
          <Badge variant="secondary" className="rounded-full bg-background/50 font-mono text-[11px]">
            {updateLatestVersion}
          </Badge>
        </div>

        <div className="text-xs text-muted-foreground">{appUpdateStatus?.message ?? updateStatusText}</div>

        {appUpdateStatus?.progress ? (
          <div className="text-xs text-muted-foreground">
            {t('settings.update.progress', {
              percent: `${Math.round(appUpdateStatus.progress.percent)}%`,
              transferred: formatBytes(appUpdateStatus.progress.transferred),
              total: formatBytes(appUpdateStatus.progress.total),
            })}
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            className="shrink-0"
            disabled={!canCheckUpdate}
            onClick={() => void onCheckAppUpdate()}
          >
            <RefreshCw className={cn('mr-2 size-4', updateStage === 'checking' && 'animate-spin')} />
            {t('settings.update.action.check')}
          </Button>

          {canDownloadUpdate ? (
            <Button className="shrink-0" onClick={() => void onDownloadAppUpdate()}>
              <Download className="mr-2 size-4" />
              {t('settings.update.action.download')}
            </Button>
          ) : null}

          {canInstallUpdate ? (
            <Button className="shrink-0" onClick={() => void onInstallAppUpdate()}>
              <RotateCcw className="mr-2 size-4" />
              {t('settings.update.action.install')}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

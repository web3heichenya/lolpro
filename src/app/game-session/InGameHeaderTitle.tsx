import type { GameContext, SupportedMode } from '@/app/types'
import { useI18n } from '@/app/i18n'
import { resolveGamePhaseMeta } from '@/app/game-session/status'
import { cn } from '@/lib/utils'

type Props = {
  gameContext: GameContext | null
  supportedModes: SupportedMode[] | null
}

export function InGameHeaderTitle({ gameContext, supportedModes }: Props) {
  const { t } = useI18n()
  const gamePhaseMeta = resolveGamePhaseMeta(gameContext?.lcu)

  const gameModeLabel = (() => {
    if (!gameContext?.isSupportedMode) return t('ingame.mode.unsupported')

    const i18nKey = `app.mode.${gameContext.modeId}`
    const localized = t(i18nKey)
    if (localized !== i18nKey) return localized

    return supportedModes?.find((mode) => mode.id === gameContext.modeId)?.label ?? gameContext.modeId
  })()

  return (
    <span className="inline-flex max-w-full items-center gap-2">
      <span className={cn('inline-block size-2.5 shrink-0 rounded-full', gamePhaseMeta.dotClassName)} />
      <span className="truncate">
        {gameModeLabel}
        <span className="ml-1 text-base font-medium text-muted-foreground">
          ({t(`ingame.phase.${gamePhaseMeta.key}`)})
        </span>
      </span>
    </span>
  )
}

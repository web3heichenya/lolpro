import type { BuildResult, ChampionProfile, ChampionSummary } from '@/app/types'
import type { GameModeId } from '@shared/gameModes'
import type { ComponentType } from 'react'
import { useI18n } from '@/app/i18n'
import { AramDetailView } from './aram/AramDetailView'
import { AramMayhemDetailView } from './aram-mayhem/AramMayhemDetailView'
import { ArenaDetailView } from './arena/ArenaDetailView'
import { UnsupportedModeState } from './components/UnsupportedModeState'

type Props = {
  champions: ChampionSummary[]
  modeId: GameModeId
  selectedChampion: ChampionSummary | null
  championProfile: ChampionProfile | null
  build: BuildResult | null
  gameRelated: boolean
  loading: boolean
  refreshing: boolean
  selectedId: string | null
  showAllAugments: boolean
  onToggleShowAllAugments: () => void
  onRefreshBuild: (championId: string) => Promise<void>
}

export function ModeDetailPanel(props: Props) {
  const { t } = useI18n()
  const viewByMode: Partial<Record<string, ComponentType<Props>>> = {
    aram: AramDetailView,
    'aram-mayhem': AramMayhemDetailView,
    arena: ArenaDetailView,
  }
  const DetailView = viewByMode[props.modeId]

  if (DetailView) {
    return <DetailView {...props} />
  }

  console.warn(`[ModeDetailPanel] Unsupported mode: ${props.modeId}`)
  return <UnsupportedModeState modeId={String(props.modeId)} message={t('detail.unsupportedMode')} />
}

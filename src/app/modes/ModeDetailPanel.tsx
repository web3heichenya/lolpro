import type { BuildResult, ChampionProfile, ChampionSummary } from '@/app/types'
import type { GameModeId } from '@shared/gameModes'
import { AramMayhemDetailView } from './aram-mayhem/AramMayhemDetailView'
import { ArenaDetailView } from './arena/ArenaDetailView'

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
  if (props.modeId === 'aram-mayhem') {
    return <AramMayhemDetailView {...props} />
  }
  if (props.modeId === 'arena') {
    return <ArenaDetailView {...props} />
  }
  return null
}

import type { BuildResult, ChampionProfile, ChampionSummary } from '@/app/types'
import { AramMayhemDetailView } from '@/app/modes/aram-mayhem/AramMayhemDetailView'

type Props = {
  champions: ChampionSummary[]
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

// Arena uses the same build shape and UI modules (augments/items/skills) as aram-mayhem in our app.
// Keep a dedicated entrypoint file so future arena-specific layout changes stay isolated.
export function ArenaDetailView(props: Props) {
  return <AramMayhemDetailView {...props} />
}

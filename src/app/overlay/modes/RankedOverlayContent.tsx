import type { BuildResult, Settings } from '@/app/types'
import { AramOverlayContent } from './AramOverlayContent'

type RankedBuild = Extract<BuildResult, { mode: 'ranked' }>

// Ranked currently reuses the same item-focused compact overlay as ARAM.
export function RankedOverlayContent({
  build,
  buildListSortMode,
}: {
  build: RankedBuild
  buildListSortMode: Settings['buildLists']['sortMode']
}) {
  return <AramOverlayContent build={build} buildListSortMode={buildListSortMode} />
}

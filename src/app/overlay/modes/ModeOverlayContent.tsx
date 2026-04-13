import type { BuildResult, Settings } from '@/app/types'

import { AramOverlayContent } from './AramOverlayContent'
import { ArenaOverlayContent } from './ArenaOverlayContent'
import { AramMayhemOverlayContent } from './AramMayhemOverlayContent'
import { RankedOverlayContent } from './RankedOverlayContent'

export function ModeOverlayContent({
  build,
  selectedAugmentRarity,
  buildListSortMode,
}: {
  build: BuildResult
  selectedAugmentRarity: Settings['overlay']['augmentRarity']
  buildListSortMode: Settings['buildLists']['sortMode']
}) {
  if (build.mode === 'arena') {
    return (
      <ArenaOverlayContent
        build={build}
        selectedAugmentRarity={selectedAugmentRarity}
        buildListSortMode={buildListSortMode}
      />
    )
  }
  if (build.mode === 'aram') {
    return <AramOverlayContent build={build} buildListSortMode={buildListSortMode} />
  }
  if (build.mode === 'urf') {
    return <AramOverlayContent build={build} buildListSortMode={buildListSortMode} />
  }
  if (build.mode === 'ranked') {
    return <RankedOverlayContent build={build} buildListSortMode={buildListSortMode} />
  }
  if (build.mode === 'aram-mayhem') {
    return (
      <AramMayhemOverlayContent
        build={build}
        selectedAugmentRarity={selectedAugmentRarity}
        buildListSortMode={buildListSortMode}
      />
    )
  }
  return null
}

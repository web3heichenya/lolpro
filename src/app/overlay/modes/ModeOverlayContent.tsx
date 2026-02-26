import type { BuildResult, Settings } from '@/app/types'

import { AramOverlayContent } from './AramOverlayContent'
import { ArenaOverlayContent } from './ArenaOverlayContent'
import { AramMayhemOverlayContent } from './AramMayhemOverlayContent'
import { RankedOverlayContent } from './RankedOverlayContent'

export function ModeOverlayContent({
  build,
  selectedAugmentRarity,
}: {
  build: BuildResult
  selectedAugmentRarity: Settings['overlay']['augmentRarity']
}) {
  if (build.mode === 'arena') {
    return <ArenaOverlayContent build={build} selectedAugmentRarity={selectedAugmentRarity} />
  }
  if (build.mode === 'aram') {
    return <AramOverlayContent build={build} />
  }
  if (build.mode === 'urf') {
    return <AramOverlayContent build={build} />
  }
  if (build.mode === 'ranked') {
    return <RankedOverlayContent build={build} />
  }
  if (build.mode === 'aram-mayhem') {
    return <AramMayhemOverlayContent build={build} selectedAugmentRarity={selectedAugmentRarity} />
  }
  return null
}

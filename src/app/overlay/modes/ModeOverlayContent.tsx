import type { BuildResult, Settings } from '@/app/types'

import { ArenaOverlayContent } from './ArenaOverlayContent'
import { AramMayhemOverlayContent } from './AramMayhemOverlayContent'

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
  if (build.mode === 'aram-mayhem') {
    return <AramMayhemOverlayContent build={build} selectedAugmentRarity={selectedAugmentRarity} />
  }
  return null
}

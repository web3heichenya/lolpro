import type { BuildResult } from '@/app/types'
import { AramOverlayContent } from './AramOverlayContent'

type RankedBuild = Extract<BuildResult, { mode: 'ranked' }>

// Ranked currently reuses the same item-focused compact overlay as ARAM.
export function RankedOverlayContent({ build }: { build: RankedBuild }) {
  return <AramOverlayContent build={build} />
}

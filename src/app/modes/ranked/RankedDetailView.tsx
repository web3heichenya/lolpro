import { AramDetailView } from '@/app/modes/aram/AramDetailView'
import type { ModeDetailViewProps } from '@/app/modes/components/AugmentModeDetailView'

// Ranked currently shares the same non-augment layout as ARAM.
// Keep a dedicated mode entrypoint so we can evolve ranked-specific UX independently.
export function RankedDetailView(props: ModeDetailViewProps) {
  return <AramDetailView {...props} />
}

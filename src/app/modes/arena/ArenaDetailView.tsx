import { AugmentModeDetailView, type ModeDetailViewProps } from '@/app/modes/components/AugmentModeDetailView'

// Arena uses the same build shape and UI modules (augments/items/skills) as aram-mayhem in our app.
// Keep a dedicated mode entrypoint while sharing reusable mode components.
export function ArenaDetailView(props: ModeDetailViewProps) {
  return <AugmentModeDetailView {...props} />
}

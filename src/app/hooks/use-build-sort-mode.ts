import type { BuildListSortMode } from '@/app/types'
import { useSettingsQuery } from '@/app/hooks/use-lol-queries'

export function useBuildSortMode(): BuildListSortMode {
  const { data: settings } = useSettingsQuery()
  return settings?.buildLists.sortMode ?? 'composite'
}

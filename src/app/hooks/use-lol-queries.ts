import useSWR from 'swr'

import type {
  AppUpdateStatus,
  BuildResult,
  ChampionProfile,
  ChampionSummary,
  GameContext,
  RiotLocale,
  Settings,
  SupportedMode,
} from '@/app/types'
import { getLolApi, getMainLolApi } from '@/app/services/lolApi'
import type { GameModeId } from '@shared/gameModes'

const settingsKey = 'settings'
const gameContextKey = 'gameContext'
const activeBuildKey = 'activeBuild'
const supportedModesKey = 'supportedModes'
const accessibilityKey = 'accessibility'
const updateStatusKey = 'updateStatus'

export const swrKeys = {
  settingsKey,
  gameContextKey,
  activeBuildKey,
  supportedModesKey,
  accessibilityKey,
  updateStatusKey,
  championsKey: (lang: RiotLocale) => ['champions', lang] as const,
  championProfileKey: (lang: RiotLocale, championId: string) =>
    ['championProfile', lang, championId] as const,
  buildKey: (modeId: GameModeId, lang: RiotLocale, championId: string, sourceKey: string) =>
    ['build', modeId, lang, championId, sourceKey] as const,
}

export function useSettingsQuery() {
  return useSWR<Settings>(settingsKey, async () => await getLolApi().getSettings())
}

export function useGameContextQuery() {
  return useSWR<GameContext>(gameContextKey, async () => await getLolApi().getGameContextSnapshot())
}

export function useActiveBuildQuery() {
  return useSWR<BuildResult | null>(activeBuildKey, async () => await getLolApi().getActiveBuildSnapshot())
}

export function useSupportedModesQuery() {
  return useSWR<SupportedMode[]>(supportedModesKey, async () => await getLolApi().getSupportedModes())
}

export function useAppUpdateStatusQuery() {
  return useSWR<AppUpdateStatus>(updateStatusKey, async () => await getMainLolApi().getAppUpdateStatus())
}

export function useChampionsQuery(lang: RiotLocale) {
  return useSWR<ChampionSummary[]>(swrKeys.championsKey(lang), async () => getLolApi().getChampions({ lang }))
}

export function useChampionProfileQuery(lang: RiotLocale, championId: string | null) {
  const key = championId ? swrKeys.championProfileKey(lang, championId) : null
  return useSWR<ChampionProfile>(key, async () => {
    if (!championId) throw new Error('championId is required')
    return await getLolApi().getChampionProfile({ championId, lang })
  })
}

export function useBuildQuery(
  modeId: GameModeId,
  lang: RiotLocale,
  championId: string | null,
  sourceKey: string,
) {
  const key = championId ? swrKeys.buildKey(modeId, lang, championId, sourceKey) : null
  return useSWR<BuildResult>(key, async () => {
    if (!championId) throw new Error('championId is required')
    return await getMainLolApi().getBuild({ mode: modeId, lang, championId })
  })
}

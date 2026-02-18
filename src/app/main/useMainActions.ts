import { useCallback, useState } from 'react'
import type { KeyedMutator, ScopedMutator } from 'swr'

import type { MainRendererApi } from '@shared/ipc'
import type { GameModeId } from '@shared/gameModes'

import type { BuildResult, RiotLocale, SettingsPatch } from '@/app/types'
import { swrKeys } from '@/app/hooks/use-lol-queries'

type Params = {
  api: MainRendererApi
  mutate: ScopedMutator
  mutateBuild: KeyedMutator<BuildResult>
  modeId: GameModeId
  effectiveLang: RiotLocale
  overlayPinned: boolean
  setError: (error: string | null) => void
  setClearingCacheMode: (modeId: GameModeId | null) => void
}

export function useMainActions({
  api,
  mutate,
  mutateBuild,
  modeId,
  effectiveLang,
  overlayPinned,
  setError,
  setClearingCacheMode,
}: Params) {
  const [refreshingBuild, setRefreshingBuild] = useState(false)

  const syncSettingsRelatedQueries = useCallback(async () => {
    await mutate(swrKeys.settingsKey)
    await mutate((key) => Array.isArray(key) && key[0] === 'build', undefined, { revalidate: false })
    await mutate(swrKeys.activeBuildKey, null, { revalidate: false })
  }, [mutate])

  const onRefreshBuild = useCallback(
    async (championId: string) => {
      setError(null)
      setRefreshingBuild(true)
      try {
        await mutateBuild(
          async () => await api.getBuild({ mode: modeId, championId, lang: effectiveLang, force: true }),
          { revalidate: false },
        )
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setRefreshingBuild(false)
      }
    },
    [api, effectiveLang, modeId, mutateBuild, setError],
  )

  const onClearCacheForMode = useCallback(
    async (mode: GameModeId) => {
      setClearingCacheMode(mode)
      setError(null)
      try {
        await api.clearBuildCache({ mode })
        await mutate((key) => Array.isArray(key) && key[0] === 'build' && key[1] === mode, undefined, {
          revalidate: false,
        })
        await mutate(swrKeys.activeBuildKey)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setClearingCacheMode(null)
      }
    },
    [api, mutate, setClearingCacheMode, setError],
  )

  const onApplySettingsPatch = useCallback(
    async (patch: SettingsPatch) => {
      try {
        await api.updateSettings(patch)
        await syncSettingsRelatedQueries()
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e))
      }
    },
    [api, setError, syncSettingsRelatedQueries],
  )

  const onResetSettings = useCallback(async () => {
    try {
      await api.resetSettings()
      await syncSettingsRelatedQueries()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [api, setError, syncSettingsRelatedQueries])

  const onRefreshGameContext = useCallback(async () => {
    try {
      const next = await api.refreshGameContext()
      await mutate(swrKeys.gameContextKey, next, { revalidate: false })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [api, mutate, setError])

  const onToggleOverlayPinned = useCallback(async () => {
    if (overlayPinned) {
      await onApplySettingsPatch({ overlay: { pinned: false } })
      return
    }
    await onApplySettingsPatch({ overlay: { pinned: true, interactive: true } })
  }, [onApplySettingsPatch, overlayPinned])

  const onLoadPlayerCareer = useCallback(async (puuid: string) => await api.getPlayerCareer({ puuid }), [api])

  const onLoadSummonerByPuuid = useCallback(
    async (puuid: string) => await api.getSummonerByPuuid({ puuid }),
    [api],
  )

  return {
    refreshingBuild,
    onRefreshBuild,
    onClearCacheForMode,
    onApplySettingsPatch,
    onResetSettings,
    onRefreshGameContext,
    onToggleOverlayPinned,
    onLoadPlayerCareer,
    onLoadSummonerByPuuid,
  }
}

import { useCallback, useDeferredValue, useEffect, useMemo, useTransition } from 'react'
import { useSWRConfig } from 'swr'

import { buildSourceKeyForMode } from '@shared/buildSource'
import { DEFAULT_OPGG_TIER, DEFAULT_OPGG_REGION } from '@shared/opgg'

import type { ChampionSummary, RiotLocale, Settings } from '@/app/types'
import { resolveUiLocale } from '@/app/i18n'
import { AppBackdrop } from '@/app/components/backdrop'
import { InGameHeaderTitle } from '@/app/game-session/InGameHeaderTitle'
import { InGamePanel } from '@/app/game-session/InGamePanel'
import { ChampionListPanel } from '@/app/main/ChampionListPanel'
import { MainHeader } from '@/app/main/MainHeader'
import { ModeSidebar } from '@/app/main/ModeSidebar'
import { useMainActions } from '@/app/main/useMainActions'
import { ModeDetailPanel } from '@/app/modes/ModeDetailPanel'
import {
  useAppUpdateStatusQuery,
  useActiveBuildQuery,
  useBuildQuery,
  useChampionProfileQuery,
  useChampionsQuery,
  useGameContextQuery,
  useSettingsQuery,
  useSupportedModesQuery,
} from '@/app/hooks/use-lol-queries'
import { getMainLolApi } from '@/app/services/lolApi'
import { useAppStore } from '@/app/store/useAppStore'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { TooltipProvider } from '@/components/ui/tooltip'

const EMPTY_CHAMPIONS: ChampionSummary[] = []
export default function MainApp() {
  const api = getMainLolApi()
  const [, startNavTransition] = useTransition()
  const { mutate } = useSWRConfig()

  const { data: settingsData } = useSettingsQuery()
  const settings: Settings | null = settingsData ?? null
  const { data: gameContextData } = useGameContextQuery()
  const gameContext = gameContextData ?? null

  const effectiveLang = useMemo<RiotLocale>(() => resolveUiLocale(settings?.language), [settings?.language])

  const { data: supportedModesData } = useSupportedModesQuery()
  const supportedModes = supportedModesData ?? null
  const { data: appUpdateStatusData } = useAppUpdateStatusQuery()
  const appUpdateStatus = appUpdateStatusData ?? null
  const { data: championsData } = useChampionsQuery(effectiveLang)
  const champions = championsData ?? EMPTY_CHAMPIONS
  const opggRegion = settings?.dataSource.opgg.region ?? DEFAULT_OPGG_REGION
  const opggTier = settings?.dataSource.opgg.tier ?? DEFAULT_OPGG_TIER
  const overlayPinned = !!settings?.overlay.pinned

  const mainPanel = useAppStore((s) => s.mainPanel)
  const setMainPanel = useAppStore((s) => s.setMainPanel)
  const modeId = useAppStore((s) => s.modeId)
  const buildSourceKey = buildSourceKeyForMode(modeId, { region: opggRegion, tier: opggTier })
  const setModeId = useAppStore((s) => s.setModeId)
  const selectedId = useAppStore((s) => s.selectedId)
  const setSelectedId = useAppStore((s) => s.setSelectedId)
  const query = useAppStore((s) => s.query)
  const setQuery = useAppStore((s) => s.setQuery)
  const showAllAugments = useAppStore((s) => s.showAllAugments)
  const setShowAllAugments = useAppStore((s) => s.setShowAllAugments)
  const clearingCacheMode = useAppStore((s) => s.clearingCacheMode)
  const setClearingCacheMode = useAppStore((s) => s.setClearingCacheMode)
  const setError = useAppStore((s) => s.setError)

  const { data: activeBuildData } = useActiveBuildQuery()
  const {
    data: buildData,
    isLoading: buildLoading,
    mutate: mutateBuild,
  } = useBuildQuery(modeId, effectiveLang, selectedId, buildSourceKey)

  const build = useMemo(() => {
    if (buildData) return buildData
    if (!selectedId || !activeBuildData) return null
    if (activeBuildData.mode !== modeId) return null
    if (String(activeBuildData.championId) !== String(selectedId)) return null
    return activeBuildData
  }, [activeBuildData, buildData, modeId, selectedId])

  const loading = !!selectedId && buildLoading

  const deferredQuery = useDeferredValue(query)
  const selectedChampion = useMemo(
    () => (selectedId ? (champions.find((c) => c.id === selectedId) ?? null) : null),
    [champions, selectedId],
  )
  const { data: championProfileData } = useChampionProfileQuery(effectiveLang, selectedId)
  const championProfile = championProfileData ?? null

  const filteredChampions = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase()
    if (!q) return champions
    return champions.filter((c) => `${c.name} ${c.title ?? ''} ${c.slug} ${c.id}`.toLowerCase().includes(q))
  }, [champions, deferredQuery])

  useEffect(() => {
    if (!supportedModes?.length) return
    if (!supportedModes.some((mode) => mode.id === modeId)) {
      setModeId(supportedModes[0].id)
    }
  }, [modeId, setModeId, supportedModes])

  const {
    refreshingBuild,
    onRefreshBuild,
    onClearCacheForMode,
    onApplySettingsPatch,
    onResetSettings,
    onRefreshGameContext,
    onToggleOverlayPinned,
    onLoadPlayerCareer,
    onLoadSummonerByPuuid,
    onCheckAppUpdate,
    onDownloadAppUpdate,
    onInstallAppUpdate,
  } = useMainActions({
    api,
    mutate,
    mutateBuild,
    modeId,
    effectiveLang,
    overlayPinned,
    setError,
    setClearingCacheMode,
  })

  const isInGamePanel = mainPanel === 'ingame'
  const isDetail = !isInGamePanel && !!selectedChampion
  const showInGameTab = !!gameContext?.isGameRelated
  const showSearch = !isInGamePanel && !isDetail
  const showBackButton = !isInGamePanel && isDetail

  const detectedGameChampion = useMemo(() => {
    const id = gameContext?.detectedChampionId
    if (!id) return null
    return champions.find((c) => c.id === String(id)) ?? null
  }, [champions, gameContext?.detectedChampionId])
  const defaultBackdropUrl = useMemo(() => {
    if (gameContext?.lcu.phase !== 'InProgress') return null
    return detectedGameChampion?.splashUrl ?? null
  }, [detectedGameChampion?.splashUrl, gameContext?.lcu.phase])
  const openChampion = useCallback(
    (championId: string) => startNavTransition(() => setSelectedId(championId)),
    [setSelectedId, startNavTransition],
  )
  const backToList = useCallback(
    () => startNavTransition(() => setSelectedId(null)),
    [setSelectedId, startNavTransition],
  )

  useEffect(() => {
    if (showInGameTab) return
    if (mainPanel !== 'ingame') return
    setMainPanel('build')
  }, [mainPanel, setMainPanel, showInGameTab])

  return (
    <TooltipProvider delayDuration={150}>
      <div className="relative h-full w-full">
        <div className="relative isolate h-full w-full overflow-hidden">
          <AppBackdrop imageUrl={isDetail ? selectedChampion?.splashUrl : defaultBackdropUrl} />
          <div className="flex h-full min-w-0">
            <ModeSidebar
              modeId={modeId}
              setModeId={setModeId}
              onModeSwitchToList={() => {
                // Switching game mode should always return to the mode's list view.
                setSelectedId(null)
              }}
              mainPanel={mainPanel}
              setMainPanel={setMainPanel}
              showInGameTab={showInGameTab}
              supportedModes={supportedModes}
              settings={settings}
              gameContext={gameContext}
              clearingCacheMode={clearingCacheMode}
              onRefreshGameContext={onRefreshGameContext}
              onApplySettingsPatch={onApplySettingsPatch}
              onClearCacheForMode={onClearCacheForMode}
              onResetSettings={onResetSettings}
              appUpdateStatus={appUpdateStatus}
              onCheckAppUpdate={onCheckAppUpdate}
              onDownloadAppUpdate={onDownloadAppUpdate}
              onInstallAppUpdate={onInstallAppUpdate}
            />

            <main className="flex min-w-0 flex-1 flex-col bg-background">
              <MainHeader
                showBackButton={showBackButton}
                showSearch={showSearch}
                query={query}
                title={
                  isInGamePanel ? (
                    <InGameHeaderTitle gameContext={gameContext} supportedModes={supportedModes} />
                  ) : (
                    (selectedChampion?.name ?? null)
                  )
                }
                overlayPinned={overlayPinned}
                onBack={backToList}
                onQueryChange={setQuery}
                onToggleOverlayPinned={onToggleOverlayPinned}
                onWindowMinimize={api.windowMinimize}
                onWindowClose={api.windowClose}
              />

              <section className="min-h-0 flex flex-1 flex-col p-5">
                <div
                  className={cn('min-h-0 flex-1', mainPanel === 'build' && !isDetail ? 'block' : 'hidden')}
                  aria-hidden={mainPanel !== 'build' || isDetail}
                >
                  <ChampionListPanel
                    active={mainPanel === 'build' && !isDetail}
                    champions={champions}
                    filteredChampions={filteredChampions}
                    onOpenChampion={openChampion}
                  />
                </div>

                {mainPanel === 'build' && isDetail ? (
                  <ModeDetailPanel
                    champions={champions}
                    modeId={modeId}
                    selectedChampion={selectedChampion}
                    championProfile={championProfile}
                    build={build}
                    gameRelated={!!gameContext?.isGameRelated}
                    loading={loading}
                    refreshing={refreshingBuild}
                    selectedId={selectedId}
                    showAllAugments={showAllAugments}
                    onToggleShowAllAugments={() => setShowAllAugments(!showAllAugments)}
                    onRefreshBuild={onRefreshBuild}
                  />
                ) : null}

                {isInGamePanel ? (
                  <div className="min-h-0 flex-1">
                    <ScrollArea className="h-full">
                      <InGamePanel
                        champions={champions}
                        gameContext={gameContext}
                        onLoadPlayerCareer={onLoadPlayerCareer}
                        onLoadSummonerByPuuid={onLoadSummonerByPuuid}
                        onOpenChampion={(championId) => {
                          setMainPanel('build')
                          if (gameContext?.isSupportedMode) setModeId(gameContext.modeId)
                          openChampion(championId)
                        }}
                      />
                    </ScrollArea>
                  </div>
                ) : null}
              </section>
            </main>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}

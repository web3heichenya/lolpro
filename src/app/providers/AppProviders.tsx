import type { PropsWithChildren } from 'react'
import { useEffect } from 'react'
import { SWRConfig, useSWRConfig } from 'swr'

import { getLolApi } from '@/app/services/lolApi'
import { useAppStore } from '@/app/store/useAppStore'
import { swrKeys, useSettingsQuery } from '@/app/hooks/use-lol-queries'
import { I18nProvider, resolveUiLocale } from '@/app/i18n'
import { applyTheme } from '@/app/theme'

function IpcEventBridge() {
  const { mutate } = useSWRConfig()

  useEffect(() => {
    const api = window.mainApi ?? window.overlayApi
    if (!api) return

    const offSettings = api.onSettingsChanged((settings) => {
      void mutate(swrKeys.settingsKey, settings, false)
    })

    const offGc = api.onGameContextChanged((gc) => {
      void mutate(swrKeys.gameContextKey, gc, false)
    })

    const offBuild = api.onActiveBuildChanged((build) => {
      void mutate(swrKeys.activeBuildKey, build, false)
    })

    const offDetected = api.onDetectedChampionChanged((championId) => {
      useAppStore.getState().setSelectedId(String(championId))
    })

    const offUpdate =
      window.mainApi?.onAppUpdateStatusChanged((status) => {
        void mutate(swrKeys.updateStatusKey, status, false)
      }) ?? (() => {})

    if (window.mainApi) {
      void window.mainApi.startLcuAutoDetect().catch(() => {})
    }

    return () => {
      offSettings()
      offGc()
      offBuild()
      offDetected()
      offUpdate()
    }
  }, [mutate])

  return null
}

function I18nSettingsBridge({ children }: PropsWithChildren) {
  const { data: settings } = useSettingsQuery()
  const locale = resolveUiLocale(settings?.language)
  return <I18nProvider locale={locale}>{children}</I18nProvider>
}

function ThemeSettingsBridge() {
  const { data: settings } = useSettingsQuery()
  const preference = settings?.theme.preference ?? 'system'

  useEffect(() => {
    applyTheme(preference)
  }, [preference])

  useEffect(() => {
    if (preference !== 'system') return

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('system')
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [preference])

  return null
}

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <SWRConfig
      value={{
        fetcher: async (key: string) => {
          const api = getLolApi()
          if (key === swrKeys.settingsKey) return await api.getSettings()
          if (key === swrKeys.gameContextKey) return await api.getGameContextSnapshot()
          if (key === swrKeys.activeBuildKey) return await api.getActiveBuildSnapshot()
          if (key === swrKeys.supportedModesKey) return await api.getSupportedModes()
          if (key === swrKeys.accessibilityKey) return await api.getAccessibilityStatus()
          throw new Error(`Unknown SWR key: ${key}`)
        },
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        shouldRetryOnError: false,
        dedupingInterval: 800,
        errorRetryCount: 0,
        keepPreviousData: true,
      }}
    >
      <IpcEventBridge />
      <ThemeSettingsBridge />
      <I18nSettingsBridge>{children}</I18nSettingsBridge>
    </SWRConfig>
  )
}

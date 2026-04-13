import { createContext, useCallback, useContext, useMemo, type PropsWithChildren } from 'react'

import enUS from './locales/en_US.json'
import zhCN from './locales/zh_CN.json'

export type UiLocale = 'en_US' | 'zh_CN'
type TranslationTable = Record<string, string>
type TranslateParams = Record<string, string | number | null | undefined>

const RESOURCES: Record<UiLocale, TranslationTable> = {
  en_US: enUS,
  zh_CN: zhCN,
}

function interpolate(template: string, params?: TranslateParams): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (_, token: string) => {
    const value = params[token]
    if (value == null) return ''
    return String(value)
  })
}

function translate(locale: UiLocale, key: string, params?: TranslateParams): string {
  const dict = RESOURCES[locale]
  const fallbackDict = RESOURCES.zh_CN
  const template = dict[key] ?? fallbackDict[key] ?? key
  return interpolate(template, params)
}

export function resolveUiLocale(language: string | null | undefined): UiLocale {
  if (language === 'en_US') return 'en_US'
  if (language === 'zh_CN') return 'zh_CN'

  const browser = (typeof navigator !== 'undefined' ? navigator.language : 'en-US').toLowerCase()
  return browser.startsWith('zh') ? 'zh_CN' : 'en_US'
}

type I18nContextValue = {
  locale: UiLocale
  t: (key: string, params?: TranslateParams) => string
}

const I18nContext = createContext<I18nContextValue>({
  locale: 'en_US',
  t: (key: string, params?: TranslateParams) => translate('en_US', key, params),
})

export function I18nProvider({ locale, children }: PropsWithChildren<{ locale: UiLocale }>) {
  const t = useCallback((key: string, params?: TranslateParams) => translate(locale, key, params), [locale])
  const value = useMemo(() => ({ locale, t }), [locale, t])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  return useContext(I18nContext)
}

import type { RiotLocale } from '../../../shared/contracts'

export type { RiotLocale }

export function normalizeRiotLocale(lang?: string): RiotLocale {
  if (!lang) return 'en_US'
  if (lang === 'en_US' || lang === 'zh_CN' || lang === 'zh_TW') return lang

  const l = lang.toLowerCase()
  if (l.startsWith('zh-cn') || l.startsWith('zh_hans') || l.startsWith('zh-hans')) return 'zh_CN'
  if (l.startsWith('zh-tw') || l.startsWith('zh_hant') || l.startsWith('zh-hant')) return 'zh_TW'
  if (l === 'en' || l.startsWith('en-')) return 'en_US'
  return lang as RiotLocale
}

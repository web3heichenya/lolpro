import type { ThemePreference } from '@/app/types'

export type ResolvedTheme = 'light' | 'dark'

export function getSystemTheme(): ResolvedTheme {
  return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ? 'dark' : 'light'
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === 'system') return getSystemTheme()
  return preference
}

export function applyTheme(preference: ThemePreference) {
  const resolved = resolveTheme(preference)
  const root = document.documentElement
  root.classList.toggle('dark', resolved === 'dark')
  root.style.colorScheme = resolved
}

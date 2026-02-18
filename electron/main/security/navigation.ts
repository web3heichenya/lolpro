const DEV_DEFAULT_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173']

function tryParseOrigin(raw: string): string | null {
  try {
    const parsed = new URL(raw)
    return parsed.origin
  } catch {
    return null
  }
}

export function buildTrustedRendererOrigins(devServerUrl?: string): Set<string> {
  const origins = new Set<string>(['file://'])

  if (process.env.NODE_ENV === 'production') return origins

  for (const origin of DEV_DEFAULT_ORIGINS) origins.add(origin)

  if (devServerUrl) {
    const origin = tryParseOrigin(devServerUrl)
    if (origin) origins.add(origin)
  }

  return origins
}

export function isTrustedRendererUrl(url: string, trustedOrigins: Set<string>): boolean {
  if (!url) return false
  if (url.startsWith('file://')) return trustedOrigins.has('file://')

  const origin = tryParseOrigin(url)
  if (!origin) return false
  return trustedOrigins.has(origin)
}

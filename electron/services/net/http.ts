import { resolveFetch } from './fetch'
import { DEFAULT_BROWSER_USER_AGENT } from './constants'

type FetchInit = RequestInit & { timeoutMs?: number }

function mergeHeaders(initHeaders?: RequestInit['headers'], accept?: string): Headers {
  const headers = new Headers(initHeaders ?? {})
  if (!headers.has('user-agent')) headers.set('user-agent', DEFAULT_BROWSER_USER_AGENT)
  if (accept && !headers.has('accept')) headers.set('accept', accept)
  return headers
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchWithTimeout(url: string, init?: FetchInit): Promise<Response> {
  const controller = new AbortController()
  const { timeoutMs, headers, ...rest } = init ?? {}
  const timeout = setTimeout(() => controller.abort(), timeoutMs ?? 15_000)
  try {
    const fetchImpl = await resolveFetch()
    return await fetchImpl(url, {
      ...rest,
      signal: controller.signal,
      headers: mergeHeaders(headers),
    })
  } finally {
    clearTimeout(timeout)
  }
}

async function ensureOk(res: Response, url: string): Promise<void> {
  if (res.ok) return
  const text = await res.text().catch(() => '')
  throw new Error(`HTTP ${res.status} for ${url}${text ? `: ${text.slice(0, 180)}` : ''}`)
}

export async function fetchTextWithFallback(
  urls: string[],
  init?: FetchInit & { attempts?: number; sleepMs?: number },
): Promise<string> {
  const attempts = Math.max(1, init?.attempts ?? 2)
  const sleepMs = init?.sleepMs ?? 250
  const { attempts: _attempts, sleepMs: _sleepMs, ...requestInit } = init ?? {}
  void _attempts
  void _sleepMs
  const errors: string[] = []
  for (const url of urls) {
    for (let attempt = 0; attempt < attempts; attempt++) {
      try {
        return await fetchText(url, requestInit)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        errors.push(`${url}#${attempt + 1}: ${message}`)
        if (attempt < attempts - 1 && sleepMs > 0) await sleep(sleepMs)
      }
    }
  }
  throw new Error(`Failed to fetch text: ${errors.join(' | ')}`)
}

export async function fetchJson<T>(url: string, init?: FetchInit): Promise<T> {
  const res = await fetchWithTimeout(url, {
    ...init,
    headers: mergeHeaders(init?.headers, 'application/json'),
  })
  await ensureOk(res, url)
  return (await res.json()) as T
}

export async function fetchText(url: string, init?: FetchInit): Promise<string> {
  const res = await fetchWithTimeout(url, {
    ...init,
    headers: mergeHeaders(init?.headers, 'text/plain'),
  })
  await ensureOk(res, url)
  return await res.text()
}

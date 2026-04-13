import { app, net } from 'electron'

export async function resolveFetch(): Promise<typeof fetch> {
  if (!app.isReady()) {
    await app.whenReady()
  }
  if (typeof net.fetch === 'function') {
    return net.fetch.bind(net) as typeof fetch
  }
  return fetch
}

import type { BaseRendererApi, MainRendererApi } from '@shared/ipc'

export function getLolApi(): BaseRendererApi {
  const api = window.mainApi ?? window.overlayApi
  if (!api) throw new Error('Renderer API is not available')
  return api
}

export function getMainLolApi(): MainRendererApi {
  const api = window.mainApi
  if (!api) throw new Error('Main renderer API is not available in this window')
  return api
}

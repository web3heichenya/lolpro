import type { MainRendererApi, OverlayRendererApi } from '@shared/ipc'

declare global {
  interface Window {
    mainApi?: MainRendererApi
    overlayApi?: OverlayRendererApi
  }
}

export {}

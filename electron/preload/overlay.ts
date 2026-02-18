import { contextBridge } from 'electron'

import type { OverlayRendererApi } from '../../shared/ipc'
import { createBaseRendererApi } from './baseApi'

const overlayApi: OverlayRendererApi = {
  ...createBaseRendererApi(),
}

contextBridge.exposeInMainWorld('overlayApi', overlayApi)

import { contextBridge } from 'electron'

import type { OverlayRendererApi } from '../../shared/ipc/rendererApi'
import { createBaseRendererApi } from './baseApi'

const overlayApi: OverlayRendererApi = {
  ...createBaseRendererApi(),
}

contextBridge.exposeInMainWorld('overlayApi', overlayApi)

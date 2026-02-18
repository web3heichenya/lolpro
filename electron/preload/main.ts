import { contextBridge } from 'electron'

import { IPC_CHANNELS, type MainRendererApi } from '../../shared/ipc'
import { invokeIpc } from './ipcClient'
import { createBaseRendererApi } from './baseApi'

const mainApi: MainRendererApi = {
  ...createBaseRendererApi(),

  getBuild: async (opts) => await invokeIpc(IPC_CHANNELS.invoke.buildGet, opts),
  clearBuildCache: async (opts) => await invokeIpc(IPC_CHANNELS.invoke.buildClearCache, opts),

  startLcuAutoDetect: async () => await invokeIpc(IPC_CHANNELS.invoke.gameStartLcuAutoDetect),
  updateSettings: async (patch) => await invokeIpc(IPC_CHANNELS.invoke.settingsUpdate, patch),
  resetSettings: async () => await invokeIpc(IPC_CHANNELS.invoke.settingsReset),

  toggleOverlay: async () => await invokeIpc(IPC_CHANNELS.invoke.overlayToggle),
  setOverlayVisible: async (visible) => await invokeIpc(IPC_CHANNELS.invoke.overlaySetVisible, { visible }),
  setOverlayInteractive: async (interactive) =>
    await invokeIpc(IPC_CHANNELS.invoke.overlaySetInteractive, { interactive }),

  windowMinimize: async () => await invokeIpc(IPC_CHANNELS.invoke.windowMinimize),
  windowMaximizeToggle: async () => await invokeIpc(IPC_CHANNELS.invoke.windowMaximizeToggle),
  windowClose: async () => await invokeIpc(IPC_CHANNELS.invoke.windowClose),
}

contextBridge.exposeInMainWorld('mainApi', mainApi)

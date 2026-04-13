import { contextBridge } from 'electron'

import { IPC_CHANNELS } from '../../shared/ipc/channels'
import type { MainRendererApi } from '../../shared/ipc/rendererApi'
import { invokeIpc, subscribeIpcEvent } from './ipcClient'
import { createBaseRendererApi } from './baseApi'

const mainApi: MainRendererApi = {
  ...createBaseRendererApi(),

  getBuild: async (opts) => await invokeIpc(IPC_CHANNELS.invoke.buildGet, opts),
  clearBuildCache: async (opts) => await invokeIpc(IPC_CHANNELS.invoke.buildClearCache, opts),

  startLcuAutoDetect: async () => await invokeIpc(IPC_CHANNELS.invoke.gameStartLcuAutoDetect),
  updateSettings: async (patch) => await invokeIpc(IPC_CHANNELS.invoke.settingsUpdate, patch),
  resetSettings: async () => await invokeIpc(IPC_CHANNELS.invoke.settingsReset),
  getAppUpdateStatus: async () => await invokeIpc(IPC_CHANNELS.invoke.updateGetStatus),
  checkForAppUpdates: async () => await invokeIpc(IPC_CHANNELS.invoke.updateCheck),
  downloadAppUpdate: async () => await invokeIpc(IPC_CHANNELS.invoke.updateDownload),
  installAppUpdate: async () => await invokeIpc(IPC_CHANNELS.invoke.updateInstall),
  onAppUpdateStatusChanged: (cb) => subscribeIpcEvent(IPC_CHANNELS.event.updateStatusChanged, cb),

  toggleOverlay: async () => await invokeIpc(IPC_CHANNELS.invoke.overlayToggle),
  setOverlayVisible: async (visible) => await invokeIpc(IPC_CHANNELS.invoke.overlaySetVisible, { visible }),
  setOverlayInteractive: async (interactive) =>
    await invokeIpc(IPC_CHANNELS.invoke.overlaySetInteractive, { interactive }),

  windowMinimize: async () => await invokeIpc(IPC_CHANNELS.invoke.windowMinimize),
  windowMaximizeToggle: async () => await invokeIpc(IPC_CHANNELS.invoke.windowMaximizeToggle),
  windowClose: async () => await invokeIpc(IPC_CHANNELS.invoke.windowClose),
}

contextBridge.exposeInMainWorld('mainApi', mainApi)

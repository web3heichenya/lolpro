import { IPC_CHANNELS } from '../../shared/ipc/channels'
import type { BaseRendererApi } from '../../shared/ipc/rendererApi'
import { invokeIpc, subscribeIpcEvent } from './ipcClient'
import { getRendererPlatform } from './platform'

export function createBaseRendererApi(): BaseRendererApi {
  return {
    platform: getRendererPlatform(),

    getChampions: async (opts) => await invokeIpc(IPC_CHANNELS.invoke.buildGetChampions, opts),
    getChampionProfile: async (opts) => await invokeIpc(IPC_CHANNELS.invoke.buildGetChampionProfile, opts),
    getSupportedModes: async () => await invokeIpc(IPC_CHANNELS.invoke.buildGetSupportedModes),

    getLcuStatus: async () => await invokeIpc(IPC_CHANNELS.invoke.gameGetLcuStatus),
    onLcuStatusChanged: (cb) => subscribeIpcEvent(IPC_CHANNELS.event.gameLcuStatusChanged, cb),
    onDetectedChampionChanged: (cb) => subscribeIpcEvent(IPC_CHANNELS.event.gameDetectedChampionChanged, cb),

    getActiveBuildSnapshot: async () => await invokeIpc(IPC_CHANNELS.invoke.gameGetActiveBuildSnapshot),
    onActiveBuildChanged: (cb) => subscribeIpcEvent(IPC_CHANNELS.event.gameActiveBuildChanged, cb),

    getGameContextSnapshot: async () => await invokeIpc(IPC_CHANNELS.invoke.gameGetContextSnapshot),
    refreshGameContext: async () => await invokeIpc(IPC_CHANNELS.invoke.gameRefreshContext),
    getPlayerCareer: async (opts) => await invokeIpc(IPC_CHANNELS.invoke.gameGetPlayerCareer, opts),
    getSummonerByPuuid: async (opts) => await invokeIpc(IPC_CHANNELS.invoke.gameGetSummonerByPuuid, opts),
    onGameContextChanged: (cb) => subscribeIpcEvent(IPC_CHANNELS.event.gameContextChanged, cb),

    getSettings: async () => await invokeIpc(IPC_CHANNELS.invoke.settingsGet),
    onSettingsChanged: (cb) => subscribeIpcEvent(IPC_CHANNELS.event.settingsChanged, cb),

    getAccessibilityStatus: async () => await invokeIpc(IPC_CHANNELS.invoke.systemGetAccessibilityStatus),
    openAccessibilitySettings: async () =>
      await invokeIpc(IPC_CHANNELS.invoke.systemOpenAccessibilitySettings),
  }
}

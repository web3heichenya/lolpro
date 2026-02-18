import { BrowserWindow } from 'electron'

import { IPC_CHANNELS, type EventChannel, type EventPayload } from '../../../shared/ipc'
import type { MainProcessDependencies } from '../bootstrap/dependencies'

function broadcast<TChannel extends EventChannel>(channel: TChannel, payload: EventPayload<TChannel>) {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channel, payload)
  }
}

export function registerMainToRendererEvents(
  dependencies: Pick<MainProcessDependencies, 'settingsStore' | 'gameContext'>,
) {
  const onGameContextChanged = () => {
    const snapshot = dependencies.gameContext.getSnapshot()
    broadcast(IPC_CHANNELS.event.gameContextChanged, snapshot)
    broadcast(IPC_CHANNELS.event.gameLcuStatusChanged, snapshot.lcu)
  }

  const onDetectedChampionChanged = (championId: number) => {
    broadcast(IPC_CHANNELS.event.gameDetectedChampionChanged, championId)
  }

  const onActiveBuildChanged = () => {
    broadcast(IPC_CHANNELS.event.gameActiveBuildChanged, dependencies.gameContext.getActiveBuild())
  }

  const onSettingsChanged = () => {
    broadcast(IPC_CHANNELS.event.settingsChanged, dependencies.settingsStore.get())
  }

  dependencies.gameContext.on('changed', onGameContextChanged)
  dependencies.gameContext.on('detectedChampionChanged', onDetectedChampionChanged)
  dependencies.gameContext.on('activeBuildChanged', onActiveBuildChanged)
  dependencies.settingsStore.on('changed', onSettingsChanged)

  return () => {
    dependencies.gameContext.off('changed', onGameContextChanged)
    dependencies.gameContext.off('detectedChampionChanged', onDetectedChampionChanged)
    dependencies.gameContext.off('activeBuildChanged', onActiveBuildChanged)
    dependencies.settingsStore.off('changed', onSettingsChanged)
  }
}

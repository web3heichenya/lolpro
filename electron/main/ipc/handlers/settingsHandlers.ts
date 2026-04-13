import { IPC_CHANNELS } from '../../../../shared/ipc'
import type { MainProcessDependencies } from '../../bootstrap/dependencies'
import type { AppRuntime } from '../../services/appRuntime'
import type { createIpcRegistry } from '../registry'

type Registry = ReturnType<typeof createIpcRegistry>

export function registerSettingsHandlers(
  registry: Registry,
  runtime: AppRuntime,
  dependencies: Pick<MainProcessDependencies, 'settingsStore'>,
) {
  registry.handle(IPC_CHANNELS.invoke.settingsGet, async () => dependencies.settingsStore.get())

  registry.handle(IPC_CHANNELS.invoke.settingsUpdate, async (patch) => {
    return await runtime.updateSettings(patch)
  })

  registry.handle(IPC_CHANNELS.invoke.settingsReset, async () => {
    return await runtime.resetSettings()
  })
}

import { IPC_CHANNELS } from '../../../../shared/ipc'
import type { MainServices } from '../../services'
import type { createIpcRegistry } from '../registry'

type Registry = ReturnType<typeof createIpcRegistry>

export function registerUpdateHandlers(registry: Registry, services: Pick<MainServices, 'updateService'>) {
  registry.handle(IPC_CHANNELS.invoke.updateGetStatus, async () => services.updateService.getStatus())

  registry.handle(IPC_CHANNELS.invoke.updateCheck, async () => {
    return await services.updateService.checkForUpdates()
  })

  registry.handle(IPC_CHANNELS.invoke.updateDownload, async () => {
    return await services.updateService.downloadUpdate()
  })

  registry.handle(IPC_CHANNELS.invoke.updateInstall, async () => {
    services.updateService.installUpdate()
    return undefined
  })
}

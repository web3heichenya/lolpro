import { IPC_CHANNELS } from '../../../../shared/ipc'
import type { MainServices } from '../../services'
import type { createIpcRegistry } from '../registry'

type Registry = ReturnType<typeof createIpcRegistry>

export function registerBuildHandlers(registry: Registry, services: Pick<MainServices, 'buildService'>) {
  registry.handle(
    IPC_CHANNELS.invoke.buildGetChampions,
    async (opts) => await services.buildService.getChampions(opts),
  )

  registry.handle(IPC_CHANNELS.invoke.buildGetChampionProfile, async (opts) => {
    return await services.buildService.getChampionProfile(opts)
  })

  registry.handle(IPC_CHANNELS.invoke.buildGetSupportedModes, async () => {
    return await services.buildService.getSupportedModes()
  })

  registry.handle(IPC_CHANNELS.invoke.buildGet, async (opts) => {
    return await services.buildService.getBuild(opts)
  })

  registry.handle(IPC_CHANNELS.invoke.buildClearCache, async (opts) => {
    await services.buildService.clearBuildCache(opts.mode)
    return undefined
  })
}

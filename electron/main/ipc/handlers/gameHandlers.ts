import { IPC_CHANNELS } from '../../../../shared/ipc'
import type { MainServices } from '../../services'
import type { createIpcRegistry } from '../registry'

type Registry = ReturnType<typeof createIpcRegistry>

export function registerGameHandlers(registry: Registry, services: Pick<MainServices, 'gameService'>) {
  registry.handle(IPC_CHANNELS.invoke.gameGetActiveBuildSnapshot, async () => {
    return services.gameService.getActiveBuildSnapshot()
  })

  registry.handle(IPC_CHANNELS.invoke.gameGetContextSnapshot, async () => {
    return services.gameService.getContextSnapshot()
  })

  registry.handle(IPC_CHANNELS.invoke.gameRefreshContext, async () => {
    return await services.gameService.refreshContext()
  })

  registry.handle(IPC_CHANNELS.invoke.gameGetPlayerCareer, async ({ puuid }) => {
    return await services.gameService.getPlayerCareer(puuid)
  })

  registry.handle(IPC_CHANNELS.invoke.gameGetSummonerByPuuid, async ({ puuid }) => {
    return await services.gameService.getSummonerByPuuid(puuid)
  })

  registry.handle(IPC_CHANNELS.invoke.gameGetLcuStatus, async () => {
    return services.gameService.getLcuStatus()
  })

  registry.handle(IPC_CHANNELS.invoke.gameStartLcuAutoDetect, async () => {
    await services.gameService.startLcuAutoDetect()
    return undefined
  })
}

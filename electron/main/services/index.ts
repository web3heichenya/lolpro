import type { MainProcessDependencies } from '../bootstrap/dependencies'
import { BuildService } from './buildService'
import { GameService } from './gameService'
import { UpdateService } from './updateService'
import { log } from '../../services/logging/logger'

export type MainServices = {
  buildService: BuildService
  gameService: GameService
  updateService: UpdateService
}

export function createMainServices(dependencies: MainProcessDependencies): MainServices {
  return {
    buildService: new BuildService(
      dependencies.gameContext,
      dependencies.dataRepository,
      dependencies.structuredRepository,
      dependencies.blitzService,
      dependencies.opggService,
      dependencies.buildFetcher,
    ),
    gameService: new GameService(dependencies.gameContext),
    updateService: new UpdateService(log('updater')),
  }
}

import type { MainProcessDependencies } from '../bootstrap/dependencies'
import { BuildService } from './buildService'
import { GameService } from './gameService'

export type MainServices = {
  buildService: BuildService
  gameService: GameService
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
  }
}

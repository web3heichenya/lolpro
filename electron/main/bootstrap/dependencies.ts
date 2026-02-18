import { closeDb, getDatabaseHealth, getDb } from '../../services/db/client'
import { DataRepository } from '../../services/db/dataRepository'
import { StructuredRepository } from '../../services/db/structuredRepository'
import { BlitzService } from '../../services/blitz/blitz'
import { BlitzWebService } from '../../services/blitz-web/service'
import { OPGGService } from '../../services/opgg/service'
import { SettingsStore } from '../../services/settings/settingsStore'
import { GameContextManager } from '../../state/gameContextManager'
import { createBuildResolver, type BuildResolver } from '../../modes'
import { BuildFetcher } from '../services/buildFetcher'

export type MainProcessDependencies = {
  settingsStore: SettingsStore
  gameContext: GameContextManager
  dataRepository: DataRepository
  structuredRepository: StructuredRepository
  blitzService: BlitzService
  blitzWebService: BlitzWebService
  opggService: OPGGService
  buildResolver: BuildResolver
  buildFetcher: BuildFetcher
  databaseLifecycle: {
    init: () => void
    close: () => void
    getHealth: typeof getDatabaseHealth
  }
}

export function createMainProcessDependencies(): MainProcessDependencies {
  const dbAccessor = () => getDb()
  const settingsStore = new SettingsStore()
  const dataRepository = new DataRepository(dbAccessor)
  const structuredRepository = new StructuredRepository(dbAccessor)
  const blitzService = new BlitzService({
    dataRepository,
    structuredRepository,
  })
  const blitzWebService = new BlitzWebService()
  const opggService = new OPGGService(dataRepository)
  const buildResolver = createBuildResolver(opggService, blitzWebService)
  const buildFetcher = new BuildFetcher(dataRepository, buildResolver, settingsStore, blitzService)
  const gameContext = new GameContextManager({
    getBuild: buildFetcher.getBuild.bind(buildFetcher),
    getChampions: blitzService.getChampions.bind(blitzService),
  })

  return {
    settingsStore,
    gameContext,
    dataRepository,
    structuredRepository,
    blitzService,
    blitzWebService,
    opggService,
    buildResolver,
    buildFetcher,
    databaseLifecycle: {
      init: () => {
        getDb()
      },
      close: () => {
        closeDb()
      },
      getHealth: getDatabaseHealth,
    },
  }
}

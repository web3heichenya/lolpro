import type {
  BuildResult,
  GameContext,
  LcuStatus,
  PlayerCareerSnapshot,
  SummonerInfo,
} from '../../../shared/contracts'
import type { GameContextManager } from '../../state/gameContextManager'

export class GameService {
  constructor(private readonly gameContext: GameContextManager) {}

  getActiveBuildSnapshot(): BuildResult | null {
    return this.gameContext.getActiveBuild()
  }

  getContextSnapshot(): GameContext {
    return this.gameContext.getSnapshot()
  }

  getLcuStatus(): LcuStatus {
    return this.gameContext.getSnapshot().lcu
  }

  async startLcuAutoDetect(): Promise<void> {
    await this.gameContext.start()
  }

  async refreshContext(): Promise<GameContext> {
    await this.gameContext.refreshNow()
    return this.gameContext.getSnapshot()
  }

  async getPlayerCareer(puuid: string): Promise<PlayerCareerSnapshot> {
    return await this.gameContext.getPlayerCareer(puuid)
  }

  async getSummonerByPuuid(puuid: string): Promise<SummonerInfo | null> {
    return await this.gameContext.getSummonerByPuuid(puuid)
  }
}

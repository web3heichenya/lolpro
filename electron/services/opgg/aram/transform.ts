import type { AramBuildResult, RiotLocale } from '../../../../shared/contracts'
import type { ItemMeta, OpggChampionBuildResponse, SummonerSpellMeta } from '../types'
import { transformOpggToAramMayhemBuild } from '../aram-mayhem/transform'

type TransformInput = {
  championId: number
  aram: OpggChampionBuildResponse
  patch: string
  assetPatch: string
  dataSource?: string
  itemMetaMap: Record<string, ItemMeta>
  spellMetaMap: Record<number, SummonerSpellMeta>
  _lang?: RiotLocale
}

export function transformOpggToAramBuild(input: TransformInput): AramBuildResult {
  const base = transformOpggToAramMayhemBuild({
    championId: input.championId,
    arena: input.aram,
    patch: input.patch,
    assetPatch: input.assetPatch,
    dataSource: input.dataSource,
    itemMetaMap: input.itemMetaMap,
    spellMetaMap: input.spellMetaMap,
    augmentMetaMap: new Map(),
    _lang: input._lang,
  })

  // ARAM has no augment system. Keep the rest of the transformed payload.
  return {
    ...base,
    mode: 'aram',
    augments: [],
  }
}

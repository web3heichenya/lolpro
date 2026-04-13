import type { RankedBuildResult, RiotLocale } from '../../../../shared/contracts'
import type {
  ItemMeta,
  OpggChampionBuildResponse,
  PerkMeta,
  PerkStyleMeta,
  SummonerSpellMeta,
} from '../types'
import { transformOpggToAramBuild } from '../aram/transform'

type RankedPosition = 'top' | 'jungle' | 'mid' | 'adc' | 'support'

type TransformInput = {
  championId: number
  ranked: OpggChampionBuildResponse
  patch: string
  assetPatch: string
  dataSource?: string
  itemMetaMap: Record<string, ItemMeta>
  spellMetaMap: Record<number, SummonerSpellMeta>
  perkMetaMap?: Record<number, PerkMeta>
  perkStyleMetaMap?: Record<number, PerkStyleMeta>
  position: RankedPosition
  _lang?: RiotLocale
}

export function transformOpggToRankedBuild(input: TransformInput): RankedBuildResult {
  const base = transformOpggToAramBuild({
    championId: input.championId,
    aram: input.ranked,
    patch: input.patch,
    assetPatch: input.assetPatch,
    dataSource: input.dataSource,
    itemMetaMap: input.itemMetaMap,
    spellMetaMap: input.spellMetaMap,
    perkMetaMap: input.perkMetaMap,
    perkStyleMetaMap: input.perkStyleMetaMap,
    _lang: input._lang,
  })

  return {
    ...base,
    mode: 'ranked',
    position: input.position,
  }
}

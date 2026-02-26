import type { RiotLocale, UrfBuildResult } from '../../../../shared/contracts'
import type {
  ItemMeta,
  OpggChampionBuildResponse,
  PerkMeta,
  PerkStyleMeta,
  SummonerSpellMeta,
} from '../types'
import { transformOpggToAramBuild } from '../aram/transform'

type TransformInput = {
  championId: number
  urf: OpggChampionBuildResponse
  patch: string
  assetPatch: string
  dataSource?: string
  itemMetaMap: Record<string, ItemMeta>
  spellMetaMap: Record<number, SummonerSpellMeta>
  perkMetaMap?: Record<number, PerkMeta>
  perkStyleMetaMap?: Record<number, PerkStyleMeta>
  _lang?: RiotLocale
}

export function transformOpggToUrfBuild(input: TransformInput): UrfBuildResult {
  const base = transformOpggToAramBuild({
    championId: input.championId,
    aram: input.urf,
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
    mode: 'urf',
  }
}

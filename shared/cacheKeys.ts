import type { GameModeId } from './gameModes'
import { toArenaTier, type OpggRegion, type OpggTier } from './opgg'

// Central place to manage all persistent cache keys / source identifiers.
export const APP_META_KEYS = {
  riotLatestVersion: 'riot:versions:latest',
} as const

export const DATA_SOURCES = {
  // Shared champion "basic info" source.
  championProfileOpggMeta: 'opgg:champion-profile:v1',

  // Mode tier list sources.
  aramMayhemTierListOpggWebV1: 'opgg-web:aram-mayhem:tierlist:v1',
} as const

export type BuildSourceKey = string

export function buildSourceKeyForMode(
  modeId: GameModeId,
  opts: { region: OpggRegion; tier: OpggTier },
): BuildSourceKey {
  const region = opts.region
  const tier = opts.tier
  const arenaTier = toArenaTier(tier)

  // ARAM Mayhem supports configurable web sources (Blitz/OP.GG), independent of region/tier.
  if (modeId === 'aram-mayhem') return `aram-mayhem:web:v1`

  // Arena uses OP.GG champion API, with region/tier affecting output.
  if (modeId === 'arena') return `opgg-api:arena:v1:${region}:${arenaTier}`

  return `opgg-api:${modeId}:${region}:${tier}`
}

export const OPGG_REGIONS = ['global', 'kr', 'na', 'euw', 'eune'] as const

export type OpggRegion = (typeof OPGG_REGIONS)[number]

// Global OPGG tier options. Arena mode may internally normalize these.
export const OPGG_TIERS = ['emerald_plus', 'diamond_plus', 'master_plus', 'all'] as const
export type OpggTier = (typeof OPGG_TIERS)[number]

export const DEFAULT_OPGG_REGION: OpggRegion = 'global'
export const DEFAULT_OPGG_TIER: OpggTier = 'all'

export function isOpggRegion(value: unknown): value is OpggRegion {
  return typeof value === 'string' && OPGG_REGIONS.includes(value as OpggRegion)
}

export function isOpggTier(value: unknown): value is OpggTier {
  return typeof value === 'string' && OPGG_TIERS.includes(value as OpggTier)
}

export function toArenaTier(tier: OpggTier): 'all' {
  // OPGG Arena endpoint only accepts a limited tier set; for consistency with global settings
  void tier
  return 'all'
}

import type { AugmentRecommendation } from '../../../../shared/contracts'

import { extractFirstJsonObjectFromChunk, extractNextFlightChunksFromHtml } from '../nextFlight'

type RawAramAugment = {
  id: number
  tier?: number
  performance?: number
  popular?: number
  name?: string
  key?: string
  largeIcon?: string
  smallIcon?: string
  rarity?: number
  desc?: string
  tooltip?: string
}

function mapAramAugmentRarityToOverlayKey(rarity: number | null | undefined): string | undefined {
  // OP.GG aram-augment rarity codes differ from Arena.
  // Map to our existing UI buckets best-effort.
  if (rarity == null) return undefined
  if (rarity >= 8) return 'kPrismatic'
  if (rarity >= 4) return 'kGold'
  return 'kSilver'
}

export function parseAramMayhemAugments(html: string): AugmentRecommendation[] {
  const flight = extractNextFlightChunksFromHtml(html)
  for (const c of flight) {
    // Augments page exposes a `{"data":[...]}` object with aram augment metadata + metrics.
    const parsed = extractFirstJsonObjectFromChunk(c.raw, '{"data":[{"id":')
    if (!parsed || typeof parsed !== 'object') continue
    const obj = parsed as { data?: RawAramAugment[] }
    if (!Array.isArray(obj.data) || !obj.data.length) continue

    return obj.data.map((a) => ({
      augmentId: String(a.id),
      tier: typeof a.tier === 'number' ? a.tier : null,
      // `popular` appears to be pick-rate percentage (e.g. 6.76).
      pickRate: typeof a.popular === 'number' ? a.popular / 100 : null,
      // ARAM Mayhem augments page doesn't expose win-rate; OP.GG displays a grade (S/A/B...)
      // plus a "performance" score. We intentionally do NOT map that to winRate.
      winRate: null,
      games: null,
      name: a.name,
      tooltip: a.tooltip ?? a.desc,
      iconUrl: a.largeIcon ?? a.smallIcon,
      rarity: mapAramAugmentRarityToOverlayKey(a.rarity),
    }))
  }

  return []
}

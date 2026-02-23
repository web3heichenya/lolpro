import type { RuneRecommendation } from '../../../../shared/contracts'
import { asArray, computeWinRate, toInt, toNum } from '../helpers'
import type { PerkMeta, PerkStyleMeta } from '../types'

function asUnknownArray(value: unknown): unknown[] {
  return asArray(value as unknown[] | null | undefined)
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

export function parseOpggRunes(params: {
  resolvedPosition: unknown
  arenaData: Record<string, unknown>
  perkMetaMap: Record<number, PerkMeta>
  perkStyleMetaMap: Record<number, PerkStyleMeta>
}) {
  const runesSource = asUnknownArray((params.resolvedPosition as { runes?: unknown } | undefined)?.runes)
    .length
    ? asUnknownArray((params.resolvedPosition as { runes?: unknown } | undefined)?.runes)
    : asUnknownArray(params.arenaData.runes)

  return runesSource
    .map((entry): RuneRecommendation | null => {
      const row = asRecord(entry)
      const primaryStyleId = toInt(row.primary_page_id)
      const subStyleId = toInt(row.secondary_page_id)
      if (primaryStyleId == null || subStyleId == null) return null

      const primaryPerkIds = asUnknownArray(row.primary_rune_ids)
        .map((id) => toInt(id))
        .filter((id): id is number => id != null)
      const secondaryPerkIds = asUnknownArray(row.secondary_rune_ids)
        .map((id) => toInt(id))
        .filter((id): id is number => id != null)
      const statModIds = asUnknownArray(row.stat_mod_ids)
        .map((id) => toInt(id))
        .filter((id): id is number => id != null)
      const selectedPerkIds = [...primaryPerkIds, ...secondaryPerkIds, ...statModIds]
      const games = toNum(row.play)
      const wins = toNum(row.win)

      return {
        primaryStyleId,
        subStyleId,
        selectedPerkIds,
        pickRate: toNum(row.pick_rate),
        winRate: computeWinRate(games, wins),
        games,
        primaryStyleName: params.perkStyleMetaMap[primaryStyleId]?.name,
        subStyleName: params.perkStyleMetaMap[subStyleId]?.name,
        primaryStyleIconUrl: params.perkStyleMetaMap[primaryStyleId]?.iconUrl,
        subStyleIconUrl: params.perkStyleMetaMap[subStyleId]?.iconUrl,
        primaryPerkIds,
        secondaryPerkIds,
        statModIds,
        primaryPerks: primaryPerkIds.map((id) => ({
          id,
          name: params.perkMetaMap[id]?.name,
          iconUrl: params.perkMetaMap[id]?.iconUrl,
        })),
        secondaryPerks: secondaryPerkIds.map((id) => ({
          id,
          name: params.perkMetaMap[id]?.name,
          iconUrl: params.perkMetaMap[id]?.iconUrl,
        })),
        statMods: statModIds.map((id) => ({
          id,
          name: params.perkMetaMap[id]?.name,
          iconUrl: params.perkMetaMap[id]?.iconUrl,
        })),
      }
    })
    .filter((row): row is NonNullable<typeof row> => !!row)
    .sort((a, b) => (b.pickRate ?? -1) - (a.pickRate ?? -1))
    .slice(0, 6)
}

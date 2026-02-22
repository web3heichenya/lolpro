import type {
  SkillMasteryRecommendation,
  SkillOrderRecommendation,
  SummonerSpellRecommendation,
} from '../../../../shared/contracts'
import { asArray, computeWinRate, toInt, toNum, toSkillId } from '../helpers'
import type { SummonerSpellMeta } from '../types'

function asUnknownArray(value: unknown): unknown[] {
  return asArray(value as unknown[] | null | undefined)
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

export function parseSummonerSpells(params: {
  resolvedPosition: unknown
  arenaData: Record<string, unknown>
  spellMetaMap: Record<number, SummonerSpellMeta>
}): SummonerSpellRecommendation[] {
  const summonerSpellsSource = asUnknownArray(
    (params.resolvedPosition as { summoner_spells?: unknown } | undefined)?.summoner_spells,
  ).length
    ? asUnknownArray((params.resolvedPosition as { summoner_spells?: unknown } | undefined)?.summoner_spells)
    : asUnknownArray(params.arenaData.summoner_spells)

  return summonerSpellsSource
    .reduce<SummonerSpellRecommendation[]>((acc, entry) => {
      const row = asRecord(entry)
      const ids = asUnknownArray(row.ids)
        .map((id) => toInt(id))
        .filter((id): id is number => id != null)
      if (!ids.length) return acc
      const games = toNum(row.play)
      const wins = toNum(row.win)
      const pickRate = toNum(row.pick_rate)
      acc.push({
        summonerSpellIds: ids,
        games,
        pickRate,
        winRate: computeWinRate(games, wins),
        spells: ids.map((id) => ({
          id,
          name: params.spellMetaMap[id]?.name,
          iconUrl: params.spellMetaMap[id]?.iconUrl,
        })),
      })
      return acc
    }, [])
    .sort((a, b) => (b.pickRate ?? -1) - (a.pickRate ?? -1))
    .slice(0, 6)
}

export function parseSkillOrders(params: {
  resolvedPosition: unknown
  arenaData: Record<string, unknown>
}): SkillOrderRecommendation[] {
  const source = asUnknownArray((params.resolvedPosition as { skills?: unknown } | undefined)?.skills).length
    ? asUnknownArray((params.resolvedPosition as { skills?: unknown } | undefined)?.skills)
    : asUnknownArray(params.arenaData.skills)

  return source
    .map((entry) => {
      const skill = asRecord(entry)
      const skillOrder = asUnknownArray(skill.order)
        .map((value) => {
          if (typeof value === 'string' || typeof value === 'number') return toSkillId(value)
          return null
        })
        .filter((value): value is number => value != null)
      if (!skillOrder.length) return null
      const games = toNum(skill.play)
      const wins = toNum(skill.win)
      return {
        skillOrder,
        games,
        pickRate: toNum(skill.pick_rate),
        winRate: computeWinRate(games, wins),
      }
    })
    .filter((row): row is SkillOrderRecommendation => !!row)
    .sort((a, b) => (b.pickRate ?? -1) - (a.pickRate ?? -1))
    .slice(0, 6)
}

export function parseSkillMasteries(params: {
  resolvedPosition: unknown
  arenaData: Record<string, unknown>
}): SkillMasteryRecommendation[] {
  const source = asUnknownArray(
    (params.resolvedPosition as { skill_masteries?: unknown } | undefined)?.skill_masteries,
  ).length
    ? asUnknownArray((params.resolvedPosition as { skill_masteries?: unknown } | undefined)?.skill_masteries)
    : asUnknownArray(params.arenaData.skill_masteries)

  return source
    .map((entry) => {
      const mastery = asRecord(entry)
      const games = toNum(mastery.play)
      const wins = toNum(mastery.win)
      return {
        order: asUnknownArray(mastery.ids).map((token) => String(token)),
        pickRate: toNum(mastery.pick_rate),
        winRate: computeWinRate(games, wins),
      }
    })
    .filter((mastery) => mastery.order.length > 0)
    .sort((a, b) => (b.pickRate ?? -1) - (a.pickRate ?? -1))
    .slice(0, 6)
}

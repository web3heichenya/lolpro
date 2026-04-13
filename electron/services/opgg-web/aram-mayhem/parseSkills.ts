import type { SkillMasteryRecommendation, SkillOrderRecommendation } from '../../../../shared/contracts'

import { extractFirstJsonObjectFromChunk, extractNextFlightChunksFromHtml } from '../nextFlight'

type RawSkillMasteryGroup = {
  ids: string[]
  play?: number
  pick_rate?: number
  win_rate?: number
  builds?: Array<RawSkillOrderBuild | string>
}

type RawSkillOrderBuild = {
  order: string[]
  play?: number
  pick_rate?: number
  win_rate?: number
}

type RawSkillsPayload = {
  skill_masteries?: RawSkillMasteryGroup[]
  all_builds?: Array<RawSkillOrderBuild | string>
  mode?: string
}

function toSkillNum(token: unknown): number | null {
  if (typeof token === 'number' && Number.isFinite(token)) return Math.trunc(token)
  if (typeof token !== 'string') return null
  const t = token.trim().toUpperCase()
  if (t === 'Q') return 1
  if (t === 'W') return 2
  if (t === 'E') return 3
  if (t === 'R') return 4
  return null
}

function isSkillOrderBuild(value: unknown): value is RawSkillOrderBuild {
  return !!value && typeof value === 'object' && Array.isArray((value as RawSkillOrderBuild).order)
}

export function parseAramMayhemSkills(html: string): {
  skillOrders: SkillOrderRecommendation[]
  skillMasteries: SkillMasteryRecommendation[]
} {
  const flight = extractNextFlightChunksFromHtml(html)
  for (const c of flight) {
    const parsed = extractFirstJsonObjectFromChunk(c.raw, '{"skill_masteries":[')
    if (!parsed || typeof parsed !== 'object') continue
    const obj = parsed as RawSkillsPayload
    if (obj.mode !== 'aram_mayhem') continue

    const skillMasteries: SkillMasteryRecommendation[] = (obj.skill_masteries ?? [])
      .filter((g) => Array.isArray(g.ids) && g.ids.length)
      .map((g) => ({
        order: g.ids,
        pickRate: typeof g.pick_rate === 'number' ? g.pick_rate : null,
        winRate: typeof g.win_rate === 'number' ? g.win_rate : null,
      }))
      .sort((a, b) => (b.pickRate ?? 0) - (a.pickRate ?? 0))

    // OPGG Next-flight can encode all_builds as string references.
    // skill_masteries[].builds carries concrete build rows we can always parse.
    const orderCandidates: RawSkillOrderBuild[] = []
    for (const row of obj.all_builds ?? []) {
      if (isSkillOrderBuild(row)) orderCandidates.push(row)
    }
    for (const mastery of obj.skill_masteries ?? []) {
      for (const row of mastery.builds ?? []) {
        if (isSkillOrderBuild(row)) orderCandidates.push(row)
      }
    }

    const dedup = new Map<string, SkillOrderRecommendation>()
    for (const b of orderCandidates) {
      const nums = b.order.map(toSkillNum).filter((n): n is number => n != null)
      if (!nums.length) continue
      const entry: SkillOrderRecommendation = {
        skillOrder: nums,
        games: typeof b.play === 'number' ? b.play : null,
        pickRate: typeof b.pick_rate === 'number' ? b.pick_rate : null,
        winRate: typeof b.win_rate === 'number' ? b.win_rate : null,
      }
      const key = nums.join('-')
      const prev = dedup.get(key)
      if (!prev || (entry.pickRate ?? -1) > (prev.pickRate ?? -1)) dedup.set(key, entry)
    }

    const skillOrders: SkillOrderRecommendation[] = Array.from(dedup.values()).sort(
      (a, b) => (b.pickRate ?? 0) - (a.pickRate ?? 0),
    )

    return { skillOrders, skillMasteries }
  }

  return { skillOrders: [], skillMasteries: [] }
}

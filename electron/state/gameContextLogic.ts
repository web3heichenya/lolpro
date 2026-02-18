import type { ChampionSummary } from '../services/blitz/blitz'
import type { LcuStatus, LiveClientStatus } from '../../shared/contracts'

export type DetectedChampionSource = 'lcu' | 'liveclient' | null

export function normalizeChampionKey(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function buildChampionKeyToIdMap(champions: ChampionSummary[]) {
  const map = new Map<string, number>()
  for (const c of champions) {
    const id = Number(c.id)
    if (!Number.isFinite(id)) continue
    map.set(normalizeChampionKey(c.slug), id)
    map.set(normalizeChampionKey(c.name), id)
  }
  return map
}

export function computeIsGameRelated(lcu: LcuStatus, live: LiveClientStatus): boolean {
  return lcu.phase === 'ChampSelect' || lcu.phase === 'InProgress' || (live.connected ?? false)
}

export function detectChampion(
  lcu: LcuStatus,
  live: LiveClientStatus,
): {
  detectedChampionId?: number
  detectedChampionSource: DetectedChampionSource
} {
  if ((lcu.phase === 'ChampSelect' || lcu.phase === 'InProgress') && lcu.currentChampionId) {
    return { detectedChampionId: lcu.currentChampionId, detectedChampionSource: 'lcu' }
  }
  if (live.connected && live.championId) {
    return { detectedChampionId: live.championId, detectedChampionSource: 'liveclient' }
  }
  return { detectedChampionSource: null }
}

const CACHE_SELF_HEAL_COOLDOWN_MS = 6 * 60 * 60 * 1000

export function shouldRetrySelfHeal(buildDt?: string): boolean {
  const dtMs = Date.parse(buildDt ?? '')
  const fetchedRecently = Number.isFinite(dtMs) && Date.now() - dtMs < CACHE_SELF_HEAL_COOLDOWN_MS
  return !fetchedRecently
}

export function fallbackChar(name: string) {
  const s = name.trim()
  return s ? s.slice(0, 1).toUpperCase() : '?'
}

export function fmtPct(v: number | null | undefined) {
  if (v == null || !Number.isFinite(v)) return '-'
  return `${(v * 100).toFixed(1)}%`
}

export function skillKey(n: number) {
  // Keep a forgiving mapping for mixed numeric/derived skill orders.
  if (n === 1) return 'Q'
  if (n === 2) return 'W'
  if (n === 3) return 'E'
  if (n === 4) return 'R'
  if (n === 0) return 'P'
  return '?'
}

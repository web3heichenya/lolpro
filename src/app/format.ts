export function pct(v: number | null | undefined) {
  if (v == null || Number.isNaN(v)) return '-'
  return `${(v * 100).toFixed(1)}%`
}

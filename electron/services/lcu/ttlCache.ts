type CacheEntry<T> = {
  expiresAt: number
  value: T
}

export class TtlCache<K, V> {
  private readonly entries = new Map<K, CacheEntry<V>>()

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries = 128,
  ) {}

  get(key: K): V | undefined {
    const hit = this.entries.get(key)
    if (!hit) return undefined
    if (hit.expiresAt <= Date.now()) {
      this.entries.delete(key)
      return undefined
    }
    return hit.value
  }

  set(key: K, value: V): void {
    if (this.entries.size >= this.maxEntries) {
      const oldestKey = this.entries.keys().next().value
      if (oldestKey !== undefined) this.entries.delete(oldestKey)
    }
    this.entries.set(key, { value, expiresAt: Date.now() + this.ttlMs })
  }

  clear(): void {
    this.entries.clear()
  }
}

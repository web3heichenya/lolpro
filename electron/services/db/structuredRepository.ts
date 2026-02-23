import type { ChampionSummary, GameModeId, RiotLocale, SupportedMode } from '../../../shared/contracts'
import { getDb } from './client'

type DbAccessor = () => ReturnType<typeof getDb>

function parseJson<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export class StructuredRepository {
  constructor(private readonly dbAccessor: DbAccessor) {}

  async listStoredModes(): Promise<SupportedMode[]> {
    const { raw } = this.dbAccessor()
    const rows = raw.prepare('SELECT id, label, features_json FROM modes ORDER BY id DESC').all() as Array<{
      id: string
      label: string
      features_json: string
    }>

    const out: SupportedMode[] = []
    for (const row of rows) {
      const features = parseJson<string[]>(row.features_json)
      if (!Array.isArray(features)) continue
      out.push({
        id: row.id as GameModeId,
        label: row.label,
        features,
      })
    }
    return out
  }

  async upsertModes(modes: SupportedMode[]): Promise<void> {
    if (!modes.length) return

    const { raw } = this.dbAccessor()
    const now = Date.now()
    const stmt = raw.prepare(`
      INSERT INTO modes (id, label, features_json, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        label = excluded.label,
        features_json = excluded.features_json,
        updated_at = excluded.updated_at
    `)

    const tx = raw.transaction((rows: SupportedMode[]) => {
      for (const row of rows) {
        stmt.run(row.id, row.label, JSON.stringify(row.features), now)
      }
    })
    tx(modes)
  }

  async getFreshChampionsFromDb(lang: RiotLocale, maxAgeMs: number): Promise<ChampionSummary[] | null> {
    const { raw } = this.dbAccessor()
    const freshness = raw
      .prepare('SELECT COUNT(*) as count, MAX(updated_at) as newest FROM champions WHERE lang = ?')
      .get(lang) as { count?: number; newest?: number | null } | undefined

    const count = Number(freshness?.count ?? 0)
    const newest = Number(freshness?.newest ?? 0)
    if (count <= 0 || newest <= 0) return null
    if (Date.now() - newest > maxAgeMs) return null

    const rows = raw
      .prepare(
        'SELECT id, name, title, slug, icon_url as iconUrl, splash_url as splashUrl FROM champions WHERE lang = ? ORDER BY name COLLATE NOCASE ASC',
      )
      .all(lang) as ChampionSummary[]

    // Self-heal stale champion cache from legacy schema rows without localized title.
    if (rows.some((row) => !row.title)) return null

    return rows.length ? rows : null
  }

  async replaceChampions(lang: RiotLocale, champions: ChampionSummary[]): Promise<void> {
    const { raw } = this.dbAccessor()
    const now = Date.now()
    const clearStmt = raw.prepare('DELETE FROM champions WHERE lang = ?')
    const insertStmt = raw.prepare(`
      INSERT INTO champions (id, lang, name, title, slug, icon_url, splash_url, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const tx = raw.transaction((rows: ChampionSummary[]) => {
      clearStmt.run(lang)
      for (const row of rows) {
        insertStmt.run(
          row.id,
          lang,
          row.name,
          row.title ?? null,
          row.slug,
          row.iconUrl ?? null,
          row.splashUrl ?? null,
          now,
        )
      }
    })
    tx(champions)
  }
}

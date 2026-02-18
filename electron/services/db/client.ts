import Database from 'better-sqlite3'
import { app } from 'electron'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'

import { log } from '../logging/logger'

const logger = log('db')

type Migration = {
  id: number
  name: string
  sql: string[]
}

const MIGRATIONS: Migration[] = [
  {
    id: 1,
    name: 'init_latest_schema',
    sql: [
      `CREATE TABLE IF NOT EXISTS schema_migrations (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at INTEGER NOT NULL
      )`,
      // Core reference tables
      `CREATE TABLE IF NOT EXISTS modes (
        id TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        features_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS champions (
        id TEXT NOT NULL,
        lang TEXT NOT NULL,
        name TEXT NOT NULL,
        slug TEXT NOT NULL,
        icon_url TEXT,
        splash_url TEXT,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (id, lang)
      )`,
      // Build cache: per mode/champion/lang + source variants (region/tier or scraper version).
      `CREATE TABLE IF NOT EXISTS build_cache (
        mode_id TEXT NOT NULL,
        champion_id TEXT NOT NULL,
        lang TEXT NOT NULL,
        source_key TEXT NOT NULL,
        data_source TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        saved_at INTEGER NOT NULL,
        PRIMARY KEY (mode_id, champion_id, lang, source_key)
      )`,
      'CREATE INDEX IF NOT EXISTS idx_build_cache_mode_champ_lang_source ON build_cache(mode_id, champion_id, lang, source_key)',
      'CREATE INDEX IF NOT EXISTS idx_build_cache_saved_at ON build_cache(saved_at)',
      'CREATE INDEX IF NOT EXISTS idx_champions_lang_name ON champions(lang, name)',
      // Generic meta KV (kept minimal on purpose)
      `CREATE TABLE IF NOT EXISTS app_meta (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )`,
      // Shared champion "basic info" (mode-agnostic)
      `CREATE TABLE IF NOT EXISTS champion_profiles (
        champion_id TEXT NOT NULL,
        lang TEXT NOT NULL,
        data_source TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (champion_id, lang)
      )`,
      'CREATE INDEX IF NOT EXISTS idx_champion_profiles_updated_at ON champion_profiles(updated_at)',
      // Mode-level tier lists / ranking summaries
      `CREATE TABLE IF NOT EXISTS mode_tier_lists (
        mode_id TEXT NOT NULL,
        lang TEXT NOT NULL,
        source_key TEXT NOT NULL,
        data_source TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (mode_id, lang, source_key)
      )`,
      'CREATE INDEX IF NOT EXISTS idx_mode_tier_lists_updated_at ON mode_tier_lists(updated_at)',
    ],
  },
]

type DbContext = {
  dbPath: string
  raw: Database.Database
  orm: ReturnType<typeof drizzle>
}

let dbContext: DbContext | null = null

function resolveUserDataPath() {
  try {
    return app.getPath('userData')
  } catch {
    const fallback = path.join(process.cwd(), '.tmp-userdata')
    fs.mkdirSync(fallback, { recursive: true })
    return fallback
  }
}

function resolveDbPath() {
  return path.join(resolveUserDataPath(), 'lolpro.db')
}

function applyPragmas(raw: Database.Database) {
  raw.pragma('journal_mode = WAL')
  raw.pragma('foreign_keys = ON')
  raw.pragma('synchronous = NORMAL')
  raw.pragma('busy_timeout = 2000')
}

function runMigrations(raw: Database.Database) {
  raw.exec(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at INTEGER NOT NULL
    )`,
  )

  const hasMigration = raw.prepare('SELECT 1 FROM schema_migrations WHERE id = ?').pluck()
  const insertMigration = raw.prepare('INSERT INTO schema_migrations (id, name, applied_at) VALUES (?, ?, ?)')

  for (const migration of MIGRATIONS) {
    const exists = hasMigration.get(migration.id)
    if (exists) continue

    const tx = raw.transaction(() => {
      for (const statement of migration.sql) raw.exec(statement)
      insertMigration.run(migration.id, migration.name, Date.now())
    })

    tx()
    logger.info('database migration applied', { id: migration.id, name: migration.name })
  }
}

export function getDb() {
  if (dbContext) return dbContext

  const dbPath = resolveDbPath()
  fs.mkdirSync(path.dirname(dbPath), { recursive: true })

  const raw = new Database(dbPath)
  applyPragmas(raw)
  runMigrations(raw)

  dbContext = {
    dbPath,
    raw,
    orm: drizzle(raw),
  }

  return dbContext
}

export function getDatabaseHealth() {
  const { raw, dbPath } = getDb()
  const walMode = String(raw.pragma('journal_mode', { simple: true }))
  const foreignKeys = Number(raw.pragma('foreign_keys', { simple: true })) === 1
  return {
    dbPath,
    walMode,
    foreignKeys,
  }
}

export function closeDb() {
  if (!dbContext) return
  dbContext.raw.close()
  dbContext = null
}

import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const schemaMigrations = sqliteTable('schema_migrations', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
  appliedAt: integer('applied_at').notNull(),
})

export const modes = sqliteTable('modes', {
  id: text('id').primaryKey(),
  label: text('label').notNull(),
  featuresJson: text('features_json').notNull(),
  updatedAt: integer('updated_at').notNull(),
})

export const champions = sqliteTable('champions', {
  id: text('id').notNull(),
  lang: text('lang').notNull(),
  name: text('name').notNull(),
  title: text('title'),
  slug: text('slug').notNull(),
  iconUrl: text('icon_url'),
  splashUrl: text('splash_url'),
  updatedAt: integer('updated_at').notNull(),
})

// Shared champion "basic info" (title/blurb/spells etc). This is mode-agnostic and reused across modes.
export const championProfiles = sqliteTable(
  'champion_profiles',
  {
    championId: text('champion_id').notNull(),
    lang: text('lang').notNull(),
    dataSource: text('data_source').notNull(),
    payloadJson: text('payload_json').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.championId, t.lang] }),
  }),
)

// Per-mode tier list / ranking summaries (e.g. OPGG Web aram-mayhem tier list).
export const modeTierLists = sqliteTable(
  'mode_tier_lists',
  {
    modeId: text('mode_id').notNull(),
    lang: text('lang').notNull(),
    sourceKey: text('source_key').notNull(),
    dataSource: text('data_source').notNull(),
    payloadJson: text('payload_json').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.modeId, t.lang, t.sourceKey] }),
  }),
)

export const buildCache = sqliteTable(
  'build_cache',
  {
    modeId: text('mode_id').notNull(),
    championId: text('champion_id').notNull(),
    lang: text('lang').notNull(),
    sourceKey: text('source_key').notNull(),
    dataSource: text('data_source').notNull(),
    payloadJson: text('payload_json').notNull(),
    savedAt: integer('saved_at').notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.modeId, t.championId, t.lang, t.sourceKey] }),
  }),
)

export const appMeta = sqliteTable('app_meta', {
  key: text('key').primaryKey(),
  valueJson: text('value_json').notNull(),
  updatedAt: integer('updated_at').notNull(),
})

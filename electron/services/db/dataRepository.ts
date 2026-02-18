import { and, eq } from 'drizzle-orm'

import { buildResultSchema, championProfileSchema } from '../../../shared/contracts'
import type { BuildResult, GameModeId, RiotLocale } from '../../../shared/contracts'
import { appMeta, buildCache, championProfiles, modeTierLists } from './schema'
import { getDb } from './client'

type DbAccessor = () => ReturnType<typeof getDb>

function parseJson<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function normalizeLang(lang?: RiotLocale): string {
  return (lang ?? 'en_US').replace(/[^a-zA-Z0-9_-]/g, '_')
}

export class DataRepository {
  constructor(private readonly dbAccessor: DbAccessor) {}

  async readAppMeta<T>(key: string, maxAgeMs?: number): Promise<T | null> {
    const { orm } = this.dbAccessor()
    const row = orm
      .select({ valueJson: appMeta.valueJson, updatedAt: appMeta.updatedAt })
      .from(appMeta)
      .where(eq(appMeta.key, key))
      .get()

    if (!row) return null
    if (typeof maxAgeMs === 'number' && maxAgeMs >= 0 && Date.now() - row.updatedAt > maxAgeMs) return null
    return parseJson<T>(row.valueJson)
  }

  async writeAppMeta<T>(key: string, data: T): Promise<void> {
    const { orm } = this.dbAccessor()
    const now = Date.now()
    orm
      .insert(appMeta)
      .values({ key, valueJson: JSON.stringify(data), updatedAt: now })
      .onConflictDoUpdate({
        target: appMeta.key,
        set: {
          valueJson: JSON.stringify(data),
          updatedAt: now,
        },
      })
      .run()
  }

  async readChampionProfile(params: { championId: string; lang?: RiotLocale; maxAgeMs?: number }) {
    const { orm } = this.dbAccessor()
    const lang = normalizeLang(params.lang)
    const row = orm
      .select({
        payloadJson: championProfiles.payloadJson,
        updatedAt: championProfiles.updatedAt,
      })
      .from(championProfiles)
      .where(and(eq(championProfiles.championId, String(params.championId)), eq(championProfiles.lang, lang)))
      .get()

    if (!row) return null
    if (
      typeof params.maxAgeMs === 'number' &&
      params.maxAgeMs >= 0 &&
      Date.now() - row.updatedAt > params.maxAgeMs
    ) {
      return null
    }

    const parsed = parseJson<unknown>(row.payloadJson)
    if (!parsed) return null
    const normalized = championProfileSchema.safeParse(parsed)
    if (!normalized.success) return null
    if (String(normalized.data.championId) !== String(params.championId)) return null
    return normalized.data
  }

  async writeChampionProfile(params: {
    championId: string
    lang?: RiotLocale
    dataSource: string
    profile: unknown
  }): Promise<void> {
    const { orm } = this.dbAccessor()
    const now = Date.now()
    const lang = normalizeLang(params.lang)
    const payloadJson = JSON.stringify(params.profile)

    orm
      .insert(championProfiles)
      .values({
        championId: String(params.championId),
        lang,
        dataSource: params.dataSource,
        payloadJson,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [championProfiles.championId, championProfiles.lang],
        set: { payloadJson, updatedAt: now, dataSource: params.dataSource },
      })
      .run()
  }

  async readModeTierList<T>(params: {
    mode: GameModeId
    lang?: RiotLocale
    sourceKey: string
    maxAgeMs?: number
  }): Promise<T | null> {
    const { orm } = this.dbAccessor()
    const lang = normalizeLang(params.lang)
    const row = orm
      .select({
        payloadJson: modeTierLists.payloadJson,
        updatedAt: modeTierLists.updatedAt,
      })
      .from(modeTierLists)
      .where(
        and(
          eq(modeTierLists.modeId, params.mode),
          eq(modeTierLists.lang, lang),
          eq(modeTierLists.sourceKey, params.sourceKey),
        ),
      )
      .get()

    if (!row) return null
    if (
      typeof params.maxAgeMs === 'number' &&
      params.maxAgeMs >= 0 &&
      Date.now() - row.updatedAt > params.maxAgeMs
    ) {
      return null
    }

    return parseJson<T>(row.payloadJson)
  }

  async writeModeTierList<T>(params: {
    mode: GameModeId
    lang?: RiotLocale
    sourceKey: string
    dataSource: string
    data: T
  }): Promise<void> {
    const { orm } = this.dbAccessor()
    const now = Date.now()
    const lang = normalizeLang(params.lang)
    const payloadJson = JSON.stringify(params.data)

    orm
      .insert(modeTierLists)
      .values({
        modeId: params.mode,
        lang,
        sourceKey: params.sourceKey,
        dataSource: params.dataSource,
        payloadJson,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [modeTierLists.modeId, modeTierLists.lang, modeTierLists.sourceKey],
        set: { payloadJson, updatedAt: now, dataSource: params.dataSource },
      })
      .run()
  }

  async getBuild(params: {
    mode: GameModeId
    championId: string
    lang?: RiotLocale
    sourceKey: string
  }): Promise<BuildResult | null> {
    const { orm } = this.dbAccessor()
    const lang = normalizeLang(params.lang)
    const row = orm
      .select({ payloadJson: buildCache.payloadJson })
      .from(buildCache)
      .where(
        and(
          eq(buildCache.modeId, params.mode),
          eq(buildCache.championId, String(params.championId)),
          eq(buildCache.lang, lang),
          eq(buildCache.sourceKey, params.sourceKey),
        ),
      )
      .get()

    if (!row) return null

    const parsed = parseJson<unknown>(row.payloadJson)
    if (!parsed) return null

    const normalized = buildResultSchema.safeParse(parsed)
    if (!normalized.success) return null
    if (normalized.data.mode !== params.mode) return null
    if (String(normalized.data.championId) !== String(params.championId)) return null

    return normalized.data as BuildResult
  }

  async saveBuild(params: {
    mode: GameModeId
    championId: string
    lang?: RiotLocale
    sourceKey: string
    dataSource: string
    build: BuildResult
  }): Promise<void> {
    const { orm } = this.dbAccessor()
    const now = Date.now()
    const lang = normalizeLang(params.lang)
    const payloadJson = JSON.stringify(params.build)

    orm
      .insert(buildCache)
      .values({
        modeId: params.mode,
        championId: String(params.championId),
        lang,
        sourceKey: params.sourceKey,
        dataSource: params.dataSource,
        payloadJson,
        savedAt: now,
      })
      .onConflictDoUpdate({
        target: [buildCache.modeId, buildCache.championId, buildCache.lang, buildCache.sourceKey],
        set: { payloadJson, savedAt: now, dataSource: params.dataSource },
      })
      .run()
  }

  async clearModeData(mode: GameModeId): Promise<void> {
    const { orm } = this.dbAccessor()
    orm.delete(buildCache).where(eq(buildCache.modeId, mode)).run()
  }
}

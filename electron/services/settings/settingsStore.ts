import { app } from 'electron'
import { EventEmitter } from 'node:events'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

import { DEFAULT_SETTINGS, type Settings, type SettingsPatch } from './types'
import { settingsSchema } from '../../../shared/contracts'
import { isOpggTier, isOpggRegion } from '../../../shared/opgg'

function defaultSettingsPath() {
  return path.join(app.getPath('userData'), 'settings.json')
}

function cloneSettings(value: Settings): Settings {
  return {
    version: 1,
    language: value.language,
    theme: {
      preference: value.theme.preference,
    },
    dataSource: {
      opgg: {
        region: value.dataSource.opgg.region,
        tier: value.dataSource.opgg.tier,
      },
    },
    overlay: { ...value.overlay },
    window: {
      main: {
        width: value.window.main.width,
        height: value.window.main.height,
      },
    },
    buildLists: { ...value.buildLists },
    hotkeys: { ...value.hotkeys },
  }
}

function deepMergeSettings(base: Settings, patch: SettingsPatch): Settings {
  return {
    ...base,
    language: patch.language ?? base.language,
    theme: {
      ...base.theme,
      ...(patch.theme ?? {}),
    },
    dataSource: {
      opgg: {
        ...base.dataSource.opgg,
        ...(patch.dataSource?.opgg ?? {}),
      },
    },
    overlay: {
      ...base.overlay,
      ...(patch.overlay ?? {}),
    },
    window: {
      main: {
        ...base.window.main,
        ...(patch.window?.main ?? {}),
      },
    },
    buildLists: {
      ...base.buildLists,
      ...(patch.buildLists ?? {}),
    },
    hotkeys: {
      ...base.hotkeys,
      ...(patch.hotkeys ?? {}),
    },
  }
}

function coerceDataSource(patch: Record<string, unknown>, base: Settings): Settings['dataSource'] {
  const dataSource = {
    opgg: { ...base.dataSource.opgg },
  }
  const raw = patch.dataSource
  if (!raw || typeof raw !== 'object') return dataSource
  const input = raw as Record<string, unknown>
  const rawOpgg = input.opgg
  if (!rawOpgg || typeof rawOpgg !== 'object') return dataSource
  const opgg = rawOpgg as Record<string, unknown>
  if (isOpggRegion(opgg.region)) dataSource.opgg.region = opgg.region
  if (isOpggTier(opgg.tier)) dataSource.opgg.tier = opgg.tier
  return dataSource
}

function coerceTheme(patch: Record<string, unknown>, base: Settings): Settings['theme'] {
  const theme = { ...base.theme }
  const raw = patch.theme
  if (!raw || typeof raw !== 'object') return theme
  const input = raw as Record<string, unknown>
  const preference = input.preference
  if (preference === 'system' || preference === 'light' || preference === 'dark') {
    theme.preference = preference
  }
  return theme
}

function coerceOverlayDimension(value: unknown, min: number, max: number, fallback: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, Math.trunc(value)))
}

function coerceOverlay(patch: Record<string, unknown>, base: Settings): Settings['overlay'] {
  const overlay = { ...base.overlay }
  const raw = patch.overlay
  if (!raw || typeof raw !== 'object') return overlay
  const input = raw as Record<string, unknown>
  if (typeof input.pinned === 'boolean') overlay.pinned = input.pinned
  if (typeof input.interactive === 'boolean') overlay.interactive = input.interactive
  if (typeof input.x === 'number') overlay.x = Math.trunc(input.x)
  if (typeof input.y === 'number') overlay.y = Math.trunc(input.y)
  overlay.width = coerceOverlayDimension(input.width, 320, 2_000, overlay.width)
  overlay.height = coerceOverlayDimension(input.height, 240, 2_000, overlay.height)
  if (
    input.augmentRarity === 'prismatic' ||
    input.augmentRarity === 'gold' ||
    input.augmentRarity === 'silver'
  ) {
    overlay.augmentRarity = input.augmentRarity
  }
  return overlay
}

function coerceHotkeys(patch: Record<string, unknown>, base: Settings): Settings['hotkeys'] {
  const hotkeys = { ...base.hotkeys }
  const raw = patch.hotkeys
  if (!raw || typeof raw !== 'object') return hotkeys
  const input = raw as Record<string, unknown>
  if (typeof input.togglePinned === 'string' && input.togglePinned.trim())
    hotkeys.togglePinned = input.togglePinned
  if (typeof input.toggleInteractive === 'string' && input.toggleInteractive.trim()) {
    hotkeys.toggleInteractive = input.toggleInteractive
  }
  return hotkeys
}

function coerceBuildLists(patch: Record<string, unknown>, base: Settings): Settings['buildLists'] {
  const buildLists = { ...base.buildLists }
  const raw = patch.buildLists
  if (!raw || typeof raw !== 'object') return buildLists
  const input = raw as Record<string, unknown>
  if (input.sortMode === 'composite' || input.sortMode === 'winRate' || input.sortMode === 'pickRate') {
    buildLists.sortMode = input.sortMode
  }
  return buildLists
}

function coerceWindow(patch: Record<string, unknown>, base: Settings): Settings['window'] {
  const windowSettings = {
    main: { ...base.window.main },
  }
  const raw = patch.window
  if (!raw || typeof raw !== 'object') return windowSettings
  const input = raw as Record<string, unknown>
  const rawMain = input.main
  if (!rawMain || typeof rawMain !== 'object') return windowSettings
  const main = rawMain as Record<string, unknown>
  if (typeof main.width === 'number' && Number.isFinite(main.width)) {
    windowSettings.main.width = Math.min(10_000, Math.max(980, Math.trunc(main.width)))
  }
  if (typeof main.height === 'number' && Number.isFinite(main.height)) {
    windowSettings.main.height = Math.min(10_000, Math.max(640, Math.trunc(main.height)))
  }
  return windowSettings
}

function coerceSettings(raw: unknown): Settings {
  const parsed = settingsSchema.safeParse(raw)
  if (parsed.success) return cloneSettings(parsed.data)

  const base = cloneSettings(DEFAULT_SETTINGS)
  if (!raw || typeof raw !== 'object') return base
  const patch = raw as Record<string, unknown>

  if (patch.language === 'auto' || patch.language === 'en_US' || patch.language === 'zh_CN') {
    base.language = patch.language
  }
  base.theme = coerceTheme(patch, base)
  base.dataSource = coerceDataSource(patch, base)
  base.overlay = coerceOverlay(patch, base)
  base.window = coerceWindow(patch, base)
  base.buildLists = coerceBuildLists(patch, base)
  base.hotkeys = coerceHotkeys(patch, base)

  return base
}

async function atomicWriteJson(filePath: string, data: unknown) {
  const dir = path.dirname(filePath)
  await fs.mkdir(dir, { recursive: true })

  const tmp = `${filePath}.tmp.${process.pid}.${Date.now()}.${crypto.randomUUID()}`
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8')

  try {
    await fs.rename(tmp, filePath)
  } catch (err) {
    await fs.rm(filePath, { force: true }).catch(() => {})
    await fs.rename(tmp, filePath)
    if (err) {
      // keep behavior cross-platform even if initial rename failed due existing file policy.
    }
  }
}

export class SettingsStore extends EventEmitter {
  private loaded = false
  private settings: Settings = cloneSettings(DEFAULT_SETTINGS)
  private writeChain: Promise<void> = Promise.resolve()

  constructor(private readonly resolvePath: () => string = defaultSettingsPath) {
    super()
  }

  async load() {
    if (this.loaded) return
    this.loaded = true
    try {
      const raw = await fs.readFile(this.resolvePath(), 'utf8')
      this.settings = coerceSettings(JSON.parse(raw))
    } catch {
      this.settings = cloneSettings(DEFAULT_SETTINGS)
    }
  }

  get(): Settings {
    return cloneSettings(this.settings)
  }

  previewPatch(patch: SettingsPatch): Settings {
    return coerceSettings(deepMergeSettings(this.settings, patch))
  }

  async set(next: Settings) {
    const snapshot = coerceSettings(next)
    this.settings = snapshot

    const writeTask = this.writeChain.then(async () => {
      await atomicWriteJson(this.resolvePath(), snapshot)
    })

    this.writeChain = writeTask.catch(() => {})
    await writeTask

    this.emit('changed', cloneSettings(snapshot))
  }

  async applyPatch(patch: SettingsPatch): Promise<Settings> {
    const next = this.previewPatch(patch)
    await this.set(next)
    return this.get()
  }

  async reset(): Promise<Settings> {
    await this.set(DEFAULT_SETTINGS)
    return this.get()
  }
}

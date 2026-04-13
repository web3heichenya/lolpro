import type { RiotLocale, StartingItemsRecommendation } from '../../../shared/contracts'
import type { ItemMeta, OpggItemSet } from './types'

function resolveItemMeta(
  itemId: number,
  itemMeta: Record<string, ItemMeta>,
): { meta?: ItemMeta; iconId: number } {
  const direct = itemMeta[String(itemId)]
  if (direct) return { meta: direct, iconId: itemId }

  // Some OPGG arena item ids are extended (e.g. 223115) but map to a base DDragon id (e.g. 3115).
  // If we fail to resolve by exact id (e.g. CDragon blocked), try the base id via last-4-digits.
  if (itemId >= 100_000) {
    const baseId = itemId % 10_000
    if (baseId >= 1000) {
      const base = itemMeta[String(baseId)]
      if (base) return { meta: base, iconId: baseId }
      return { meta: undefined, iconId: baseId }
    }
  }

  return { meta: undefined, iconId: itemId }
}

export function toNum(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

export function toInt(value: unknown): number | null {
  const num = toNum(value)
  if (num == null) return null
  return Math.trunc(num)
}

export function asArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : []
}

export function normalizeLocale(locale?: RiotLocale): 'en_US' | 'zh_CN' | 'zh_TW' {
  if (!locale) return 'zh_CN'
  if (locale === 'zh_CN') return 'zh_CN'
  if (locale === 'zh_TW') return 'zh_TW'
  if (locale === 'en_US') return 'en_US'

  const lowered = locale.toLowerCase()
  if (lowered.startsWith('zh_tw') || lowered.startsWith('zh-tw') || lowered.startsWith('zh_hant'))
    return 'zh_TW'
  if (lowered.startsWith('zh_cn') || lowered.startsWith('zh-cn') || lowered.startsWith('zh_hans'))
    return 'zh_CN'
  return 'en_US'
}

export function ddragonLocale(locale?: RiotLocale): string {
  return normalizeLocale(locale)
}

export function opggMetaLocale(locale?: RiotLocale): string {
  return normalizeLocale(locale)
}

export function asOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

export function computeWinRate(play: number | null, win: number | null): number | null {
  if (play == null || win == null || play <= 0) return null
  return win / play
}

export function toSkillId(value: string | number): number | null {
  if (typeof value === 'number') {
    if (Number.isFinite(value)) return Math.trunc(value)
    return null
  }

  const token = value.trim().toUpperCase()
  if (token === 'Q') return 1
  if (token === 'W') return 2
  if (token === 'E') return 3
  if (token === 'R') return 4
  if (token === 'P') return 0

  const parsed = Number(token)
  if (!Number.isFinite(parsed)) return null
  return Math.trunc(parsed)
}

export function raritySortWeight(rarity: string | undefined): number {
  if (rarity === 'kPrismatic') return 0
  if (rarity === 'kGold') return 1
  if (rarity === 'kSilver') return 2
  return 3
}

export function cdragonAugmentIconUrl(pathValue?: string): string | undefined {
  if (!pathValue) return undefined
  const normalized = pathValue.replace('/lol-game-data/assets/', '').toLowerCase()
  return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/${normalized}`
}

export function opggAugmentIconUrl(pathValue?: string): string | undefined {
  if (!pathValue) return undefined
  const filename = pathValue.split('/').pop()?.toLowerCase()
  if (!filename) return undefined
  const slug = filename.replace(/_small\.png$/, '').replace(/\.png$/, '')
  if (!slug) return undefined
  return `https://opgg-static.akamaized.net/meta/images/lol/latest/augment/${slug}_large.png?image=q_auto:good,f_webp,w_128`
}

export function stripMarkup(text?: string): string | undefined {
  if (!text) return undefined
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function comboToItems(
  combo: OpggItemSet,
  itemMeta: Record<string, ItemMeta>,
  patch: string,
): StartingItemsRecommendation | null {
  const itemIds = asArray(combo.ids)
    .map((id) => toInt(id))
    .filter((id): id is number => id != null)
  if (!itemIds.length) return null

  const play = toNum(combo.play)
  const win = toNum(combo.win)
  const pickRate = toNum(combo.pick_rate)
  const winRate = computeWinRate(play, win)

  return {
    itemIds,
    games: play,
    pickRate,
    winRate,
    items: itemIds.map((id) => {
      const { meta, iconId } = resolveItemMeta(id, itemMeta)
      return {
        id,
        name: meta?.name,
        iconUrl: meta?.iconUrl || `https://ddragon.leagueoflegends.com/cdn/${patch}/img/item/${iconId}.png`,
      }
    }),
  }
}

import type { AramMayhemBuildResult, GameModeId, RiotLocale } from '../../../../shared/contracts'

import { normalizeChampionKey } from '../../../state/gameContextLogic'
import { fetchHtml, isLikelyChallengePage, opggUrl, toOpggWebLocale } from './fetch'
import { parseAramMayhemAugments } from './parseAugments'
import { parseAramMayhemItems } from './parseItems'
import { parseAramMayhemSkills } from './parseSkills'
import { getAramMayhemTierSummary } from './tierList'
import { extractNextFlightChunksFromHtml } from '../nextFlight'

export type AramMayhemWebScrapeParams = {
  championKey: string
  lang?: RiotLocale
  patch: string
  timeoutMs?: number
  cache?: {
    readModeTierList: <T>(params: {
      mode: GameModeId
      lang?: RiotLocale
      sourceKey: string
      maxAgeMs?: number
    }) => Promise<T | null>
    writeModeTierList: <T>(params: {
      mode: GameModeId
      lang?: RiotLocale
      sourceKey: string
      dataSource: string
      data: T
    }) => Promise<void>
  }
}

export type AramMayhemWebScrapeResult = Pick<
  AramMayhemBuildResult,
  | 'summary'
  | 'augments'
  | 'items'
  | 'startingItems'
  | 'bootsItems'
  | 'coreItems'
  | 'situationalItems'
  | 'skillOrders'
  | 'skillMasteries'
>

export async function scrapeAramMayhemFromOpggWeb(
  params: AramMayhemWebScrapeParams,
): Promise<AramMayhemWebScrapeResult> {
  const locale = toOpggWebLocale(params.lang)
  const key = normalizeChampionKey(params.championKey)
  const timeoutMs = params.timeoutMs ?? 15_000

  const [augHtml, itemsHtml, skillsHtml] = await Promise.all([
    fetchHtml(opggUrl(locale, `lol/modes/aram-mayhem/${key}/augments`), timeoutMs),
    fetchHtml(opggUrl(locale, `lol/modes/aram-mayhem/${key}/items`), timeoutMs),
    fetchHtml(opggUrl(locale, `lol/modes/aram-mayhem/${key}/skills`), timeoutMs),
  ])

  if (
    isLikelyChallengePage(augHtml) ||
    isLikelyChallengePage(itemsHtml) ||
    isLikelyChallengePage(skillsHtml)
  ) {
    throw new Error('OP.GG challenge page detected. Retry with stable network or VPN.')
  }

  const augFlight = extractNextFlightChunksFromHtml(augHtml).length
  const itemsFlight = extractNextFlightChunksFromHtml(itemsHtml).length
  const skillsFlight = extractNextFlightChunksFromHtml(skillsHtml).length

  const augments = parseAramMayhemAugments(augHtml)
  const { startingItems, bootsItems, coreItems, items } = parseAramMayhemItems(itemsHtml)
  const { skillOrders, skillMasteries } = parseAramMayhemSkills(skillsHtml)
  const summary = await getAramMayhemTierSummary({
    championKey: key,
    lang: params.lang,
    timeoutMs,
    cache: params.cache,
  })

  const hasBuildData =
    augments.length > 0 ||
    items.length > 0 ||
    coreItems.length > 0 ||
    bootsItems.length > 0 ||
    startingItems.length > 0 ||
    skillOrders.length > 0 ||
    skillMasteries.length > 0
  if (!hasBuildData) {
    const noFlightPayload = augFlight === 0 && itemsFlight === 0 && skillsFlight === 0
    if (noFlightPayload) {
      throw new Error('OP.GG page returned no next-flight payload (likely network edge/proxy variant).')
    }
    throw new Error('OP.GG returned empty payload for this champion/mode.')
  }

  return {
    summary,
    augments,
    items,
    startingItems,
    bootsItems,
    coreItems,
    situationalItems: items.map((item) => Number(item.itemId)).filter((n) => Number.isFinite(n)),
    skillOrders,
    skillMasteries,
  }
}

import { z } from 'zod'

import { GAME_MODES } from '../gameModes'
import { OPGG_TIERS, OPGG_REGIONS } from '../opgg'

const localeLiteral = z.union([z.literal('en_US'), z.literal('zh_CN')])
const themePreferenceSchema = z.union([z.literal('system'), z.literal('light'), z.literal('dark')])

export const riotLocaleSchema = z.string().min(2)
export const languageSettingSchema = z.union([z.literal('auto'), localeLiteral])
export const gameModeIdSchema = z.enum(GAME_MODES)

export const championSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  title: z.string().optional(),
  slug: z.string(),
  iconUrl: z.string().optional(),
  splashUrl: z.string().optional(),
})

export const championAbilitySchema = z.object({
  key: z.string(),
  name: z.string(),
  description: z.string().optional(),
  tooltip: z.string().optional(),
  iconUrl: z.string().optional(),
  videoUrl: z.string().optional(),
  maxRank: z.number().nullable().optional(),
  cooldowns: z.array(z.number()).optional(),
  costs: z.array(z.number()).optional(),
  ranges: z.array(z.number()).optional(),
})

export const championProfileSchema = z.object({
  championId: z.string(),
  key: z.string(),
  name: z.string(),
  title: z.string().optional(),
  imageUrl: z.string().optional(),
  blurb: z.string().optional(),
  lore: z.string().optional(),
  partype: z.string().optional(),
  tags: z.array(z.string()).optional(),
  allyTips: z.array(z.string()).optional(),
  enemyTips: z.array(z.string()).optional(),
  source: z.string().optional(),
  info: z
    .object({
      attack: z.number().optional(),
      defense: z.number().optional(),
      magic: z.number().optional(),
      difficulty: z.number().optional(),
    })
    .optional(),
  passive: championAbilitySchema.optional(),
  spells: z.array(championAbilitySchema).optional(),
})

export const supportedModeSchema = z.object({
  id: gameModeIdSchema,
  label: z.string(),
  features: z.array(z.string()),
})

export const settingsSchema = z.object({
  version: z.literal(1),
  language: languageSettingSchema,
  theme: z.object({
    preference: themePreferenceSchema,
  }),
  dataSource: z.object({
    opgg: z.object({
      region: z.enum(OPGG_REGIONS),
      tier: z.enum(OPGG_TIERS),
    }),
  }),
  overlay: z.object({
    pinned: z.boolean(),
    interactive: z.boolean(),
    x: z.number().int(),
    y: z.number().int(),
    augmentRarity: z.enum(['prismatic', 'gold', 'silver']),
  }),
  hotkeys: z.object({
    togglePinned: z.string().min(1),
    toggleInteractive: z.string().min(1),
  }),
})

export const settingsPatchSchema = z
  .object({
    language: languageSettingSchema.optional(),
    theme: z
      .object({
        preference: themePreferenceSchema.optional(),
      })
      .optional(),
    dataSource: z
      .object({
        opgg: z
          .object({
            region: z.enum(OPGG_REGIONS).optional(),
            tier: z.enum(OPGG_TIERS).optional(),
          })
          .optional(),
      })
      .optional(),
    overlay: z
      .object({
        pinned: z.boolean().optional(),
        interactive: z.boolean().optional(),
        x: z.number().int().optional(),
        y: z.number().int().optional(),
        augmentRarity: z.enum(['prismatic', 'gold', 'silver']).optional(),
      })
      .optional(),
    hotkeys: z
      .object({
        togglePinned: z.string().min(1).optional(),
        toggleInteractive: z.string().min(1).optional(),
      })
      .optional(),
  })
  .strict()

export const summonerInfoSchema = z.object({
  puuid: z.string().optional(),
  gameName: z.string().optional(),
  displayName: z.string().optional(),
  tagLine: z.string().optional(),
  summonerLevel: z.number().optional(),
  profileIconId: z.number().int().optional(),
})

export const lcuStatusSchema = z.object({
  connected: z.boolean(),
  phase: z.string().optional(),
  currentChampionId: z.number().int().optional(),
  queueId: z.number().int().optional(),
  inProgress: z.boolean().optional(),
  champSelectSession: z
    .object({
      localPlayerCellId: z.number().int().optional(),
      myTeam: z.array(
        z.object({
          cellId: z.number().int().optional(),
          puuid: z.string().optional(),
          championId: z.number().int().optional(),
          championPickIntent: z.number().int().optional(),
          assignedPosition: z.string().optional(),
        }),
      ),
      theirTeam: z.array(
        z.object({
          cellId: z.number().int().optional(),
          puuid: z.string().optional(),
          championId: z.number().int().optional(),
          championPickIntent: z.number().int().optional(),
          assignedPosition: z.string().optional(),
        }),
      ),
    })
    .optional(),
  summoner: summonerInfoSchema.optional(),
})

export const liveClientStatusSchema = z.object({
  connected: z.boolean(),
  championName: z.string().optional(),
  championId: z.number().int().optional(),
  gameMode: z.string().optional(),
  activePlayerName: z.string().optional(),
  allPlayers: z
    .array(
      z.object({
        team: z.string().optional(),
        summonerName: z.string().optional(),
        championName: z.string().optional(),
        championId: z.number().int().optional(),
        isBot: z.boolean().optional(),
      }),
    )
    .optional(),
})

export const gameContextSchema = z.object({
  modeId: gameModeIdSchema,
  isSupportedMode: z.boolean(),
  isGameRelated: z.boolean(),
  detectedChampionId: z.number().int().optional(),
  detectedChampionSource: z.union([z.literal('lcu'), z.literal('liveclient'), z.null()]),
  lcu: lcuStatusSchema,
  live: liveClientStatusSchema,
})

export const playerCareerSnapshotSchema = z.object({
  puuid: z.string(),
  summoner: summonerInfoSchema.optional(),
  recentMatches: z.array(
    z.object({
      gameId: z.number().int().optional(),
      queueId: z.number().int().optional(),
      championId: z.number().int().optional(),
      win: z.boolean().nullable(),
      kills: z.number().nullable(),
      deaths: z.number().nullable(),
      assists: z.number().nullable(),
      kda: z.number().nullable(),
      gameCreation: z.number().optional(),
      gameDuration: z.number().optional(),
    }),
  ),
})

export const augmentRecommendationSchema = z.object({
  augmentId: z.string(),
  tier: z.number().nullable(),
  pickRate: z.number().nullable(),
  winRate: z.number().nullable(),
  games: z.number().nullable(),
  name: z.string().optional(),
  tooltip: z.string().optional(),
  iconUrl: z.string().optional(),
  rarity: z
    .union([z.string(), z.number()])
    .transform((value) => String(value))
    .optional(),
})

export const itemRecommendationSchema = z.object({
  itemId: z.string(),
  tier: z.number().nullable(),
  pickRate: z.number().nullable(),
  winRate: z.number().nullable(),
  games: z.number().nullable(),
  name: z.string().optional(),
  description: z.string().optional(),
  iconUrl: z.string().optional(),
  averageIndex: z.number().nullable().optional(),
})

export const runeRecommendationSchema = z.object({
  primaryStyleId: z.number().int(),
  subStyleId: z.number().int(),
  selectedPerkIds: z.array(z.number().int()),
  pickRate: z.number().nullable(),
  winRate: z.number().nullable().optional(),
  games: z.number().nullable().optional(),
  primaryStyleName: z.string().optional(),
  subStyleName: z.string().optional(),
  primaryStyleIconUrl: z.string().optional(),
  subStyleIconUrl: z.string().optional(),
  primaryPerkIds: z.array(z.number().int()).optional(),
  secondaryPerkIds: z.array(z.number().int()).optional(),
  statModIds: z.array(z.number().int()).optional(),
  primaryPerks: z
    .array(z.object({ id: z.number().int(), name: z.string().optional(), iconUrl: z.string().optional() }))
    .optional(),
  secondaryPerks: z
    .array(z.object({ id: z.number().int(), name: z.string().optional(), iconUrl: z.string().optional() }))
    .optional(),
  statMods: z
    .array(z.object({ id: z.number().int(), name: z.string().optional(), iconUrl: z.string().optional() }))
    .optional(),
})

export const summonerSpellRecommendationSchema = z.object({
  summonerSpellIds: z.array(z.number().int()),
  games: z.number().nullable(),
  pickRate: z.number().nullable(),
  winRate: z.number().nullable(),
  spells: z
    .array(z.object({ id: z.number().int(), name: z.string().optional(), iconUrl: z.string().optional() }))
    .optional(),
})

export const skillOrderRecommendationSchema = z.object({
  skillOrder: z.array(z.number().int()),
  games: z.number().nullable(),
  pickRate: z.number().nullable(),
  winRate: z.number().nullable(),
})

export const skillMasteryRecommendationSchema = z.object({
  order: z.array(z.string()),
  pickRate: z.number().nullable(),
  winRate: z.number().nullable(),
})

export const startingItemsRecommendationSchema = z.object({
  itemIds: z.array(z.number().int()),
  games: z.number().nullable(),
  pickRate: z.number().nullable(),
  winRate: z.number().nullable(),
  items: z
    .array(z.object({ id: z.number().int(), name: z.string().optional(), iconUrl: z.string().optional() }))
    .optional(),
})

export const counterRecommendationSchema = z.object({
  championId: z.string(),
  winRate: z.number().nullable(),
  pickRate: z.number().nullable(),
})

export const synergyRecommendationSchema = z.object({
  championId: z.string(),
  winRate: z.number().nullable(),
  pickRate: z.number().nullable(),
  averagePlace: z.number().nullable(),
})

export const buildSummarySchema = z.object({
  winRate: z.number().nullable(),
  pickRate: z.number().nullable(),
  banRate: z.number().nullable(),
  kda: z.number().nullable(),
  tier: z.number().nullable(),
  rank: z.number().nullable(),
  averagePlace: z.number().nullable(),
  firstRate: z.number().nullable(),
})

export const buildResultSchema = z.object({
  mode: gameModeIdSchema,
  championId: z.string(),
  patch: z.string(),
  dt: z.string().optional(),
  dataSource: z.string().optional(),
  position: z.string().optional(),
  summary: buildSummarySchema.optional(),
  augments: z.array(augmentRecommendationSchema),
  items: z.array(itemRecommendationSchema),
  prismaticItems: z.array(startingItemsRecommendationSchema).optional(),
  runes: z.array(runeRecommendationSchema).optional(),
  summonerSpells: z.array(summonerSpellRecommendationSchema).optional(),
  skillOrders: z.array(skillOrderRecommendationSchema).optional(),
  skillMasteries: z.array(skillMasteryRecommendationSchema).optional(),
  startingItems: z.array(startingItemsRecommendationSchema).optional(),
  coreItems: z.array(startingItemsRecommendationSchema).optional(),
  bootsItems: z.array(startingItemsRecommendationSchema).optional(),
  situationalItems: z.array(z.number().int()).optional(),
  counters: z
    .object({
      strongAgainst: z.array(counterRecommendationSchema),
      weakAgainst: z.array(counterRecommendationSchema),
    })
    .optional(),
  synergies: z.array(synergyRecommendationSchema).optional(),
})

export const accessibilityStatusSchema = z.object({ trusted: z.boolean() })

export const getChampionsRequestSchema = z
  .object({
    lang: riotLocaleSchema.optional(),
  })
  .optional()

export const getChampionProfileRequestSchema = z.object({
  championId: z.string().regex(/^[0-9]{1,6}$/),
  lang: riotLocaleSchema.optional(),
})

export const getBuildRequestSchema = z.object({
  mode: gameModeIdSchema,
  championId: z.string().regex(/^[0-9]{1,6}$/),
  lang: riotLocaleSchema.optional(),
  force: z.boolean().optional(),
})

export const clearBuildCacheRequestSchema = z.object({
  mode: gameModeIdSchema,
})

export const setOverlayVisibleRequestSchema = z.object({
  visible: z.boolean(),
})

export const setOverlayInteractiveRequestSchema = z.object({
  interactive: z.boolean(),
})

export const getPlayerCareerRequestSchema = z.object({
  puuid: z.string().min(8),
})

export const getSummonerByPuuidRequestSchema = z.object({
  puuid: z.string().min(8),
})

export const emptyResponseSchema = z.undefined()

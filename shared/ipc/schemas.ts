import { z } from 'zod'

import {
  accessibilityStatusSchema,
  buildResultSchema,
  championProfileSchema,
  championSummarySchema,
  clearBuildCacheRequestSchema,
  emptyResponseSchema,
  gameContextSchema,
  getPlayerCareerRequestSchema,
  getSummonerByPuuidRequestSchema,
  getBuildRequestSchema,
  getChampionProfileRequestSchema,
  getChampionsRequestSchema,
  lcuStatusSchema,
  playerCareerSnapshotSchema,
  summonerInfoSchema,
  setOverlayInteractiveRequestSchema,
  setOverlayVisibleRequestSchema,
  settingsPatchSchema,
  settingsSchema,
  supportedModeSchema,
} from '../contracts'
import { IPC_CHANNELS } from './channels'

const noInputSchema = z.undefined()

export const invokeChannelSchemas = {
  [IPC_CHANNELS.invoke.buildGetChampions]: {
    input: getChampionsRequestSchema,
    output: z.array(championSummarySchema),
  },
  [IPC_CHANNELS.invoke.buildGetChampionProfile]: {
    input: getChampionProfileRequestSchema,
    output: championProfileSchema,
  },
  [IPC_CHANNELS.invoke.buildGetSupportedModes]: {
    input: noInputSchema,
    output: z.array(supportedModeSchema),
  },
  [IPC_CHANNELS.invoke.buildGet]: {
    input: getBuildRequestSchema,
    output: buildResultSchema,
  },
  [IPC_CHANNELS.invoke.buildClearCache]: {
    input: clearBuildCacheRequestSchema,
    output: emptyResponseSchema,
  },

  [IPC_CHANNELS.invoke.gameGetActiveBuildSnapshot]: {
    input: noInputSchema,
    output: buildResultSchema.nullable(),
  },
  [IPC_CHANNELS.invoke.gameGetContextSnapshot]: {
    input: noInputSchema,
    output: gameContextSchema,
  },
  [IPC_CHANNELS.invoke.gameRefreshContext]: {
    input: noInputSchema,
    output: gameContextSchema,
  },
  [IPC_CHANNELS.invoke.gameGetPlayerCareer]: {
    input: getPlayerCareerRequestSchema,
    output: playerCareerSnapshotSchema,
  },
  [IPC_CHANNELS.invoke.gameGetSummonerByPuuid]: {
    input: getSummonerByPuuidRequestSchema,
    output: summonerInfoSchema.nullable(),
  },
  [IPC_CHANNELS.invoke.gameGetLcuStatus]: {
    input: noInputSchema,
    output: lcuStatusSchema,
  },
  [IPC_CHANNELS.invoke.gameStartLcuAutoDetect]: {
    input: noInputSchema,
    output: emptyResponseSchema,
  },

  [IPC_CHANNELS.invoke.settingsGet]: {
    input: noInputSchema,
    output: settingsSchema,
  },
  [IPC_CHANNELS.invoke.settingsUpdate]: {
    input: settingsPatchSchema,
    output: settingsSchema,
  },
  [IPC_CHANNELS.invoke.settingsReset]: {
    input: noInputSchema,
    output: settingsSchema,
  },

  [IPC_CHANNELS.invoke.systemGetAccessibilityStatus]: {
    input: noInputSchema,
    output: accessibilityStatusSchema,
  },
  [IPC_CHANNELS.invoke.systemOpenAccessibilitySettings]: {
    input: noInputSchema,
    output: emptyResponseSchema,
  },

  [IPC_CHANNELS.invoke.overlayToggle]: {
    input: noInputSchema,
    output: emptyResponseSchema,
  },
  [IPC_CHANNELS.invoke.overlaySetVisible]: {
    input: setOverlayVisibleRequestSchema,
    output: emptyResponseSchema,
  },
  [IPC_CHANNELS.invoke.overlaySetInteractive]: {
    input: setOverlayInteractiveRequestSchema,
    output: emptyResponseSchema,
  },

  [IPC_CHANNELS.invoke.windowMinimize]: {
    input: noInputSchema,
    output: emptyResponseSchema,
  },
  [IPC_CHANNELS.invoke.windowMaximizeToggle]: {
    input: noInputSchema,
    output: emptyResponseSchema,
  },
  [IPC_CHANNELS.invoke.windowClose]: {
    input: noInputSchema,
    output: emptyResponseSchema,
  },
} as const

export const eventPayloadSchemas = {
  [IPC_CHANNELS.event.gameLcuStatusChanged]: lcuStatusSchema,
  [IPC_CHANNELS.event.gameDetectedChampionChanged]: z.number().int(),
  [IPC_CHANNELS.event.gameActiveBuildChanged]: buildResultSchema.nullable(),
  [IPC_CHANNELS.event.gameContextChanged]: gameContextSchema,
  [IPC_CHANNELS.event.settingsChanged]: settingsSchema,
} as const

export const IPC_CHANNELS = {
  invoke: {
    buildGetChampions: 'build:getChampions',
    buildGetChampionProfile: 'build:getChampionProfile',
    buildGetSupportedModes: 'build:getSupportedModes',
    buildGet: 'build:get',
    buildClearCache: 'build:clearCache',

    gameGetActiveBuildSnapshot: 'game:getActiveBuildSnapshot',
    gameGetContextSnapshot: 'game:getContextSnapshot',
    gameRefreshContext: 'game:refreshContext',
    gameGetPlayerCareer: 'game:getPlayerCareer',
    gameGetSummonerByPuuid: 'game:getSummonerByPuuid',
    gameGetLcuStatus: 'game:getLcuStatus',
    gameStartLcuAutoDetect: 'game:startLcuAutoDetect',

    settingsGet: 'settings:get',
    settingsUpdate: 'settings:update',
    settingsReset: 'settings:reset',

    systemGetAccessibilityStatus: 'system:getAccessibilityStatus',
    systemOpenAccessibilitySettings: 'system:openAccessibilitySettings',
    updateGetStatus: 'update:getStatus',
    updateCheck: 'update:check',
    updateDownload: 'update:download',
    updateInstall: 'update:install',

    overlayToggle: 'overlay:toggle',
    overlaySetVisible: 'overlay:setVisible',
    overlaySetInteractive: 'overlay:setInteractive',

    windowMinimize: 'window:minimize',
    windowMaximizeToggle: 'window:maximizeToggle',
    windowClose: 'window:close',
  },
  event: {
    gameLcuStatusChanged: 'game:lcuStatus:changed',
    gameDetectedChampionChanged: 'game:detectedChampion:changed',
    gameActiveBuildChanged: 'game:activeBuild:changed',
    gameContextChanged: 'game:context:changed',
    settingsChanged: 'settings:changed',
    updateStatusChanged: 'update:status:changed',
  },
} as const

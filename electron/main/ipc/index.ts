import type { MainProcessDependencies } from '../bootstrap/dependencies'
import type { AppRuntime } from '../services/appRuntime'
import type { MainServices } from '../services'
import type { SenderGuard } from '../security/senderGuard'
import { registerBuildHandlers } from './handlers/buildHandlers'
import { registerGameHandlers } from './handlers/gameHandlers'
import { registerOverlayHandlers } from './handlers/overlayHandlers'
import { registerSettingsHandlers } from './handlers/settingsHandlers'
import { registerSystemHandlers } from './handlers/systemHandlers'
import { registerUpdateHandlers } from './handlers/updateHandlers'
import { registerWindowHandlers } from './handlers/windowHandlers'
import { createIpcRegistry } from './registry'

export function registerIpcHandlers(
  runtime: AppRuntime,
  senderGuard: SenderGuard,
  dependencies: MainProcessDependencies,
  services: MainServices,
) {
  const registry = createIpcRegistry(senderGuard)

  registerBuildHandlers(registry, services)
  registerGameHandlers(registry, services)
  registerSettingsHandlers(registry, runtime, dependencies)
  registerSystemHandlers(registry, runtime)
  registerUpdateHandlers(registry, services)
  registerOverlayHandlers(registry, runtime)
  registerWindowHandlers(registry, runtime)
}

import { app } from 'electron'
import path from 'node:path'

import { log, setLogDirectory } from '../../services/logging/logger'
import { createMainProcessDependencies } from './dependencies'
import { registerIpcHandlers } from '../ipc'
import { registerMainToRendererEvents } from '../ipc/events'
import { createInvokeSenderGuard } from '../security/senderGuard'
import { buildTrustedRendererOrigins } from '../security/navigation'
import { installWebContentsSecurityPolicy } from '../security/webContentsPolicy'
import { enforceAppDataVersion } from '../services/appDataVersioning'
import { AppRuntime } from '../services/appRuntime'
import { createMainServices } from '../services'

export function createContainer() {
  const logger = log('main')
  const dependencies = createMainProcessDependencies()
  const services = createMainServices(dependencies)
  const runtime = new AppRuntime(logger, dependencies)
  const trustedOrigins = buildTrustedRendererOrigins(process.env.VITE_DEV_SERVER_URL)
  const senderGuard = createInvokeSenderGuard(trustedOrigins)

  let disposeEventBridge: (() => void) | null = null
  let ipcRegistered = false

  async function bootstrap() {
    setLogDirectory(path.join(app.getPath('userData'), 'logs'))

    process.on('uncaughtException', (err) => {
      logger.error('uncaughtException', { message: err?.message, stack: err?.stack })
    })

    process.on('unhandledRejection', (reason) => {
      logger.error('unhandledRejection', { reason: String(reason) })
    })

    await enforceAppDataVersion(logger)

    installWebContentsSecurityPolicy({ trustedOrigins, logger })

    if (!ipcRegistered) {
      registerIpcHandlers(runtime, senderGuard, dependencies, services)
      ipcRegistered = true
    }

    await runtime.start()

    if (!disposeEventBridge) {
      disposeEventBridge = registerMainToRendererEvents(dependencies)
    }
  }

  function shutdown() {
    if (disposeEventBridge) {
      disposeEventBridge()
      disposeEventBridge = null
    }
    runtime.shutdown()
  }

  return {
    logger,
    runtime,
    bootstrap,
    shutdown,
  }
}

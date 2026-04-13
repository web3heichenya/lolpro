import { app, session } from 'electron'
import { BROWSER_HTML_PROBE_PARTITION } from '../../services/net/constants'

import { isTrustedRendererUrl } from './navigation'

type Logger = {
  info: (msg: string, meta?: Record<string, unknown>) => void
  warn: (msg: string, meta?: Record<string, unknown>) => void
  error: (msg: string, meta?: Record<string, unknown>) => void
}

export function installWebContentsSecurityPolicy(params: { trustedOrigins: Set<string>; logger: Logger }) {
  const { trustedOrigins, logger } = params
  const isDevtoolsOrigin = (origin: string) => origin.startsWith('devtools://')
  const noisyPermissions = new Set(['media', 'geolocation'])
  const opggProbeSession = session.fromPartition(BROWSER_HTML_PROBE_PARTITION)

  const logPermissionDenied = (meta: { kind: 'request' | 'check'; permission: string; origin: string }) => {
    if (isDevtoolsOrigin(meta.origin)) return
    const msg = meta.kind === 'request' ? 'permission request denied' : 'permission check denied'
    // These are expected denials for this app; keep logs but reduce severity.
    if (noisyPermissions.has(meta.permission)) {
      logger.info(msg, { permission: meta.permission, requestingOrigin: meta.origin })
      return
    }
    logger.warn(msg, { permission: meta.permission, requestingOrigin: meta.origin })
  }

  app.on('web-contents-created', (_event, contents) => {
    contents.setWindowOpenHandler(({ url }) => {
      logger.warn('blocked window open', { url })
      return { action: 'deny' }
    })

    contents.on('will-attach-webview', (event) => {
      event.preventDefault()
      logger.warn('blocked webview attach')
    })

    contents.on('will-navigate', (event, url) => {
      // Internal OP.GG diagnostic/fallback window uses its own isolated partition.
      if (contents.session === opggProbeSession) return
      if (isTrustedRendererUrl(url, trustedOrigins)) return
      event.preventDefault()
      logger.warn('blocked navigation', { url })
    })
  })

  session.defaultSession.setPermissionRequestHandler((wc, permission, callback) => {
    const url = wc.getURL()
    logPermissionDenied({ kind: 'request', permission, origin: url })
    callback(false)
  })

  session.defaultSession.setPermissionCheckHandler((_wc, permission, requestingOrigin) => {
    logPermissionDenied({ kind: 'check', permission, origin: requestingOrigin })
    return false
  })
}

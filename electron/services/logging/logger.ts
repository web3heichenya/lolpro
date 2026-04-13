import electronLog from 'electron-log/main'
import path from 'node:path'

type Level = 'info' | 'warn' | 'error'

let initialized = false

function ensureInit() {
  if (initialized) return
  initialized = true
  electronLog.initialize({ preload: false })
  electronLog.transports.console.level = process.env.NODE_ENV === 'production' ? false : 'silly'
  electronLog.transports.file.level = 'info'
}

export function setLogDirectory(dir: string) {
  ensureInit()
  electronLog.transports.file.resolvePathFn = () => path.join(dir, 'main.log')
}

function withMeta(message: string, meta?: Record<string, unknown>) {
  if (!meta) return message
  return `${message} ${JSON.stringify(meta)}`
}

export function log(scope: string) {
  ensureInit()

  const emit = (level: Level, msg: string, meta?: Record<string, unknown>) => {
    const content = `[${scope}] ${withMeta(msg, meta)}`
    if (level === 'info') electronLog.info(content)
    else if (level === 'warn') electronLog.warn(content)
    else electronLog.error(content)
  }

  return {
    info: (msg: string, meta?: Record<string, unknown>) => emit('info', msg, meta),
    warn: (msg: string, meta?: Record<string, unknown>) => emit('warn', msg, meta),
    error: (msg: string, meta?: Record<string, unknown>) => emit('error', msg, meta),
  }
}

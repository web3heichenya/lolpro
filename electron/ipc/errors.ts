import type { IpcErrorCode, IpcErrorPayload } from '../../shared/contracts'

export class IpcHandledError extends Error {
  payload: IpcErrorPayload

  constructor(payload: IpcErrorPayload) {
    super(payload.message)
    this.name = 'IpcHandledError'
    this.payload = payload
  }
}

export function ipcError(
  code: IpcErrorCode,
  message: string,
  details?: Record<string, unknown>,
): IpcHandledError {
  return new IpcHandledError({ code, message, details })
}

export function normalizeIpcError(error: unknown): IpcErrorPayload {
  if (error instanceof IpcHandledError) return error.payload
  if (error instanceof Error) {
    return {
      code: 'INTERNAL_ERROR',
      message: error.message,
    }
  }
  return {
    code: 'INTERNAL_ERROR',
    message: String(error),
  }
}

export function encodeIpcError(error: unknown): Error {
  const payload = normalizeIpcError(error)
  return new Error(JSON.stringify(payload))
}

export function decodeIpcError(raw: unknown): IpcErrorPayload {
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>
    if (typeof obj.code === 'string' && typeof obj.message === 'string') {
      return {
        code: obj.code as IpcErrorCode,
        message: obj.message,
        details:
          obj.details && typeof obj.details === 'object'
            ? (obj.details as Record<string, unknown>)
            : undefined,
      }
    }
  }

  if (raw instanceof Error) {
    try {
      const parsed = JSON.parse(raw.message) as IpcErrorPayload
      if (parsed && typeof parsed.code === 'string' && typeof parsed.message === 'string') return parsed
    } catch {
      // fall through
    }
    return { code: 'INTERNAL_ERROR', message: raw.message }
  }

  return { code: 'INTERNAL_ERROR', message: String(raw) }
}

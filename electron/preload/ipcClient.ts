import { ipcRenderer } from 'electron'

import type { EventChannel, EventPayload, InvokeChannel, InvokeInput, InvokeOutput } from '../../shared/ipc'
import type { IpcErrorPayload } from '../../shared/contracts'
import { decodeIpcError } from '../ipc/errors'

export async function invokeIpc<TChannel extends InvokeChannel>(
  channel: TChannel,
  input?: InvokeInput<TChannel>,
): Promise<InvokeOutput<TChannel>> {
  try {
    if (typeof input === 'undefined') {
      return (await ipcRenderer.invoke(channel)) as InvokeOutput<TChannel>
    }
    return (await ipcRenderer.invoke(channel, input)) as InvokeOutput<TChannel>
  } catch (error) {
    const parsed = decodeIpcError(error)
    const decorated = new Error(`[${parsed.code}] ${parsed.message}`) as Error & {
      ipc?: IpcErrorPayload
    }
    decorated.ipc = parsed
    throw decorated
  }
}

export function subscribeIpcEvent<TChannel extends EventChannel>(
  channel: TChannel,
  cb: (payload: EventPayload<TChannel>) => void,
) {
  const handler = (_evt: unknown, payload: EventPayload<TChannel>) => cb(payload)
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.off(channel, handler)
}

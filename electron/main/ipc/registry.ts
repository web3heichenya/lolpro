import { ipcMain, type IpcMainInvokeEvent } from 'electron'

import {
  invokeChannelSchemas,
  type InvokeChannel,
  type InvokeInput,
  type InvokeOutput,
} from '../../../shared/ipc'
import { encodeIpcError, ipcError } from '../../ipc/errors'
import type { SenderGuard } from '../security/senderGuard'

type Handler<TChannel extends InvokeChannel> = (
  input: InvokeInput<TChannel>,
  event: IpcMainInvokeEvent,
) => Promise<InvokeOutput<TChannel>> | InvokeOutput<TChannel>

function parseInput<TChannel extends InvokeChannel>(
  channel: TChannel,
  rawInput: unknown,
): InvokeInput<TChannel> {
  const schema = invokeChannelSchemas[channel].input
  const parsed = schema.safeParse(rawInput)
  if (!parsed.success) {
    throw ipcError('VALIDATION_ERROR', `Invalid payload for ${channel}`, {
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    })
  }
  return parsed.data as InvokeInput<TChannel>
}

function parseOutput<TChannel extends InvokeChannel>(
  channel: TChannel,
  rawOutput: unknown,
): InvokeOutput<TChannel> {
  const schema = invokeChannelSchemas[channel].output
  const parsed = schema.safeParse(rawOutput)
  if (!parsed.success) {
    throw ipcError('INTERNAL_ERROR', `Invalid response for ${channel}`, {
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    })
  }
  return parsed.data as InvokeOutput<TChannel>
}

const shouldValidateIpcOutput =
  process.env.IPC_VALIDATE_OUTPUT === '1' || process.env.NODE_ENV !== 'production'

export function createIpcRegistry(senderGuard: SenderGuard) {
  return {
    handle<TChannel extends InvokeChannel>(channel: TChannel, handler: Handler<TChannel>) {
      ipcMain.handle(channel, async (event, rawInput) => {
        try {
          senderGuard(event, channel)
          const input = parseInput(channel, rawInput)
          const output = await handler(input, event)
          if (shouldValidateIpcOutput) return parseOutput(channel, output)
          return output as InvokeOutput<TChannel>
        } catch (error) {
          throw encodeIpcError(error)
        }
      })
    },
  }
}

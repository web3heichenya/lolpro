import type { IpcMainInvokeEvent } from 'electron'

import { ipcError } from '../../ipc/errors'
import { isTrustedRendererUrl } from './navigation'

export type SenderGuard = (event: IpcMainInvokeEvent, channel: string) => void

export function createInvokeSenderGuard(trustedOrigins: Set<string>): SenderGuard {
  return (event, channel) => {
    const frameUrl = event.senderFrame?.url ?? ''
    const senderUrl = event.sender.getURL()
    const candidateUrl = frameUrl || senderUrl

    if (!isTrustedRendererUrl(candidateUrl, trustedOrigins)) {
      throw ipcError('FORBIDDEN', `Forbidden sender for ${channel}`, {
        senderUrl,
        frameUrl,
      })
    }
  }
}

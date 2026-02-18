import { shell } from 'electron'

import { IPC_CHANNELS } from '../../../../shared/ipc'
import type { AppRuntime } from '../../services/appRuntime'
import type { createIpcRegistry } from '../registry'

type Registry = ReturnType<typeof createIpcRegistry>

export function registerSystemHandlers(registry: Registry, runtime: AppRuntime) {
  registry.handle(IPC_CHANNELS.invoke.systemGetAccessibilityStatus, async () => {
    return runtime.getAccessibilityStatus()
  })

  registry.handle(IPC_CHANNELS.invoke.systemOpenAccessibilitySettings, async () => {
    if (process.platform !== 'darwin') return undefined
    await shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility')
    return undefined
  })
}

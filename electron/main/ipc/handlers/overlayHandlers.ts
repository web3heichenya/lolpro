import { IPC_CHANNELS } from '../../../../shared/ipc'
import type { AppRuntime } from '../../services/appRuntime'
import type { createIpcRegistry } from '../registry'

type Registry = ReturnType<typeof createIpcRegistry>

export function registerOverlayHandlers(registry: Registry, runtime: AppRuntime) {
  registry.handle(IPC_CHANNELS.invoke.overlayToggle, async () => {
    runtime.toggleOverlay()
    return undefined
  })

  registry.handle(IPC_CHANNELS.invoke.overlaySetVisible, async ({ visible }) => {
    if (!visible) {
      await runtime.updateSettings({ overlay: { pinned: false } })
      return
    }
    await runtime.updateSettings({ overlay: { pinned: true, interactive: true } })
    return undefined
  })

  registry.handle(IPC_CHANNELS.invoke.overlaySetInteractive, async ({ interactive }) => {
    await runtime.updateSettings({ overlay: { interactive } })
    return undefined
  })
}

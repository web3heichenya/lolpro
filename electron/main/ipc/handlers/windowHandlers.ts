import { IPC_CHANNELS } from '../../../../shared/ipc'
import type { AppRuntime } from '../../services/appRuntime'
import type { createIpcRegistry } from '../registry'

type Registry = ReturnType<typeof createIpcRegistry>

export function registerWindowHandlers(registry: Registry, runtime: AppRuntime) {
  registry.handle(IPC_CHANNELS.invoke.windowMinimize, async () => {
    runtime.getMainWindow()?.minimize()
    return undefined
  })

  registry.handle(IPC_CHANNELS.invoke.windowMaximizeToggle, async () => {
    const win = runtime.getMainWindow()
    if (!win) return undefined
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
    return undefined
  })

  registry.handle(IPC_CHANNELS.invoke.windowClose, async () => {
    runtime.getMainWindow()?.close()
    return undefined
  })
}

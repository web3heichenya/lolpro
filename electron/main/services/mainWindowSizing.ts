import type { BrowserWindow } from 'electron'
import type { Settings } from '../../../shared/contracts'

const MAIN_WINDOW_RESIZE_PERSIST_MS = 400

export function applyMainWindowSize(
  win: BrowserWindow | null,
  settings: Settings,
  onApplyingChange: (value: boolean) => void,
) {
  if (!win) return
  if (win.isMaximized() || win.isMinimized() || win.isFullScreen()) return
  const { width, height } = settings.window.main
  const [currentWidth, currentHeight] = win.getSize()
  if (currentWidth === width && currentHeight === height) return

  onApplyingChange(true)
  win.setSize(width, height, false)
  setTimeout(() => onApplyingChange(false), 0)
}

export function bindMainWindowResizePersistence(params: {
  win: BrowserWindow
  isApplying: () => boolean
  onResizeStable: (size: { width: number; height: number }) => void
}) {
  let debounce: NodeJS.Timeout | null = null

  const listener = () => {
    if (params.isApplying()) return
    if (params.win.isMaximized() || params.win.isMinimized() || params.win.isFullScreen()) return
    if (debounce) clearTimeout(debounce)
    debounce = setTimeout(() => {
      const [width, height] = params.win.getSize()
      params.onResizeStable({ width, height })
    }, MAIN_WINDOW_RESIZE_PERSIST_MS)
  }

  params.win.on('resize', listener)

  return () => {
    if (debounce) clearTimeout(debounce)
    debounce = null
    params.win.off('resize', listener)
  }
}

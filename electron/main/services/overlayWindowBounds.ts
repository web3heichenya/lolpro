import { screen, type BrowserWindow } from 'electron'
import type { Settings } from '../../../shared/contracts'

const OVERLAY_DEFAULT_WIDTH = 460
const OVERLAY_DEFAULT_HEIGHT = 360
const OVERLAY_COMPACT_HEIGHT = 176
const OVERLAY_MIN_WIDTH = 320
const OVERLAY_MIN_HEIGHT = 240
const OVERLAY_COMPACT_MIN_HEIGHT = 176
const OVERLAY_MAX_WIDTH = 2_000
const OVERLAY_MAX_HEIGHT = 2_000
const OVERLAY_RIGHT_MARGIN = 20
const OVERLAY_TOP_MARGIN = 40
const OVERLAY_BOUNDS_PERSIST_MS = 400

function clamp(value: number | undefined, min: number, max: number, fallback: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, Math.trunc(value)))
}

export function getOverlayWindowBounds(
  overlay?: Pick<Settings['overlay'], 'width' | 'height' | 'x' | 'y'>,
  compact = false,
) {
  const width = clamp(overlay?.width, OVERLAY_MIN_WIDTH, OVERLAY_MAX_WIDTH, OVERLAY_DEFAULT_WIDTH)
  const height = compact
    ? OVERLAY_COMPACT_HEIGHT
    : clamp(overlay?.height, OVERLAY_MIN_HEIGHT, OVERLAY_MAX_HEIGHT, OVERLAY_DEFAULT_HEIGHT)
  const { width: displayWidth } = screen.getPrimaryDisplay().workAreaSize
  const x =
    typeof overlay?.x === 'number' && overlay.x >= 0
      ? Math.trunc(overlay.x)
      : Math.max(0, displayWidth - width - OVERLAY_RIGHT_MARGIN)
  const y = typeof overlay?.y === 'number' && overlay.y >= 0 ? Math.trunc(overlay.y) : OVERLAY_TOP_MARGIN
  return { width, height, x, y }
}

export function applyOverlayBounds(params: {
  win: BrowserWindow | null
  overlay: Pick<Settings['overlay'], 'width' | 'height' | 'x' | 'y'>
  compact?: boolean
  onApplyingChange: (value: boolean) => void
  onResolveInvalidPosition: (position: { x: number; y: number }) => void
}) {
  if (!params.win) return
  const { width, height, x, y } = getOverlayWindowBounds(params.overlay, params.compact)
  if (params.overlay.x < 0 || params.overlay.y < 0) params.onResolveInvalidPosition({ x, y })

  const [currentWidth, currentHeight] = params.win.getSize()
  const [currentX, currentY] = params.win.getPosition()
  if (currentWidth === width && currentHeight === height && currentX === x && currentY === y) return

  params.onApplyingChange(true)
  if (currentWidth !== width || currentHeight !== height) params.win.setSize(width, height, false)
  if (currentX !== x || currentY !== y) params.win.setPosition(x, y, false)
  setTimeout(() => params.onApplyingChange(false), 0)
}

export function bindOverlayBoundsPersistence(params: {
  win: BrowserWindow
  isApplying: () => boolean
  onBoundsStable: (bounds: { x: number; y: number; width: number; height: number }) => void
}) {
  let debounce: NodeJS.Timeout | null = null

  const queueEmit = () => {
    if (params.isApplying()) return
    if (debounce) clearTimeout(debounce)
    debounce = setTimeout(() => {
      const [x, y] = params.win.getPosition()
      const [width, height] = params.win.getSize()
      params.onBoundsStable({ x, y, width, height })
    }, OVERLAY_BOUNDS_PERSIST_MS)
  }

  params.win.on('move', queueEmit)
  params.win.on('resize', queueEmit)

  return () => {
    if (debounce) clearTimeout(debounce)
    debounce = null
    params.win.off('move', queueEmit)
    params.win.off('resize', queueEmit)
  }
}

export function applyOverlayPinnedState(win: BrowserWindow | null, pinned: boolean) {
  if (!win) return
  if (pinned) win.showInactive()
  else win.hide()
}

export function applyOverlayInteractiveState(params: {
  win: BrowserWindow | null
  interactive: boolean
  compact?: boolean
  onDisabled: () => void
}) {
  if (!params.win) return
  const topLevel = process.platform === 'win32' ? 'screen-saver' : 'floating'
  params.win.setAlwaysOnTop(true, topLevel)
  params.win.moveTop()
  params.win.setMinimumSize(
    OVERLAY_MIN_WIDTH,
    params.compact ? OVERLAY_COMPACT_MIN_HEIGHT : OVERLAY_MIN_HEIGHT,
  )
  params.win.setResizable(params.interactive)

  if (params.interactive) {
    params.win.setIgnoreMouseEvents(false)
    params.win.setFocusable(true)
    params.win.show()
    params.win.focus()
    return
  }

  params.win.setIgnoreMouseEvents(true, { forward: true })
  params.win.setFocusable(false)
  params.onDisabled()
}

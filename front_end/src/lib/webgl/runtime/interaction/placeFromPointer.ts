export const PLACE_DRAG_PX = 4
/** Left button places / draws. Right button pans (OrbitControls). */
export const PLACE_POINTER_BUTTON = 0

export type PointerXY = { x: number; y: number }

export function isPlacePointerButton(button: number): boolean {
  return button === PLACE_POINTER_BUTTON
}

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!target || typeof target !== 'object') return false
  const el = target as { tagName?: string; isContentEditable?: boolean }
  const tag = typeof el.tagName === 'string' ? el.tagName.toUpperCase() : ''
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable === true
}

/** Click (not a drag) while a place tool is selected. Select tool never places. Right-click never places. */
export function shouldPlaceMark(options: {
  toolActive: boolean
  down: PointerXY | null
  up: PointerXY
  button?: number
  dragPx?: number
}): boolean {
  if (!options.toolActive) return false
  if (!options.down) return false
  if (!isPlacePointerButton(options.button ?? PLACE_POINTER_BUTTON)) return false
  const limit = options.dragPx ?? PLACE_DRAG_PX
  const dx = options.up.x - options.down.x
  const dy = options.up.y - options.down.y
  return Math.hypot(dx, dy) <= limit
}

/** Screen travel past the click slop — used to expand a highlight ring instead of orbiting. */
export function isExpandDrag(options: {
  toolActive: boolean
  down: PointerXY | null
  now: PointerXY
  dragPx?: number
}): boolean {
  if (!options.toolActive || !options.down) return false
  const limit = options.dragPx ?? PLACE_DRAG_PX
  return Math.hypot(options.now.x - options.down.x, options.now.y - options.down.y) > limit
}

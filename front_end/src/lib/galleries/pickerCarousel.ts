/** Visible rows in the wheel — one centered, one above, one below. */
export const PICKER_VISIBLE_ITEMS = 3

/** Cap touch/momentum velocity (px/ms). */
export const PICKER_MAX_VELOCITY_PX_PER_MS = 0.38

/** Momentum decay per frame (lower = stops sooner). */
export const PICKER_MOMENTUM_FRICTION = 0.82

/** Max index steps queued from one wheel/trackpad gesture. */
export const PICKER_MAX_STEPS_PER_GESTURE = 3

/** Max items touch momentum may coast past the release point. */
export const PICKER_MAX_MOMENTUM_ITEMS = 2

/** Min interval between wheel index steps — prevents fast-wheel jitter. */
export const PICKER_WHEEL_STEP_MS = 100

/** Debounce before committing value after wheel stops. */
export const PICKER_WHEEL_COMMIT_MS = 140

/** Wheel delta (px) required before one index step — filters trackpad micro-events. */
export const PICKER_WHEEL_PIXEL_THRESHOLD_RATIO = 0.55

export function clampPickerVelocity(
  velocity: number,
  max = PICKER_MAX_VELOCITY_PX_PER_MS,
): number {
  return Math.max(-max, Math.min(max, velocity))
}

export function clampPickerPendingSteps(
  steps: number,
  max = PICKER_MAX_STEPS_PER_GESTURE,
): number {
  return Math.max(-max, Math.min(max, steps))
}

export function pickerViewportHeight(itemHeight: number): number {
  return itemHeight * PICKER_VISIBLE_ITEMS
}

/** Scroll position that centers `index` — matches Impact Verse ScrollDatePicker. */
export function scrollTopForIndex(
  index: number,
  itemHeight: number,
  containerHeight: number,
): number {
  const centerOffset = containerHeight / 2 - itemHeight / 2
  const paddingTop = itemHeight
  return index * itemHeight - centerOffset + paddingTop
}

/** Nearest index from current scroll position. */
export function indexFromScrollTop(
  scrollTop: number,
  itemHeight: number,
  containerHeight: number,
): number {
  const centerOffset = containerHeight / 2 - itemHeight / 2
  const paddingTop = itemHeight
  return Math.round((scrollTop + centerOffset - paddingTop) / itemHeight)
}

export function clampIndex(index: number, length: number): number {
  if (length <= 0) return 0
  return Math.max(0, Math.min(index, length - 1))
}

/** Read pixel sizes from the DOM — CSS vars like `2.5rem` must not be parseFloat'd. */
export function measurePickerMetrics(scrollEl: HTMLElement): {
  itemHeight: number
  containerHeight: number
} {
  const containerHeight = scrollEl.clientHeight
  const firstItem = scrollEl.firstElementChild?.firstElementChild
  const measuredItem =
    firstItem instanceof HTMLElement && firstItem.offsetHeight > 0 ? firstItem.offsetHeight : 0
  const itemHeight =
    measuredItem > 0
      ? measuredItem
      : containerHeight > 0
        ? containerHeight / PICKER_VISIBLE_ITEMS
        : 48

  return { itemHeight, containerHeight }
}

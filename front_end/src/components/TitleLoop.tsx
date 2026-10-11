import { useEffect } from 'react'

const OPENER = 'GRAS'
const DUST_TAIL = ' | General Representation of Abstract Systems'
const BASE_TITLE = `${OPENER}${DUST_TAIL}`
const LETTER_MS = 120
const HOLD_MS = 900
const TITLE_HOLD_MS = 2400

/** Set true to type the product line in the tab. Off = static `BASE_TITLE`. */
export const TITLE_LOOP_ENABLED = false

function buildFrames(): string[] {
  const frames: string[] = []
  frames.push(OPENER)
  for (let i = 1; i <= DUST_TAIL.length; i += 1) {
    frames.push(`${OPENER}${DUST_TAIL.slice(0, i)}`)
  }
  return frames
}

function delayFor(current: string): number {
  if (current === BASE_TITLE) return TITLE_HOLD_MS
  if (current === OPENER) return HOLD_MS
  return LETTER_MS
}

/**
 * Tab title. `TITLE_LOOP_ENABLED` types the product line; off keeps `BASE_TITLE`.
 */
export function TitleLoop() {
  useEffect(() => {
    document.title = BASE_TITLE
    if (!TITLE_LOOP_ENABLED) return

    const frames = buildFrames()
    let index = 0
    let timer: number | null = null

    const tick = () => {
      if (document.hidden) return
      const current = frames[index] ?? BASE_TITLE
      document.title = current
      index = (index + 1) % frames.length
      if (timer) window.clearTimeout(timer)
      timer = window.setTimeout(tick, delayFor(current))
    }

    tick()

    const onVisibilityChange = () => {
      if (!document.hidden) {
        tick()
      } else if (timer) {
        window.clearTimeout(timer)
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      if (timer) window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      document.title = BASE_TITLE
    }
  }, [])

  return null
}

import { type RefObject, useEffect, useRef, useState } from 'react'

export const TYPE_MESSAGE_CYCLE_DEFAULT_MS = 3200

export type UseTypeMessageCycleOptions = {
  interval?: number
  playInView?: boolean
  autoplay?: boolean
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Advance through `items` on an interval — motion comes from [TypeAnimText](../components/TypeAnimText.tsx) `anim` + `trigger="enter"`. */
export function useTypeMessageCycle(
  slotRef: RefObject<HTMLElement | null>,
  items: readonly string[],
  options: UseTypeMessageCycleOptions = {},
) {
  const {
    interval = TYPE_MESSAGE_CYCLE_DEFAULT_MS,
    playInView = true,
    autoplay = true,
  } = options

  const [index, setIndex] = useState(0)
  const inViewRef = useRef(true)

  useEffect(() => {
    if (items.length <= 1 || !autoplay || prefersReducedMotion()) return undefined

    let timerId = 0

    const tick = () => {
      if (!inViewRef.current) return
      setIndex((current) => (current + 1) % items.length)
    }

    const schedule = () => {
      window.clearInterval(timerId)
      timerId = window.setInterval(tick, interval)
    }

    if (playInView && typeof IntersectionObserver !== 'undefined') {
      const slot = slotRef.current
      if (!slot) return undefined

      const observer = new IntersectionObserver(
        (entries) => {
          inViewRef.current = entries[0]?.isIntersecting ?? true
          if (inViewRef.current) schedule()
          else window.clearInterval(timerId)
        },
        { threshold: 0.15 },
      )
      observer.observe(slot)
      schedule()

      return () => {
        observer.disconnect()
        window.clearInterval(timerId)
      }
    }

    schedule()
    return () => window.clearInterval(timerId)
  }, [slotRef, items, interval, playInView, autoplay])

  useEffect(() => {
    setIndex(0)
  }, [items])

  return {
    index,
    phrase: items[index] ?? items[0] ?? '',
  }
}

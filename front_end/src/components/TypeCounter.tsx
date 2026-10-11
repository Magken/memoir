import { useRef } from 'react'
import { gsap, useGSAP } from '../lib/gsap'

export type TypeCounterProps = {
  value: number
  /** Shown after the number — e.g. `%`, `k+`, `/mo`. */
  suffix?: string
  typeClass?: string
  duration?: number
  className?: string
  decimals?: number
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Stat odometer — counts up on enter. */
export function TypeCounter({
  value,
  suffix = '',
  typeClass = 'type-display-sm type-tabular',
  duration = 1.4,
  className = '',
  decimals = 0,
}: TypeCounterProps) {
  const rootRef = useRef<HTMLSpanElement>(null)
  const displayRef = useRef<HTMLSpanElement>(null)

  useGSAP(
    () => {
      const display = displayRef.current
      const root = rootRef.current
      if (!display || !root) return undefined

      if (prefersReducedMotion()) {
        display.textContent = value.toFixed(decimals)
        return undefined
      }

      const state = { n: 0 }
      const tween = gsap.to(state, {
        n: value,
        duration,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: root,
          start: 'top 90%',
          once: true,
        },
        onUpdate: () => {
          display.textContent = state.n.toFixed(decimals)
        },
      })

      return () => tween.kill()
    },
    { scope: rootRef, dependencies: [value, duration, decimals], revertOnUpdate: true },
  )

  const rootClass = ['theme-type-counter', typeClass, className].filter(Boolean).join(' ')

  return (
    <span ref={rootRef} className={rootClass}>
      <span ref={displayRef} className="theme-type-counter__value">
        {prefersReducedMotion() ? value.toFixed(decimals) : '0'.padEnd(decimals > 0 ? 3 : 1, '0')}
      </span>
      {suffix ? <span className="theme-type-counter__suffix">{suffix}</span> : null}
    </span>
  )
}

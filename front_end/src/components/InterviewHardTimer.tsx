import { useEffect, useRef, useState } from 'react'
import { formatHardTimerMmSs, hardTimerRemainingMs } from '../lib/interviewRunApi/hardTimerMath'

type InterviewHardTimerProps = {
  /** ISO deadline or epoch ms. */
  deadlineAt: string | number
  /** Total duration ms (drives depleting ring / line). */
  timeoutMs: number
  onExpire?: () => void
  /** `ring` = compact sticky-header circle; `line` = legacy strip. */
  variant?: 'ring' | 'line'
  className?: string
}

const RING_R = 16
const RING_C = 2 * Math.PI * RING_R

/**
 * Hard timer: compact ring around mm:ss (header) or optional line strip.
 */
export function InterviewHardTimer({
  deadlineAt,
  timeoutMs,
  onExpire,
  variant = 'ring',
  className = '',
}: InterviewHardTimerProps) {
  const lineRef = useRef<HTMLDivElement>(null)
  const expiredRef = useRef(false)
  const [left, setLeft] = useState(() => hardTimerRemainingMs(deadlineAt))
  const total = Math.max(1, timeoutMs)

  useEffect(() => {
    expiredRef.current = false
    if (variant === 'line' && lineRef.current) {
      const rem = hardTimerRemainingMs(deadlineAt)
      lineRef.current.style.setProperty('--hard-timeout-ms', `${rem || timeoutMs}ms`)
    }
  }, [deadlineAt, timeoutMs, variant])

  useEffect(() => {
    const tick = () => {
      const rem = hardTimerRemainingMs(deadlineAt)
      setLeft(rem)
      if (rem <= 0 && !expiredRef.current) {
        expiredRef.current = true
        onExpire?.()
      }
    }
    tick()
    const id = window.setInterval(tick, 250)
    return () => window.clearInterval(id)
  }, [deadlineAt, onExpire])

  const progress = Math.min(1, Math.max(0, left / total))
  const dashOffset = RING_C * (1 - progress)
  const label = formatHardTimerMmSs(left)

  if (variant === 'line') {
    return (
      <div
        className={['theme-interview-hard-timer', 'theme-interview-hard-timer--line', className]
          .filter(Boolean)
          .join(' ')}
        role="timer"
        aria-live="polite"
        aria-atomic="true"
        aria-label={`Time remaining ${label}`}
      >
        <span className="type-label mb-0 theme-interview-hard-timer__digits">{label}</span>
        <div
          ref={lineRef}
          className="theme-interview-hard-timer__line"
          role="presentation"
          aria-hidden
        >
          <div className="theme-interview-hard-timer__line-fill" />
        </div>
      </div>
    )
  }

  return (
    <div
      className={['theme-interview-hard-timer', 'theme-interview-hard-timer--ring', className]
        .filter(Boolean)
        .join(' ')}
      role="timer"
      aria-live="polite"
      aria-atomic="true"
      aria-label={`Time remaining ${label}`}
    >
      <svg
        className="theme-interview-hard-timer__ring-svg"
        viewBox="0 0 40 40"
        width="40"
        height="40"
        aria-hidden
      >
        <circle
          className="theme-interview-hard-timer__ring-track"
          cx="20"
          cy="20"
          r={RING_R}
          fill="none"
        />
        <circle
          className="theme-interview-hard-timer__ring-fill"
          cx="20"
          cy="20"
          r={RING_R}
          fill="none"
          strokeDasharray={RING_C}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 20 20)"
        />
      </svg>
      <span className="type-caption mb-0 theme-interview-hard-timer__digits theme-interview-hard-timer__digits--ring">
        {label}
      </span>
    </div>
  )
}

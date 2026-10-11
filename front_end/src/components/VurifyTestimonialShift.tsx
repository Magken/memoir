import { useEffect, useRef, useState, type ReactNode } from 'react'
import { StarIcon } from '@hugeicons/core-free-icons'
import { VurifyIcon } from './VurifyIcon'
import {
  VURIFY_TESTIMONIALS,
  type VurifyTestimonial,
} from '../lib/testimonials/vurifyTestimonials'

type SwapPhase = 'idle' | 'out' | 'in'
type SwapDirection = 'forward' | 'back'

type VurifyTestimonialShiftProps = {
  items?: readonly VurifyTestimonial[]
  /** Fixed lead beside the portrait (e.g. scene title). */
  lead?: ReactNode
  intervalMs?: number
  reducedMotion?: boolean
  className?: string
  label?: string
}

const SHIFT_ANIM_MS = 520
const DEFAULT_INTERVAL_MS = 4200

/**
 * Snug For-style band: lead | portrait on one row, review copy below.
 * Auto L/R out→swap→in on the review panel — not user-navigable.
 */
export function VurifyTestimonialShift({
  items = VURIFY_TESTIMONIALS,
  lead,
  intervalMs = DEFAULT_INTERVAL_MS,
  reducedMotion = false,
  className = '',
  label = 'What people say about Vurify',
}: VurifyTestimonialShiftProps) {
  const [index, setIndex] = useState(0)
  const [displayed, setDisplayed] = useState<VurifyTestimonial | null>(items[0] ?? null)
  const [phase, setPhase] = useState<SwapPhase>('idle')
  const [direction, setDirection] = useState<SwapDirection>('forward')
  const exitTimerRef = useRef<number | null>(null)
  const enterTimerRef = useRef<number | null>(null)
  const dwellTimerRef = useRef<number | null>(null)
  const indexRef = useRef(0)
  const itemsRef = useRef(items)

  itemsRef.current = items
  indexRef.current = index

  useEffect(() => {
    if (!items.length) {
      setDisplayed(null)
      return
    }
    if (reducedMotion) {
      setDisplayed(items[index] ?? items[0]!)
      setPhase('idle')
    }
  }, [index, items, reducedMotion])

  useEffect(() => {
    if (items.length < 2 || reducedMotion) return

    const clearAll = () => {
      if (exitTimerRef.current !== null) {
        window.clearTimeout(exitTimerRef.current)
        exitTimerRef.current = null
      }
      if (enterTimerRef.current !== null) {
        window.clearTimeout(enterTimerRef.current)
        enterTimerRef.current = null
      }
      if (dwellTimerRef.current !== null) {
        window.clearTimeout(dwellTimerRef.current)
        dwellTimerRef.current = null
      }
    }

    const advance = () => {
      const list = itemsRef.current
      if (list.length < 2) return

      const from = indexRef.current
      const to = (from + 1) % list.length
      const nextDir: SwapDirection =
        to > from || (from === list.length - 1 && to === 0) ? 'forward' : 'back'

      setDirection(nextDir)
      setPhase('out')
      exitTimerRef.current = window.setTimeout(() => {
        setIndex(to)
        setDisplayed(list[to]!)
        setPhase('in')
        exitTimerRef.current = null
        enterTimerRef.current = window.setTimeout(() => {
          setPhase('idle')
          enterTimerRef.current = null
          dwellTimerRef.current = window.setTimeout(advance, intervalMs)
        }, SHIFT_ANIM_MS)
      }, SHIFT_ANIM_MS)
    }

    dwellTimerRef.current = window.setTimeout(advance, intervalMs)
    return clearAll
  }, [intervalMs, items.length, reducedMotion])

  if (!displayed) return null

  const { quote, name, role, rating, image } = displayed

  return (
    <div
      className={['theme-vurify-testimonial-shift', className].filter(Boolean).join(' ')}
      data-phase={phase}
      data-direction={direction}
      data-has-lead={lead ? 'true' : 'false'}
      aria-roledescription="carousel"
      aria-label={label}
      aria-live="polite"
    >
      <div className="theme-vurify-testimonial-shift__top">
        {lead ? <div className="theme-vurify-testimonial-shift__lead">{lead}</div> : null}
        <div className="theme-vurify-testimonial-shift__media-clip">
          <div
            key={`${displayed.id}-media`}
            className="theme-vurify-testimonial-shift__panel theme-vurify-testimonial-shift__panel--media"
          >
            <div className="theme-vurify-testimonial-card__media">
              <img
                className="theme-vurify-testimonial-card__image"
                src={image.src}
                alt={image.alt}
                loading="lazy"
                draggable={false}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="theme-vurify-testimonial-shift__copy-clip">
        <div className="theme-vurify-testimonial-shift__copy-sizer" aria-hidden>
          {items.map((item) => (
            <div key={`${item.id}-sizer`} className="theme-vurify-testimonial-card__body">
              <div className="theme-vurify-testimonial-card__stars">
                {Array.from({ length: 5 }, (_, starIndex) => (
                  <VurifyIcon
                    key={starIndex}
                    iconNode={StarIcon}
                    variant="plain"
                    tone="muted"
                    size="sm"
                    className="theme-vurify-testimonial-card__star"
                  />
                ))}
              </div>
              <p className="theme-vurify-testimonial-card__quote type-body">{item.quote}</p>
              <footer className="theme-vurify-testimonial-card__meta">
                <p className="theme-vurify-testimonial-card__name type-body-sm">{item.name}</p>
                <p className="theme-vurify-testimonial-card__role type-caption type-muted">
                  {item.role}
                </p>
              </footer>
            </div>
          ))}
        </div>
        <div
          key={`${displayed.id}-copy`}
          className="theme-vurify-testimonial-shift__panel theme-vurify-testimonial-shift__panel--copy"
        >
          <div className="theme-vurify-testimonial-card__body">
            <div className="theme-vurify-testimonial-card__stars" aria-hidden>
              {Array.from({ length: 5 }, (_, starIndex) => {
                const filled = starIndex < rating
                return (
                  <VurifyIcon
                    key={starIndex}
                    iconNode={StarIcon}
                    variant="plain"
                    tone={filled ? 'complement' : 'muted'}
                    size="sm"
                    className={
                      filled
                        ? 'theme-vurify-testimonial-card__star theme-vurify-testimonial-card__star--filled'
                        : 'theme-vurify-testimonial-card__star'
                    }
                  />
                )
              })}
            </div>
            <p className="theme-vurify-testimonial-card__quote type-body">{quote}</p>
            <footer className="theme-vurify-testimonial-card__meta">
              <p className="theme-vurify-testimonial-card__name type-body-sm">{name}</p>
              <p className="theme-vurify-testimonial-card__role type-caption type-muted">{role}</p>
            </footer>
          </div>
        </div>
      </div>
    </div>
  )
}

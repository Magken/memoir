import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { X } from 'lucide-react'
import { gsap, useGSAP, useGsapPageOptional, createDefaultGsapPageTiming } from '../lib/gsap'
import { IconButton } from './IconButton'

type ScaleCoverModalProps = {
  /** Controls open state — drives a reversible GSAP timeline. */
  open: boolean
  onClose: () => void
  /** Page / host content that scales down while the cover rises. */
  children: ReactNode
  /** Modal body inside the rising cover. */
  panel: ReactNode
  /** Cover header title. */
  title?: string
  /** Hide default title + close chrome when the panel owns its own header. */
  hideChrome?: boolean
  /** Scale applied to the stage when open (1 = no shrink). Default `0.9`. */
  stageScale?: number
  /**
   * Tween the stage into a uniform rounded card (Sign up / Theme demo).
   * Off: scale only — keep the host page contour (interview dashboard card).
   */
  roundStage?: boolean
  /** After the close reverse finishes (not on first mount reverse). */
  onExitComplete?: () => void
  className?: string
  debug?: boolean
}

/**
 * Full-viewport Verify modal shell: page stage scales down, cover panel rises to fill the
 * screen (menu-adjacent “scale cover”). High stacking context; Escape / X closes.
 */
export function ScaleCoverModal({
  open,
  onClose,
  children,
  panel,
  title = 'Modal',
  hideChrome = false,
  stageScale = 0.9,
  roundStage = true,
  onExitComplete,
  className = '',
  debug = false,
}: ScaleCoverModalProps) {
  const titleId = useId()
  const shellRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const coverRef = useRef<HTMLDivElement>(null)
  const timelineRef = useRef<ReturnType<typeof gsap.timeline> | null>(null)
  const onExitCompleteRef = useRef(onExitComplete)
  const openedOnceRef = useRef(false)
  const openRef = useRef(open)
  /** Keep open CSS (interview Verify `data-open`) until GSAP reverse finishes. */
  const [heldOpen, setHeldOpen] = useState(false)
  const layoutOpen = open || heldOpen
  const page = useGsapPageOptional()
  const timing = page?.timing ?? createDefaultGsapPageTiming()
  const reducedMotion = page?.reducedMotion ?? false

  openRef.current = open
  onExitCompleteRef.current = onExitComplete

  useGSAP(
    () => {
      const stage = stageRef.current
      const cover = coverRef.current
      if (!stage || !cover) return

      const duration = reducedMotion ? timing.duration.instant : timing.duration.page
      const timeline = gsap
        .timeline({
          paused: true,
          defaults: { duration, ease: timing.ease.default },
        })
        .fromTo(
          stage,
          roundStage ? { scale: 1, borderRadius: 0 } : { scale: 1 },
          roundStage
            ? {
                scale: stageScale,
                borderRadius: '1.25rem',
                transformOrigin: '50% 50%',
              }
            : {
                scale: stageScale,
                transformOrigin: '50% 50%',
              },
          0,
        )
        .fromTo(
          cover,
          { yPercent: 100, autoAlpha: 1 },
          { yPercent: 0, autoAlpha: 1 },
          0.05,
        )

      /* Parked: hide the off-stage sheet. Motion itself stays fully opaque (Sign up / pin-stack). */
      gsap.set(cover, { yPercent: 100, autoAlpha: 0 })
      /* Resting scale(1) still creates a containing block and kills descendant sticky. */
      const clearStageTransform = () => {
        gsap.set(stage, { clearProps: 'transform,borderRadius' })
      }
      const parkCover = () => {
        gsap.set(cover, { autoAlpha: 0 })
      }
      timeline.eventCallback('onReverseComplete', () => {
        parkCover()
        clearStageTransform()
        if (!openedOnceRef.current) return
        openedOnceRef.current = false
        if (openRef.current) return
        setHeldOpen(false)
        onExitCompleteRef.current?.()
      })
      clearStageTransform()
      timelineRef.current = timeline

      return () => {
        timelineRef.current = null
      }
    },
    {
      scope: shellRef,
      dependencies: [
        reducedMotion,
        timing.duration.instant,
        timing.duration.page,
        timing.ease.default,
        stageScale,
        roundStage,
      ],
    },
  )

  useEffect(() => {
    const timeline = timelineRef.current
    if (!timeline) return
    if (open) {
      setHeldOpen(true)
      openedOnceRef.current = true
      timeline.play()
    } else {
      timeline.reverse()
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  useEffect(() => {
    if (debug) {
      console.debug('[ScaleCoverModal]', { open, stageScale, title })
    }
  }, [debug, open, stageScale, title])

  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  return (
    <div
      ref={shellRef}
      className={[
        'theme-scale-cover-modal',
        layoutOpen ? 'theme-scale-cover-modal--open' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      data-open={layoutOpen ? 'true' : 'false'}
    >
      <div ref={stageRef} className="theme-scale-cover-modal__stage">
        {children}
      </div>

      <div
        ref={coverRef}
        className="theme-scale-cover-modal__cover"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-hidden={open ? undefined : true}
        inert={!open}
      >
        <header className="theme-scale-cover-modal__header">
          {hideChrome ? (
            <span id={titleId} className="sr-only">
              {title}
            </span>
          ) : (
            <>
              <h2 id={titleId} className="theme-scale-cover-modal__title type-h3">
                {title}
              </h2>
              <IconButton
                icon={X}
                aria-label="Close"
                size="sm"
                variant="ghost"
                onClick={handleClose}
              />
            </>
          )}
        </header>
        <div className="theme-scale-cover-modal__body">{layoutOpen ? panel : null}</div>
      </div>
    </div>
  )
}

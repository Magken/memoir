import {
  useEffect,
  useRef,
  type ReactNode,
  type RefObject,
} from 'react'
import { gsap, ScrollTrigger } from '../lib/gsap'
import { useVisualActivity } from '../hooks/useVisualActivity'

type PointerFollowDeckProps = {
  children: ReactNode
  className?: string
  /** `cover` fills the host · `contain` keeps illustration aspect. */
  fit?: 'cover' | 'contain'
  /**
   * Scroll-scrubbed deck wobble (all pointer types) — expertise timeline.
   * Fine pointer still overrides while hovered; leave resumes scroll pose.
   */
  autoPivot?: boolean
  /**
   * Continuous idle orbit when not pointer-driving (menu/footer).
   * Ignored while `autoPivot` scroll is active in-range, unless pointer left.
   */
  idleWobble?: boolean
  /**
   * Closed peels still fill the viewport — pass false so idle orbit stops.
   * Off-screen / hidden-tab pause is automatic.
   */
  motionEnabled?: boolean
  /** ThemeScroll / page viewport for ScrollTrigger (`autoPivot`). */
  scrollerRef?: RefObject<HTMLElement | null>
  /** Bounds for pointer + scroll pivot — defaults to this deck root. */
  triggerRef?: RefObject<HTMLElement | null>
  reducedMotion?: boolean
  /** Decorative media — hide from AT. */
  decorative?: boolean
  /**
   * Floating art only — no ghost/mid plates, no drop-shadow.
   * Scene 02 résumé illustrations.
   */
  plain?: boolean
}

const FOLLOW_MOVE_DURATION = 0.22
const FOLLOW_REST_DURATION = 0.55

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function prefersFineHover() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches
  )
}

function applyFollowVars(el: HTMLElement, x: number, y: number) {
  el.style.setProperty('--iso-follow-x', x.toFixed(3))
  el.style.setProperty('--iso-follow-y', y.toFixed(3))
}

function scrollPivotFromProgress(progress: number) {
  return {
    x: Math.sin(progress * Math.PI * 2.15) * 0.95,
    y: Math.cos(progress * Math.PI * 1.7) * 0.72,
  }
}

/**
 * Soft 3D floating illustration — pointer follow, optional idle wobble, optional scroll pivot.
 * Timeline: `autoPivot` anchors to scroll on PC + mobile; hover overrides, leave resumes scroll.
 * Menu: `idleWobble` keeps motion when the cursor is away.
 */
export function PointerFollowDeck({
  children,
  className = '',
  fit = 'contain',
  autoPivot = false,
  idleWobble = false,
  motionEnabled = true,
  scrollerRef,
  triggerRef,
  reducedMotion = false,
  decorative = false,
  plain = false,
}: PointerFollowDeckProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const current = useRef({ x: 0, y: 0 })
  const scrollPose = useRef({ x: 0, y: 0, active: false })
  const pointerActive = useRef(false)
  const tweenRef = useRef<gsap.core.Tween | null>(null)
  const idleTlRef = useRef<gsap.core.Timeline | null>(null)
  const resumeIdleRef = useRef<() => void>(() => {})
  const visuallyActive = useVisualActivity(rootRef, {
    enabled: motionEnabled,
    rootRef: scrollerRef,
  })
  const motionLive = motionEnabled && visuallyActive
  const motionLiveRef = useRef(motionLive)
  motionLiveRef.current = motionLive

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const motionOff = reducedMotion || prefersReducedMotion()
    if (motionOff) {
      applyFollowVars(root, 0, 0)
      return
    }

    const paintFollow = () => {
      applyFollowVars(root, current.current.x, current.current.y)
    }

    const killMotion = () => {
      tweenRef.current?.kill()
      tweenRef.current = null
      idleTlRef.current?.kill()
      idleTlRef.current = null
    }

    const tweenFollowTo = (x: number, y: number, duration: number) => {
      killMotion()

      if (duration <= 0) {
        current.current.x = x
        current.current.y = y
        paintFollow()
        return
      }

      tweenRef.current = gsap.to(current.current, {
        x,
        y,
        duration,
        ease: 'power3.out',
        onUpdate: paintFollow,
        onComplete: () => {
          current.current.x = x
          current.current.y = y
          paintFollow()
          tweenRef.current = null
        },
      })
    }

    const startIdleWobble = () => {
      if (!idleWobble || pointerActive.current) return
      if (!motionLiveRef.current) return
      if (autoPivot && scrollPose.current.active) return

      killMotion()
      const tl = gsap.timeline({
        repeat: -1,
        defaults: { ease: 'sine.inOut', onUpdate: paintFollow },
      })
      tl.to(current.current, { x: 0.62, y: -0.42, duration: 2.15 })
        .to(current.current, { x: -0.52, y: 0.38, duration: 2.45 })
        .to(current.current, { x: 0.3, y: 0.24, duration: 2.05 })
        .to(current.current, { x: -0.22, y: -0.34, duration: 2.25 })
      idleTlRef.current = tl
    }

    resumeIdleRef.current = () => {
      if (!idleWobble || pointerActive.current) return
      if (!motionLiveRef.current) return
      if (autoPivot && scrollPose.current.active) return
      if (idleTlRef.current) {
        idleTlRef.current.play()
        return
      }
      startIdleWobble()
    }

    const applyNonPointerPose = (duration = FOLLOW_REST_DURATION) => {
      if (pointerActive.current) return
      if (autoPivot && scrollPose.current.active) {
        tweenFollowTo(scrollPose.current.x, scrollPose.current.y, duration)
        return
      }
      if (idleWobble) {
        startIdleWobble()
        return
      }
      tweenFollowTo(0, 0, duration)
    }

    const followPointer = (clientX: number, clientY: number) => {
      const bounds = (triggerRef?.current ?? root).getBoundingClientRect()
      if (bounds.width <= 0 || bounds.height <= 0) return
      const x = ((clientX - bounds.left) / bounds.width) * 2 - 1
      const y = ((clientY - bounds.top) / bounds.height) * 2 - 1
      tweenFollowTo(
        Math.max(-1, Math.min(1, x)),
        Math.max(-1, Math.min(1, -y)),
        FOLLOW_MOVE_DURATION,
      )
    }

    const fineHover = prefersFineHover()
    const triggers: ScrollTrigger[] = []
    let cancelled = false
    let frameId = 0
    let attempts = 0

    const onPointerEnter = () => {
      pointerActive.current = true
      killMotion()
    }

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return
      if (!pointerActive.current) pointerActive.current = true
      followPointer(event.clientX, event.clientY)
    }

    const onPointerLeave = () => {
      pointerActive.current = false
      applyNonPointerPose()
    }

    if (fineHover) {
      const hit = triggerRef?.current ?? root
      hit.addEventListener('pointerenter', onPointerEnter)
      hit.addEventListener('pointermove', onPointerMove)
      hit.addEventListener('pointerleave', onPointerLeave)
    }

    const bindPivot = () => {
      if (cancelled) return
      if (!autoPivot) {
        applyNonPointerPose(0)
        return
      }

      const scroller = scrollerRef?.current
      const trigger = triggerRef?.current ?? root
      if (!scroller) {
        attempts += 1
        if (attempts < 48) {
          frameId = requestAnimationFrame(bindPivot)
        } else if (idleWobble) {
          startIdleWobble()
        }
        return
      }

      triggers.push(
        ScrollTrigger.create({
          scroller,
          trigger,
          start: 'top 88%',
          end: 'bottom 18%',
          scrub: 0.55,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const next = scrollPivotFromProgress(self.progress)
            scrollPose.current = { ...next, active: true }
            if (pointerActive.current) return
            if (idleTlRef.current || tweenRef.current) killMotion()
            current.current.x = next.x
            current.current.y = next.y
            paintFollow()
          },
          onLeave: () => {
            scrollPose.current.active = false
            if (!pointerActive.current) {
              if (idleWobble) startIdleWobble()
              else tweenFollowTo(0, 0, FOLLOW_REST_DURATION)
            }
          },
          onLeaveBack: () => {
            scrollPose.current.active = false
            if (!pointerActive.current) {
              if (idleWobble) startIdleWobble()
              else tweenFollowTo(0, 0, FOLLOW_REST_DURATION)
            }
          },
        }),
      )
      ScrollTrigger.refresh()
      if (!pointerActive.current && !scrollPose.current.active && idleWobble) {
        startIdleWobble()
      }
    }

    frameId = requestAnimationFrame(bindPivot)

    return () => {
      cancelled = true
      if (frameId) cancelAnimationFrame(frameId)
      triggers.forEach((t) => t.kill())
      if (fineHover) {
        const hit = triggerRef?.current ?? root
        hit.removeEventListener('pointerenter', onPointerEnter)
        hit.removeEventListener('pointermove', onPointerMove)
        hit.removeEventListener('pointerleave', onPointerLeave)
      }
      killMotion()
      pointerActive.current = false
      scrollPose.current = { x: 0, y: 0, active: false }
      applyFollowVars(root, 0, 0)
    }
  }, [autoPivot, idleWobble, reducedMotion, scrollerRef, triggerRef])

  useEffect(() => {
    if (!motionLive) {
      idleTlRef.current?.pause()
      tweenRef.current?.pause()
      return
    }
    tweenRef.current?.play()
    resumeIdleRef.current()
  }, [motionLive])

  return (
    <div
      ref={rootRef}
      className={['theme-pointer-follow-deck', className].filter(Boolean).join(' ')}
      data-fit={fit}
      data-auto-pivot={autoPivot ? 'true' : undefined}
      data-idle-wobble={idleWobble ? 'true' : undefined}
      data-plain={plain ? 'true' : undefined}
      aria-hidden={decorative ? true : undefined}
    >
      <div className="theme-pointer-follow-deck__deck">
        <div className="theme-pointer-follow-deck__card theme-pointer-follow-deck__card--ghost" aria-hidden />
        <div className="theme-pointer-follow-deck__card theme-pointer-follow-deck__card--mid" aria-hidden />
        <div className="theme-pointer-follow-deck__card theme-pointer-follow-deck__card--front">
          {children}
        </div>
      </div>
    </div>
  )
}

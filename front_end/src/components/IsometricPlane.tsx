import { useRef, type CSSProperties, type ReactNode } from 'react'
import { gsap, useGSAP } from '../lib/gsap'
import {
  ISOMETRIC_PLANE_ANIMATE_DEFAULTS,
  ISOMETRIC_PLANE_HOVER_FROM,
  isometricPlaneCanAnimateOnHover,
  isometricPlaneCanAnimateToIso,
  isometricPlaneCssVars,
  isometricPlaneFlatCssVars,
  isometricPlaneOrientation,
  type IsometricPlaneAnchor,
  type IsometricPlaneOrientationId,
} from '../lib/isometrics/isometricPlanes'

export type IsometricPlaneProps = {
  /** Registry id — target viewpoint (`animateOnHover` rest is `animateFrom`) */
  orientation: IsometricPlaneOrientationId
  children: ReactNode
  className?: string
  /** Override default seam anchor from registry */
  anchor?: IsometricPlaneAnchor
  style?: CSSProperties
  /** Animate CSS vars from flat screen → target viewpoint on mount */
  animateToIso?: boolean
  /** Animate `animateFrom` → `orientation` on pointer enter (default from: wall-front) */
  animateOnHover?: boolean
  /** Hover rest pose — default `wall-front` */
  animateFrom?: IsometricPlaneOrientationId
  /** Seconds — `animateToIso` */
  animateToIsoDuration?: number
  /** Seconds — `animateOnHover` */
  animateOnHoverDuration?: number
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function tweenPlaneVars(
  el: HTMLElement,
  vars: Record<string, string | number>,
  duration: number,
  ease: string,
) {
  return gsap.to(el, { ...vars, duration, ease, overwrite: true })
}

/** Simple div plane — apply any `Card` or element inside; orientations from `isometricPlanes.ts`. */
export function IsometricPlane({
  orientation,
  children,
  className = '',
  anchor,
  style,
  animateToIso = false,
  animateOnHover = false,
  animateFrom = ISOMETRIC_PLANE_HOVER_FROM,
  animateToIsoDuration = ISOMETRIC_PLANE_ANIMATE_DEFAULTS.duration,
  animateOnHoverDuration = ISOMETRIC_PLANE_ANIMATE_DEFAULTS.hoverDuration,
}: IsometricPlaneProps) {
  const hitRef = useRef<HTMLDivElement>(null)
  const planeRef = useRef<HTMLDivElement>(null)
  const targetPlane = isometricPlaneOrientation(orientation)
  const fromPlane = isometricPlaneOrientation(animateFrom)
  const targetVars = isometricPlaneCssVars(targetPlane)
  const fromVars = isometricPlaneCssVars(fromPlane)
  const flatVars = isometricPlaneFlatCssVars()

  const shouldEnterAnimate = animateToIso && !animateOnHover && isometricPlaneCanAnimateToIso(orientation)
  const shouldHoverAnimate =
    animateOnHover && isometricPlaneCanAnimateOnHover(orientation, animateFrom)

  const restAnchor = shouldHoverAnimate ? fromPlane.anchor : (anchor ?? targetPlane.anchor)
  const targetAnchor = anchor ?? targetPlane.anchor

  useGSAP(
    () => {
      const el = planeRef.current
      if (!el || !shouldEnterAnimate) return undefined

      if (prefersReducedMotion()) {
        gsap.set(el, targetVars)
        return undefined
      }

      gsap.set(el, flatVars)
      return tweenPlaneVars(el, targetVars, animateToIsoDuration, ISOMETRIC_PLANE_ANIMATE_DEFAULTS.ease)
    },
    {
      scope: planeRef,
      dependencies: [shouldEnterAnimate, orientation, animateToIsoDuration],
      revertOnUpdate: true,
    },
  )

  useGSAP(
    () => {
      const plane = planeRef.current
      const hit = hitRef.current
      if (!plane || !hit || !shouldHoverAnimate) return undefined

      const reduced = prefersReducedMotion()
      gsap.set(plane, fromVars)

      let hovering = false

      const onEnter = () => {
        if (hovering) return
        hovering = true
        hit.dataset.isoHover = 'true'
        if (reduced) {
          gsap.set(plane, targetVars)
          plane.dataset.isoAnchor = targetAnchor
          return
        }
        plane.dataset.isoAnchor = targetAnchor
        tweenPlaneVars(plane, targetVars, animateOnHoverDuration, ISOMETRIC_PLANE_ANIMATE_DEFAULTS.hoverEase)
      }

      const onLeave = () => {
        if (!hovering) return
        hovering = false
        hit.dataset.isoHover = 'false'
        if (reduced) {
          gsap.set(plane, fromVars)
          plane.dataset.isoAnchor = restAnchor
          return
        }
        plane.dataset.isoAnchor = restAnchor
        tweenPlaneVars(plane, fromVars, animateOnHoverDuration, ISOMETRIC_PLANE_ANIMATE_DEFAULTS.hoverEase)
      }

      hit.addEventListener('pointerenter', onEnter)
      hit.addEventListener('pointerleave', onLeave)

      return () => {
        hit.removeEventListener('pointerenter', onEnter)
        hit.removeEventListener('pointerleave', onLeave)
      }
    },
    {
      scope: hitRef,
      dependencies: [
        shouldHoverAnimate,
        orientation,
        animateFrom,
        animateOnHoverDuration,
        restAnchor,
        targetAnchor,
      ],
      revertOnUpdate: true,
    },
  )

  const initialStyle = shouldEnterAnimate
    ? { ...flatVars, ...style }
    : shouldHoverAnimate
      ? { ...fromVars, ...style }
      : { ...targetVars, ...style }

  const planeNode = (
    <div
      ref={planeRef}
      className={[
        'theme-isometric-plane',
        `theme-isometric-plane--${orientation}`,
        shouldEnterAnimate ? 'theme-isometric-plane--animate-iso' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      data-iso-plane={orientation}
      data-iso-anchor={shouldHoverAnimate ? restAnchor : targetAnchor}
      data-iso-animate={shouldEnterAnimate || shouldHoverAnimate ? 'true' : undefined}
      style={initialStyle}
    >
      {children}
    </div>
  )

  if (shouldHoverAnimate) {
    return (
      <div
        ref={hitRef}
        className="theme-isometric-plane-hit"
        data-iso-hover="false"
        aria-label={`Hover to view ${targetPlane.label} orientation`}
      >
        {planeNode}
      </div>
    )
  }

  return planeNode
}

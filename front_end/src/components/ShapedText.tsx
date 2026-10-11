import { useRef } from 'react'
import { gsap, useGSAP } from '../lib/gsap'
import {
  resolveShapedTextLayout,
  shapedTextDisplayUnits,
  shapedTextFontFromElement,
  shapedTextMeasureWidths,
  shapedTextSlideFrom,
  shapedTextStaggerFrom,
  SHAPED_TEXT_EASE_IN,
  SHAPED_TEXT_EASE_OUT,
  SHAPED_TEXT_IN_DURATION,
  SHAPED_TEXT_OUT_DURATION,
  SHAPED_TEXT_SLIDE_PX,
  SHAPED_TEXT_STAGGER_IN,
  SHAPED_TEXT_STAGGER_OUT,
  type ShapedTextLayout,
  type ShapedTextLayoutResult,
  type ShapedTextMotion,
  type ShapedTextPoint,
  type ShapedTextTrigger,
} from '../lib/animations/shapedText'

type ShapedTextProps = {
  children: string
  layout: ShapedTextLayout
  trigger?: ShapedTextTrigger
  motion?: ShapedTextMotion
  size?: 'sm' | 'md' | 'lg'
  label?: string
  className?: string
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function applyCharPoint(element: HTMLElement, point: ShapedTextPoint, opacity = 1) {
  gsap.set(element, {
    x: point.x,
    y: point.y,
    rotation: point.rotation,
    scale: point.scale ?? 1,
    xPercent: -50,
    yPercent: -50,
    opacity,
  })
}

function nextPoint(points: ShapedTextPoint[], index: number): ShapedTextPoint {
  return points[Math.min(index + 1, points.length - 1)] ?? points[index]
}

function fromState(
  motion: ShapedTextMotion,
  flat: ShapedTextPoint,
  shaped: ShapedTextPoint,
  next: ShapedTextPoint,
) {
  if (motion === 'expand') {
    return {
      x: shaped.x,
      y: shaped.y,
      rotation: shaped.rotation,
      scale: 0.35,
      opacity: 0,
    }
  }

  if (motion === 'scatter') {
    return {
      x: flat.x + (flat.x - shaped.x) * 0.12,
      y: flat.y + 10,
      rotation: flat.rotation - 8,
      scale: 0.55,
      opacity: 0,
    }
  }

  const slide = shapedTextSlideFrom(shaped, next, SHAPED_TEXT_SLIDE_PX)
  return {
    x: slide.x,
    y: slide.y,
    rotation: slide.rotation,
    scale: 0.94,
    opacity: 0,
  }
}

function isInteractionActive(root: HTMLElement): boolean {
  return root.matches(':hover') || root.contains(document.activeElement)
}

export function ShapedText({
  children,
  layout,
  trigger = 'hover',
  motion = 'rise',
  size = 'md',
  label,
  className = '',
}: ShapedTextProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const units = shapedTextDisplayUnits(children)
  const caption = label ?? (trigger === 'hover' ? 'Hover to shape in' : 'Shapes in on load')

  useGSAP(
    () => {
      const root = rootRef.current
      const stage = stageRef.current
      if (!root || !stage) return undefined

      const chars = [...stage.querySelectorAll<HTMLElement>('.theme-shaped-text__char')]
      if (chars.length === 0) return undefined

      let active: gsap.core.Timeline | null = null
      const staggerFrom = shapedTextStaggerFrom(layout)

      const stopAll = () => {
        active?.kill()
        active = null
        gsap.killTweensOf(chars)
      }

      const measure = (): ShapedTextLayoutResult => {
        const width = Math.max(stage.clientWidth, 1)
        const height = Math.max(stage.clientHeight, 1)
        const font = shapedTextFontFromElement(chars[0])
        const fontSize = parseFloat(getComputedStyle(chars[0]).fontSize) || 16
        const measured = shapedTextMeasureWidths(units, font)
        const charWidths = chars.map((char, index) => Math.max(char.offsetWidth, measured[index] ?? 0))
        return resolveShapedTextLayout(charWidths, layout, width, height, fontSize)
      }

      const settleRest = () => {
        stopAll()
        const { flat } = measure()
        chars.forEach((char, index) => {
          applyCharPoint(char, flat[index] ?? flat[0], trigger === 'enter' ? 1 : 0.5)
        })
      }

      const settleShaped = () => {
        stopAll()
        const { shaped } = measure()
        chars.forEach((char, index) => {
          applyCharPoint(char, shaped[index] ?? shaped[0], 1)
        })
      }

      const playIn = () => {
        stopAll()
        const { flat, shaped } = measure()

        chars.forEach((char, index) => {
          const target = shaped[index] ?? shaped[0]
          const rest = flat[index] ?? flat[0]
          const next = nextPoint(shaped, index)
          gsap.set(char, {
            ...fromState(motion, rest, target, next),
            xPercent: -50,
            yPercent: -50,
          })
        })

        active = gsap.timeline({
          defaults: { ease: SHAPED_TEXT_EASE_IN, duration: SHAPED_TEXT_IN_DURATION },
          onComplete: () => {
            active = null
            settleShaped()
          },
        })

        active.to(
          chars,
          {
            x: (index) => shaped[index]?.x ?? 0,
            y: (index) => shaped[index]?.y ?? 0,
            rotation: (index) => shaped[index]?.rotation ?? 0,
            scale: 1,
            opacity: 1,
            stagger: { each: SHAPED_TEXT_STAGGER_IN, from: staggerFrom },
            xPercent: -50,
            yPercent: -50,
          },
          0,
        )
      }

      const playOut = () => {
        stopAll()
        const { flat, shaped, scatter } = measure()

        active = gsap.timeline({
          defaults: { ease: SHAPED_TEXT_EASE_OUT, duration: SHAPED_TEXT_OUT_DURATION },
          onComplete: () => {
            active = null
            settleRest()
          },
        })

        if (motion === 'scatter') {
          active.to(
            chars,
            {
              x: (index) => scatter[index]?.x ?? flat[index]?.x ?? 0,
              y: (index) => scatter[index]?.y ?? flat[index]?.y ?? 0,
              rotation: (index) => scatter[index]?.rotation ?? 0,
              scale: (index) => scatter[index]?.scale ?? 0.8,
              opacity: 0.15,
              stagger: { each: SHAPED_TEXT_STAGGER_OUT, from: 'center' },
              xPercent: -50,
              yPercent: -50,
            },
            0,
          )
          return
        }

        const outTargets =
          motion === 'expand'
            ? shaped.map((point) => ({ ...point, scale: 0.4, opacity: 0 }))
            : flat.map((point, index) => {
                const next = nextPoint(flat, index)
                const slide = shapedTextSlideFrom(point, next, SHAPED_TEXT_SLIDE_PX * 0.65)
                return { ...slide, scale: 0.92, opacity: 0.22 }
              })

        active.to(
          chars,
          {
            x: (index) => outTargets[index]?.x ?? 0,
            y: (index) => outTargets[index]?.y ?? 0,
            rotation: (index) => outTargets[index]?.rotation ?? 0,
            scale: (index) => outTargets[index]?.scale ?? 0.9,
            opacity: (index) => outTargets[index]?.opacity ?? 0.25,
            stagger: { each: SHAPED_TEXT_STAGGER_OUT, from: staggerFrom },
            xPercent: -50,
            yPercent: -50,
          },
          0,
        )
      }

      const onResize = () => {
        if (active?.isActive()) return
        if (root.classList.contains('theme-shaped-text--settled')) {
          settleShaped()
          return
        }
        settleRest()
      }

      const syncInteraction = () => {
        if (trigger !== 'hover') return
        if (isInteractionActive(root)) {
          root.classList.add('theme-shaped-text--settled')
          playIn()
          return
        }
        root.classList.remove('theme-shaped-text--settled')
        settleRest()
      }

      if (prefersReducedMotion()) {
        settleShaped()
        root.classList.add('theme-shaped-text--settled')
        return undefined
      }

      root.classList.remove('theme-shaped-text--settled')
      stopAll()
      settleRest()

      const observer = new ResizeObserver(onResize)
      observer.observe(stage)

      let onEnter: (() => void) | undefined
      let onLeave: (() => void) | undefined

      if (trigger === 'enter') {
        playIn()
        root.classList.add('theme-shaped-text--settled')
      } else {
        onEnter = () => {
          root.classList.add('theme-shaped-text--settled')
          playIn()
        }
        onLeave = () => {
          root.classList.remove('theme-shaped-text--settled')
          playOut()
        }

        root.addEventListener('mouseenter', onEnter)
        root.addEventListener('mouseleave', onLeave)
        root.addEventListener('focusin', onEnter)
        root.addEventListener('focusout', onLeave)

        if (isInteractionActive(root)) {
          requestAnimationFrame(syncInteraction)
        }
      }

      return () => {
        stopAll()
        observer.disconnect()
        root.classList.remove('theme-shaped-text--settled')
        if (onEnter) {
          root.removeEventListener('mouseenter', onEnter)
          root.removeEventListener('focusin', onEnter)
        }
        if (onLeave) {
          root.removeEventListener('mouseleave', onLeave)
          root.removeEventListener('focusout', onLeave)
        }
      }
    },
    { scope: rootRef, dependencies: [children, layout, motion, trigger] },
  )

  const rootClass = [
    'theme-shaped-text',
    `theme-shaped-text--${layout}`,
    `theme-shaped-text--${size}`,
    `theme-shaped-text--motion-${motion}`,
    trigger === 'enter' ? 'theme-shaped-text--enter' : 'theme-shaped-text--hover',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div ref={rootRef} className={rootClass} tabIndex={trigger === 'hover' ? 0 : undefined} aria-label={children}>
      <div className="theme-shaped-text__frame">
        <div ref={stageRef} className="theme-shaped-text__stage" aria-hidden>
          {units.map((unit, index) => (
            <span key={`${unit}-${index}`} className="theme-shaped-text__char">
              {unit}
            </span>
          ))}
        </div>
        <span className="theme-shaped-text__guide theme-shaped-text__guide--path" aria-hidden />
      </div>
      <span className="theme-shaped-text__hint type-caption type-muted">{caption}</span>
    </div>
  )
}

export type { ShapedTextLayout, ShapedTextMotion, ShapedTextTrigger }

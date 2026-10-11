import { useGSAP, gsap, ScrollTrigger } from '../lib/gsap'
import type { RefObject } from 'react'

export type ThemeScrollParallaxLayer = {
  /** Element to shift (ref or selector within scope). */
  target: RefObject<HTMLElement | null> | string
  /** Scroll fraction band — keep 0.04–0.12 for subtle Home feel. */
  speed: number
}

type UseThemeScrollParallaxOptions = {
  scopeRef: RefObject<HTMLElement | null>
  scrollerRef: RefObject<HTMLElement | null>
  layers: ThemeScrollParallaxLayer[]
  /** Trigger for the scrub range (defaults to scope). */
  triggerRef?: RefObject<HTMLElement | null>
  start?: string
  end?: string
  reducedMotion?: boolean
  enabled?: boolean
}

/**
 * Subtle y-parallax scrubbed to a ThemeScroll viewport.
 * Transform-only; skips when reduced motion or disabled.
 */
export function useThemeScrollParallax({
  scopeRef,
  scrollerRef,
  layers,
  triggerRef,
  start = 'top bottom',
  end = 'bottom top',
  reducedMotion = false,
  enabled = true,
}: UseThemeScrollParallaxOptions): void {
  const layerKey = layers.map((l) => `${typeof l.target === 'string' ? l.target : 'ref'}:${l.speed}`).join('|')

  useGSAP(
    () => {
      if (!enabled || reducedMotion || layers.length === 0) return

      let cancelled = false
      let attempts = 0
      let frameId = 0
      const tweens: gsap.core.Tween[] = []

      const bind = () => {
        if (cancelled) return
        const scroller = scrollerRef.current
        const scope = scopeRef.current
        if (!scroller || !scope) {
          attempts += 1
          if (attempts < 16) frameId = requestAnimationFrame(bind)
          return
        }

        const trigger = triggerRef?.current ?? scope

        layers.forEach((layer) => {
          const el =
            typeof layer.target === 'string'
              ? scope.querySelector<HTMLElement>(layer.target)
              : layer.target.current
          if (!el) return

          gsap.set(el, { force3D: true })
          tweens.push(
            gsap.fromTo(
              el,
              { y: () => -layer.speed * 80 },
              {
                y: () => layer.speed * 80,
                ease: 'none',
                force3D: true,
                scrollTrigger: {
                  scroller,
                  trigger,
                  start,
                  end,
                  scrub: 0.45,
                  invalidateOnRefresh: true,
                },
              },
            ),
          )
        })

        ScrollTrigger.refresh()
      }

      frameId = requestAnimationFrame(bind)
      return () => {
        cancelled = true
        cancelAnimationFrame(frameId)
        tweens.forEach((t) => t.scrollTrigger?.kill())
        tweens.forEach((t) => t.kill())
      }
    },
    {
      scope: scopeRef,
      dependencies: [
        scrollerRef,
        layerKey,
        triggerRef,
        start,
        end,
        reducedMotion,
        enabled,
      ],
      revertOnUpdate: true,
    },
  )
}

import { type RefObject } from 'react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { gsap, useGSAP } from '../lib/gsap'
import { isometricLabelSlotProgress } from '../lib/isometrics/isometricEffects'

export type IsometricCssWordsScrubOptions = {
  mouseFollow?: boolean
  scrollFollow?: boolean
  /** Scrub rate through one clip slot — mirrors SVG `labelTranslate`. */
  labelTranslate?: number
  /** Pointer scrub axis — vertical layout uses Y. */
  axis?: 'x' | 'y'
  scrollViewportRef?: RefObject<HTMLElement | null>
  scrollTrackRef?: RefObject<HTMLElement | null>
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function slotDistancePx(scene: HTMLElement): number {
  const sample = scene.querySelector<HTMLElement>('.theme-isometric-css-words__line p')
  return sample?.getBoundingClientRect().height ?? 0
}

export function useIsometricCssWordsScrub(
  sceneRef: RefObject<HTMLElement | null>,
  options: IsometricCssWordsScrubOptions,
) {
  const { mouseFollow = false, scrollFollow = false, labelTranslate = 1, axis = 'x', scrollViewportRef, scrollTrackRef } =
    options

  useGSAP(
    () => {
      const scene = sceneRef.current
      if (!scene || (!mouseFollow && !scrollFollow)) return undefined

      if (prefersReducedMotion()) return undefined

      let cancelled = false
      let teardown: (() => void) | undefined
      let retryCount = 0
      let retryFrameId = 0

      const runSetup = () => {
        if (cancelled) return

        const labels = gsap.utils.toArray<HTMLParagraphElement>(
          '.theme-isometric-css-words__line p',
          scene,
        )
        if (labels.length === 0) {
          if (retryCount < 12) {
            retryCount += 1
            retryFrameId = window.requestAnimationFrame(runSetup)
          }
          return
        }

        const distance = slotDistancePx(scene)
        if (distance <= 0) {
          if (retryCount < 12) {
            retryCount += 1
            retryFrameId = window.requestAnimationFrame(runSetup)
          }
          return
        }

        teardown?.()

        const scrollTriggers: ScrollTrigger[] = []

        gsap.set(labels, { y: 0, force3D: true })

        const applyProgress = (progress: number) => {
          const slot = isometricLabelSlotProgress(progress, labelTranslate)
          gsap.set(labels, { y: -distance * slot, force3D: true })
        }

        const scrubTo = (progress: number) => {
          const slot = isometricLabelSlotProgress(progress, labelTranslate)
          gsap.to(labels, {
            y: -distance * slot,
            duration: 0.35,
            ease: 'power2.out',
            overwrite: true,
            force3D: true,
          })
        }

        applyProgress(0)

        if (mouseFollow) {
          scene.dataset.isometricMouse = 'true'
        }

        const onPointerMove = (event: PointerEvent) => {
          if (!mouseFollow) return
          const progress =
            axis === 'y'
              ? event.clientY / window.innerHeight
              : event.clientX / window.innerWidth
          scrubTo(progress)
        }

        if (mouseFollow) {
          window.addEventListener('pointermove', onPointerMove, { passive: true })
        }

        const setupScrollFollow = () => {
          const viewport = scrollViewportRef?.current
          const track = scrollTrackRef?.current
          if (!viewport || !track) return false

          const scrubTrigger = ScrollTrigger.create({
            scroller: viewport,
            trigger: track,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 0.35,
            invalidateOnRefresh: true,
            onUpdate: (self) => applyProgress(self.progress),
          })
          scrollTriggers.push(scrubTrigger)
          applyProgress(scrubTrigger.progress)
          ScrollTrigger.refresh()
          return true
        }

        if (scrollFollow) {
          if (!setupScrollFollow()) {
            const pageTrigger = ScrollTrigger.create({
              trigger: scene,
              start: 'top 85%',
              end: 'bottom 15%',
              scrub: 1.2,
              invalidateOnRefresh: true,
              onUpdate: (self) => applyProgress(self.progress),
            })
            scrollTriggers.push(pageTrigger)
            applyProgress(pageTrigger.progress)
          }
        }

        teardown = () => {
          delete scene.dataset.isometricMouse
          if (mouseFollow) {
            window.removeEventListener('pointermove', onPointerMove)
          }
          scrollTriggers.forEach((st) => st.kill())
          gsap.set(labels, { clearProps: 'transform' })
        }
      }

      void document.fonts.ready.then(() => {
        retryFrameId = window.requestAnimationFrame(runSetup)
      })

      return () => {
        cancelled = true
        window.cancelAnimationFrame(retryFrameId)
        teardown?.()
        delete scene.dataset.isometricMouse
      }
    },
    {
      scope: sceneRef,
      dependencies: [mouseFollow, scrollFollow, labelTranslate, axis],
      revertOnUpdate: true,
    },
  )
}

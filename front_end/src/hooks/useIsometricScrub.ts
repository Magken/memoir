import { type RefObject } from 'react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { gsap, useGSAP } from '../lib/gsap'
import {
  ISOMETRIC_REST_PROGRESS,
  ISOMETRIC_TEXT_SELECTOR,
  isometricHalfSelector,
  isometricLabelMotionTargets,
  isometricLabelMotionTargetsY,
  isometricLabelSlotProgress,
  isometricSpreadScaleX,
  isometricSpreadScaleY,
  isometricSpreadSkewX,
  isometricSpreadSkewY,
  isometricSpreadXAmplitude,
  isometricSpreadYAmplitude,
  isometricVariantIsStatic,
  isometricVariantUsesHorizontalSeam,
  type ResolvedIsometricEffect,
} from '../lib/isometrics/isometricEffects'

export type IsometricScrubOptions = {
  scrollViewportRef?: RefObject<HTMLElement | null>
  scrollTrackRef?: RefObject<HTMLElement | null>
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function useIsometricScrub(
  sceneRef: RefObject<HTMLElement | null>,
  effect: ResolvedIsometricEffect,
  options?: IsometricScrubOptions,
) {
  useGSAP(
    () => {
      const scene = sceneRef.current
      if (!scene || !effect.enabled) return undefined

      const { variant } = effect
      const horizontalSeam = isometricVariantUsesHorizontalSeam(variant)
      const halves = gsap.utils.toArray<SVGGElement>(isometricHalfSelector(variant), scene)
      const labels = gsap.utils.toArray<SVGTextElement>(ISOMETRIC_TEXT_SELECTOR, scene)

      if (halves.length === 0) return undefined

      if (prefersReducedMotion()) {
        gsap.set([...halves, ...labels], { clearProps: 'transform' })
        return undefined
      }

      const { config, strength, pivotTranslate, labelTranslate, mouseFollow, scrollFollow } = effect
      const isStatic = isometricVariantIsStatic(variant)

      const spreadTl = gsap.timeline({
        paused: true,
        defaults: {
          duration: config.duration,
          yoyo: true,
          ease: config.ease,
        },
      })

      if (horizontalSeam) {
        const spreadY = isometricSpreadYAmplitude(config, pivotTranslate, strength)
        spreadTl.fromTo(
          halves,
          {
            svgOrigin: config.svgOrigin,
            skewX: (index) => isometricSpreadSkewX(index, 'from', config),
            scaleY: (index) => isometricSpreadScaleY(index, 'from', config),
            y: isStatic ? 0 : spreadY,
          },
          {
            skewX: (index) => isometricSpreadSkewX(index, 'to', config),
            scaleY: (index) => isometricSpreadScaleY(index, 'to', config),
            y: isStatic ? 0 : -spreadY,
          },
        )
      } else {
        const spreadX = isometricSpreadXAmplitude(config, pivotTranslate, strength)
        spreadTl.fromTo(
          halves,
          {
            svgOrigin: config.svgOrigin,
            skewY: (index) => isometricSpreadSkewY(index, 'from', config),
            scaleX: (index) => isometricSpreadScaleX(index, 'from', config),
            x: isStatic ? 0 : spreadX,
          },
          {
            skewY: (index) => isometricSpreadSkewY(index, 'to', config),
            scaleX: (index) => isometricSpreadScaleX(index, 'to', config),
            x: isStatic ? 0 : -spreadX,
          },
        )
      }

      const labelsTl = gsap.timeline({ paused: true })
      if (horizontalSeam) {
        const { enterY, restY, enterYPercent, restYPercent } = isometricLabelMotionTargetsY(
          config,
          labelTranslate,
        )
        labels.forEach((label, index) => {
          labelsTl.add(
            gsap.fromTo(
              label,
              { yPercent: enterYPercent, y: enterY },
              {
                duration: 1,
                yPercent: restYPercent,
                y: restY,
                ease: 'sine.inOut',
              },
            ),
            (index % 3) * config.stagger,
          )
        })
      } else {
        const { enterX, restX, enterXPercent, restXPercent } = isometricLabelMotionTargets(
          config,
          labelTranslate,
        )
        labels.forEach((label, index) => {
          labelsTl.add(
            gsap.fromTo(
              label,
              { xPercent: enterXPercent, x: enterX },
              {
                duration: 1,
                xPercent: restXPercent,
                x: restX,
                ease: 'sine.inOut',
              },
            ),
            (index % 3) * config.stagger,
          )
        })
      }

      const timelines = [spreadTl, labelsTl]

      const setAllProgress = (progress: number) => {
        const labelProgress = isometricLabelSlotProgress(progress, labelTranslate)
        spreadTl.pause()
        spreadTl.progress(progress)
        labelsTl.pause()
        labelsTl.progress(labelProgress)
      }

      const scrubTo = (progress: number) => {
        const labelProgress = isometricLabelSlotProgress(progress, labelTranslate)
        spreadTl.pause()
        labelsTl.pause()
        gsap.to(spreadTl, {
          progress,
          duration: config.scrubDuration,
          ease: config.scrubEase,
          overwrite: true,
        })
        gsap.to(labelsTl, {
          progress: labelProgress,
          duration: config.scrubDuration,
          ease: config.scrubEase,
          overwrite: true,
        })
      }

      if (scrollFollow) {
        setAllProgress(0)
      } else {
        setAllProgress(ISOMETRIC_REST_PROGRESS)
      }

      const scrollTriggers: ScrollTrigger[] = []

      const setupScrollFollow = () => {
        const viewport = options?.scrollViewportRef?.current
        const track = options?.scrollTrackRef?.current
        if (!viewport || !track) return false

        const scrubTrigger = ScrollTrigger.create({
          scroller: viewport,
          trigger: track,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.35,
          invalidateOnRefresh: true,
          onUpdate: (self) => setAllProgress(self.progress),
        })
        scrollTriggers.push(scrubTrigger)
        setAllProgress(scrubTrigger.progress)
        ScrollTrigger.refresh()
        return true
      }

      const onPointerMove = (event: PointerEvent) => {
        if (!mouseFollow) return
        timelines.forEach((tl) => tl.pause())
        const progress = horizontalSeam
          ? Math.max(0, Math.min(1, event.clientY / window.innerHeight))
          : Math.max(0, Math.min(1, event.clientX / window.innerWidth))
        scrubTo(progress)
      }

      if (mouseFollow) {
        window.addEventListener('pointermove', onPointerMove, { passive: true })
      }

      if (scrollFollow) {
        let cancelled = false
        const frameId = requestAnimationFrame(() => {
          if (cancelled) return
          if (!setupScrollFollow()) {
            const pageTrigger = ScrollTrigger.create({
              trigger: scene,
              start: 'top 85%',
              end: 'bottom 15%',
              scrub: 1.2,
              onUpdate: (self) => setAllProgress(self.progress),
            })
            scrollTriggers.push(pageTrigger)
          }
        })

        return () => {
          cancelled = true
          cancelAnimationFrame(frameId)
          if (mouseFollow) {
            window.removeEventListener('pointermove', onPointerMove)
          }
          scrollTriggers.forEach((st) => st.kill())
          timelines.forEach((tl) => tl.kill())
        }
      }

      return () => {
        if (mouseFollow) {
          window.removeEventListener('pointermove', onPointerMove)
        }
        scrollTriggers.forEach((st) => st.kill())
        timelines.forEach((tl) => tl.kill())
      }
    },
    {
      scope: sceneRef,
      dependencies: [
        effect.enabled,
        effect.variant,
        effect.mouseFollow,
        effect.scrollFollow,
        effect.strength,
        effect.pivotTranslate,
        effect.labelTranslate,
        effect.config.duration,
        effect.config.xRange,
        effect.config.yRange,
        effect.config.labelEnterX,
        effect.config.labelEndX,
        effect.config.labelEnterY,
        effect.config.labelEndY,
        effect.config.svgOrigin,
      ],
      revertOnUpdate: true,
    },
  )
}

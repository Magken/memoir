import { type RefObject, useRef } from 'react'
import type { IsometricSliceTextLayout } from '../lib/isometrics/isometricScroll'
import { gsap, useGSAP } from '../lib/gsap'

export type UseTypeWordCloudScrubOptions = {
  mouseFollow?: boolean
  pressInteraction?: boolean
  sliceDensity?: number
  sliceTravel?: number
  layout?: IsometricSliceTextLayout
  /** Rebuild when pack size changes. */
  cellCount: number
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Pointer-scrubbed word stagger — same interaction model as `ref.isometric3` slices. */
export function useTypeWordCloudScrub(
  stageRef: RefObject<HTMLElement | null>,
  wrapperRef: RefObject<HTMLElement | null>,
  fieldRef: RefObject<HTMLElement | null>,
  options: UseTypeWordCloudScrubOptions,
) {
  const optionsRef = useRef(options)
  optionsRef.current = options

  useGSAP(
    () => {
      const stage = stageRef.current
      const wrapper = wrapperRef.current
      const field = fieldRef.current
      if (!stage || !wrapper || !field) return undefined
      if (prefersReducedMotion()) return undefined

      const words = field.querySelectorAll<HTMLElement>('.theme-word-cloud__word')
      if (words.length === 0) return undefined

      const { sliceDensity = 1, sliceTravel = 1 } = optionsRef.current
      const travel = 28 * sliceTravel
      const amount = Math.max(0.35, 1 / Math.max(sliceDensity, 0.25))

      const scrubTimeline = gsap.timeline({
        paused: true,
        defaults: { duration: 0.25, ease: 'power3.inOut', yoyoEase: 'sine.inOut' },
      })
      scrubTimeline.to(words, {
        y: `-=${travel}`,
        stagger: {
          amount,
          yoyo: true,
          repeat: 1,
          ease: 'none',
          from: 'center',
        },
      })
      gsap.set(scrubTimeline, { progress: 0.4 })

      const intro = gsap
        .timeline()
        .fromTo(scrubTimeline, { progress: 0.9 }, { duration: 1.5, progress: 0.1, ease: 'power2.inOut' })
        .to(scrubTimeline, { duration: 4, progress: 0.4, ease: 'elastic.out(0.8)' })

      const mapProgress = (clientX: number) => {
        const rect = stage.getBoundingClientRect()
        return gsap.utils.clamp(0, 1, (clientX - rect.left) / Math.max(rect.width, 1))
      }

      const onPointerMove = (event: PointerEvent) => {
        if (!optionsRef.current.mouseFollow) return
        const xp = mapProgress(event.clientX)
        gsap.to(scrubTimeline, { progress: xp, overwrite: true, duration: 0.35, ease: 'power2.out' })
        gsap.to(wrapper, {
          x: gsap.utils.mapRange(0, 1, 24, -24, xp),
          y: gsap.utils.mapRange(0, 1, -24, 24, xp),
          overwrite: true,
          duration: 0.35,
          ease: 'power2.out',
        })
      }

      const onPointerDown = () => {
        if (!optionsRef.current.pressInteraction) return
        gsap.to(field, {
          y: -18,
          filter: 'blur(2px)',
          opacity: 0.85,
          scale: 0.97,
          duration: 0.2,
          overwrite: 'auto',
        })
      }

      const onPointerUp = () => {
        if (!optionsRef.current.pressInteraction) return
        gsap
          .timeline({ defaults: { ease: 'bounce.out', duration: 0.45, overwrite: 'auto' } })
          .to(field, { y: 0, filter: 'blur(0px)', opacity: 1, scale: 1 })
      }

      const onPointerLeave = () => {
        onPointerUp()
        gsap.to(wrapper, { x: 0, y: 0, duration: 0.5, ease: 'power2.out', overwrite: true })
      }

      stage.addEventListener('pointermove', onPointerMove)
      stage.addEventListener('pointerdown', onPointerDown)
      stage.addEventListener('pointerup', onPointerUp)
      stage.addEventListener('pointerleave', onPointerLeave)

      return () => {
        stage.removeEventListener('pointermove', onPointerMove)
        stage.removeEventListener('pointerdown', onPointerDown)
        stage.removeEventListener('pointerup', onPointerUp)
        stage.removeEventListener('pointerleave', onPointerLeave)
        scrubTimeline.kill()
        intro.kill()
        gsap.set(words, { clearProps: 'y' })
        gsap.set(field, { clearProps: 'y,filter,opacity,scale' })
        gsap.set(wrapper, { clearProps: 'x,y' })
      }
    },
    {
      scope: stageRef,
      dependencies: [
        options.mouseFollow,
        options.pressInteraction,
        options.sliceDensity,
        options.sliceTravel,
        options.layout,
        options.cellCount,
      ],
    },
  )
}

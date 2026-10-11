import { type RefObject, useRef } from 'react'
import type { IsometricSliceTextLayout } from '../lib/isometrics/isometricScroll'
import { gsap, useGSAP } from '../lib/gsap'

export type { IsometricSliceTextLayout }

export type UseIsometricSliceTextOptions = {
  text: string
  mouseFollow?: boolean
  pressInteraction?: boolean
  sliceDensity?: number
  layout?: IsometricSliceTextLayout
  /** Slice travel multiplier on the ref stagger timeline. */
  sliceTravel?: number
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** GSAP vertical slice columns + pointer-scrubbed timeline — ref `isometric3`. */
export function useIsometricSliceText(
  stageRef: RefObject<HTMLElement | null>,
  srcRef: RefObject<HTMLElement | null>,
  topRef: RefObject<HTMLElement | null>,
  wrapperRef: RefObject<HTMLElement | null>,
  options: UseIsometricSliceTextOptions,
) {
  const optionsRef = useRef(options)
  optionsRef.current = options

  useGSAP(
    () => {
      const stage = stageRef.current
      const src = srcRef.current
      const top = topRef.current
      const wrapper = wrapperRef.current
      if (!stage || !src || !top || !wrapper) return undefined

      if (prefersReducedMotion()) return undefined

      let sliceTimeline: gsap.core.Timeline | null = null
      let introTimeline: gsap.core.Timeline | null = null
      let resizeObserver: ResizeObserver | undefined
      let lastTextWidth = 0
      let lastTextHeight = 0

      const buildSlices = () => {
        top.replaceChildren()
        gsap.set(top, { y: 0, clearProps: 'transform' })
        gsap.set(src, { y: 0, scale: 1, filter: 'none', opacity: 1, clearProps: 'transform' })

        // Layout box — not getBoundingClientRect (skewed AABB breaks slice y under ref transform).
        const textWidth = src.offsetWidth
        const textHeight = src.offsetHeight
        if (textWidth < 8 || textHeight < 8) return

        lastTextWidth = textWidth
        lastTextHeight = textHeight

        const { text, sliceDensity = 1, sliceTravel = 1 } = optionsRef.current
        const count = Math.floor(textWidth * 0.55 * sliceDensity)

        for (let i = 0; i <= count; i += 1) {
          const slice = document.createElement('div')
          slice.className = 'theme-isometric-slice-text__slice'
          slice.textContent = text
          top.append(slice)
          gsap.set(slice, {
            position: 'absolute',
            left: 0,
            top: 0,
            width: 4,
            height: textHeight,
            x: i * 2,
            y: -textHeight,
            textIndent: -i * 2,
            overflow: 'hidden',
          })
        }

        sliceTimeline?.kill()
        sliceTimeline = gsap.timeline({
          paused: true,
          defaults: { duration: 0.25, ease: 'power3.inOut', yoyoEase: 'sine.inOut' },
        })
        sliceTimeline.to(top.querySelectorAll('.theme-isometric-slice-text__slice'), {
          y: `-=${33 * sliceTravel}`,
          stagger: {
            amount: 1,
            yoyo: true,
            repeat: 1,
            ease: 'none',
          },
        })

        // Rest pose — slices align over ghost source (ref intro lands ~0.4)
        gsap.set(sliceTimeline, { progress: 0.4 })

        introTimeline?.kill()
        introTimeline = gsap
          .timeline()
          .fromTo(sliceTimeline, { progress: 0.9 }, { duration: 1.5, progress: 0.1, ease: 'power2.inOut' })
          .to(sliceTimeline, { duration: 4, progress: 0.4, ease: 'elastic.out(0.8)' })
      }

      // Font/layout must settle before measuring source box
      requestAnimationFrame(() => {
        requestAnimationFrame(() => buildSlices())
      })
      resizeObserver = new ResizeObserver(() => buildSlices())
      resizeObserver.observe(src)

      const mapProgress = (clientX: number) => {
        const rect = stage.getBoundingClientRect()
        return gsap.utils.clamp(0, 1, (clientX - rect.left) / Math.max(rect.width, 1))
      }

      const onPointerMove = (event: PointerEvent) => {
        if (!optionsRef.current.mouseFollow || !sliceTimeline) return
        const xp = mapProgress(event.clientX)
        gsap.to(sliceTimeline, { progress: xp, overwrite: true, duration: 0.35, ease: 'power2.out' })
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
        const originX = lastTextWidth > 0 ? lastTextWidth * 0.12 : 45
        const originY = lastTextHeight > 0 ? lastTextHeight * 0.92 : 99
        gsap
          .timeline({ defaults: { duration: 0.2, overwrite: 'auto' } })
          .to(top, { y: -25 })
          .to(
            src,
            {
              filter: 'blur(2px)',
              opacity: 0.85,
              scale: 0.96,
              transformOrigin: `${originX}px ${originY}px`,
            },
            0,
          )
      }

      const onPointerUp = () => {
        if (!optionsRef.current.pressInteraction) return
        gsap
          .timeline({ defaults: { ease: 'bounce.out', duration: 0.45, overwrite: 'auto' } })
          .to(top, { y: 0 })
          .to(src, { filter: 'blur(0px)', opacity: 1, scale: 1 }, 0)
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
        resizeObserver?.disconnect()
        stage.removeEventListener('pointermove', onPointerMove)
        stage.removeEventListener('pointerdown', onPointerDown)
        stage.removeEventListener('pointerup', onPointerUp)
        stage.removeEventListener('pointerleave', onPointerLeave)
        sliceTimeline?.kill()
        introTimeline?.kill()
      }
    },
    {
      scope: stageRef,
      dependencies: [
        options.text,
        options.mouseFollow,
        options.pressInteraction,
        options.sliceDensity,
        options.layout,
        options.sliceTravel,
      ],
    },
  )
}

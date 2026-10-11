import { type RefObject } from 'react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { gsap, useGSAP } from '../lib/gsap'
import { typeMarqueeLoopDurationPx, type TypeMarqueeDirection } from '../lib/animations/typeMarquee'

export type UseTypeMarqueeOptions = {
  speed?: number
  direction?: TypeMarqueeDirection
  axis?: 'horizontal' | 'vertical'
  pauseOnHover?: boolean
  /** Pause when the marquee leaves the viewport — saves work off-screen. */
  playInView?: boolean
  /** Content fill repeats — rebuild when viewport fill changes. */
  fillRepeat?: number
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** GSAP infinite marquee — duplicated track, linear `x` loop (Tuts+ / Codrops pattern). */
export function useTypeMarquee(
  viewportRef: RefObject<HTMLElement | null>,
  trackRef: RefObject<HTMLElement | null>,
  options: UseTypeMarqueeOptions = {},
) {
  const {
    speed = 80,
    direction = 'left',
    axis = 'horizontal',
    pauseOnHover = true,
    playInView = true,
    fillRepeat = 1,
  } = options

  useGSAP(
    () => {
      const viewport = viewportRef.current
      const track = trackRef.current
      if (!viewport || !track) return undefined

      if (prefersReducedMotion()) return undefined

      let tween: gsap.core.Tween | undefined
      let scrollTrigger: ScrollTrigger | undefined
      let resizeObserver: ResizeObserver | undefined
      let retryFrameId = 0
      let retryCount = 0

      const killTween = () => {
        tween?.kill()
        tween = undefined
      }

      const build = () => {
        killTween()

        const vertical = axis === 'vertical'
        const loopSize = vertical ? track.scrollHeight / 2 : track.scrollWidth / 2
        if (loopSize <= 0) {
          if (retryCount < 12) {
            retryCount += 1
            retryFrameId = window.requestAnimationFrame(build)
          }
          return
        }

        retryCount = 0
        const duration = typeMarqueeLoopDurationPx(loopSize, speed)
        if (duration <= 0) return

        if (vertical) {
          const up = direction === 'left'
          if (up) {
            gsap.set(track, { y: 0 })
            tween = gsap.to(track, { y: -loopSize, duration, ease: 'none', repeat: -1 })
          } else {
            gsap.set(track, { y: -loopSize })
            tween = gsap.to(track, { y: 0, duration, ease: 'none', repeat: -1 })
          }
        } else if (direction === 'left') {
          gsap.set(track, { x: 0 })
          tween = gsap.to(track, {
            x: -loopSize,
            duration,
            ease: 'none',
            repeat: -1,
          })
        } else {
          gsap.set(track, { x: -loopSize })
          tween = gsap.to(track, {
            x: 0,
            duration,
            ease: 'none',
            repeat: -1,
          })
        }

        if (playInView && scrollTrigger) {
          if (scrollTrigger.isActive) tween.play()
          else tween.pause()
        } else {
          tween.play()
        }
      }

      if (playInView) {
        scrollTrigger = ScrollTrigger.create({
          trigger: viewport,
          start: 'top bottom',
          end: 'bottom top',
          onEnter: () => tween?.play(),
          onLeave: () => tween?.pause(),
          onEnterBack: () => tween?.play(),
          onLeaveBack: () => tween?.pause(),
        })
      }

      void document.fonts.ready.then(() => {
        retryFrameId = window.requestAnimationFrame(build)
      })

      resizeObserver = new ResizeObserver(() => {
        build()
      })
      resizeObserver.observe(track)

      const onPointerEnter = () => tween?.pause()
      const onPointerLeave = () => {
        if (playInView && scrollTrigger && !scrollTrigger.isActive) return
        tween?.play()
      }

      if (pauseOnHover) {
        viewport.addEventListener('pointerenter', onPointerEnter)
        viewport.addEventListener('pointerleave', onPointerLeave)
      }

      return () => {
        window.cancelAnimationFrame(retryFrameId)
        killTween()
        scrollTrigger?.kill()
        resizeObserver?.disconnect()
        if (pauseOnHover) {
          viewport.removeEventListener('pointerenter', onPointerEnter)
          viewport.removeEventListener('pointerleave', onPointerLeave)
        }
        gsap.set(track, { clearProps: 'transform' })
      }
    },
    {
      scope: viewportRef,
      dependencies: [speed, direction, axis, pauseOnHover, playInView, fillRepeat],
      revertOnUpdate: true,
    },
  )
}

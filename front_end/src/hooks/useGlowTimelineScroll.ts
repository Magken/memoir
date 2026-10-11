import { type RefObject } from 'react'
import gsap, { ScrollTrigger, useGSAP } from '../lib/gsap'
import { useGsapPage } from '../lib/gsap'
import type { GlowTimelineOrientation, GlowTimelineScrollRange } from '../lib/timeline/glowTimelineTypes'

type UseGlowTimelineScrollOptions = {
  scopeRef: RefObject<HTMLElement | null>
  triggerRef: RefObject<HTMLElement | null>
  timelineRef: RefObject<HTMLOListElement | null>
  scroll: GlowTimelineScrollRange
  orientation?: GlowTimelineOrientation
  /** ThemeScroll / nested viewport — omit for window scroll. */
  scrollerRef?: RefObject<HTMLElement | null>
  /** Override scrub (defaults to page scrub token). */
  scrub?: number | boolean
  /**
   * When false, do not create ScrollTriggers (e.g. during CSS panel swap transforms).
   * Default true.
   */
  enabled?: boolean
  /** Work split-rail — scrub main dots only (not sub-role dots). */
  splitRail?: boolean
  rolesScroll?: GlowTimelineScrollRange
}

export function useGlowTimelineScroll({
  scopeRef,
  triggerRef,
  timelineRef,
  scroll,
  orientation = 'vertical',
  scrollerRef,
  scrub,
  enabled = true,
  splitRail = false,
  rolesScroll,
}: UseGlowTimelineScrollOptions) {
  const { timing, reducedMotion, refreshScroll } = useGsapPage()
  const scrubValue = scrub ?? timing.scroll.scrubPage

  useGSAP(
    () => {
      if (reducedMotion || !enabled) return

      let cancelled = false
      let attempts = 0
      let frameId = 0
      const triggers: ScrollTrigger[] = []
      let resizeObserver: ResizeObserver | null = null
      const settleTimers: number[] = []

      const bind = () => {
        if (cancelled) return
        const trigger = triggerRef.current
        const timeline = timelineRef.current
        const scroller = scrollerRef?.current ?? undefined
        if (!trigger || !timeline || (scrollerRef && !scroller)) {
          attempts += 1
          if (attempts < 48) frameId = requestAnimationFrame(bind)
          return
        }

        const shell = timeline.closest('.theme-glow-timeline__shell')
        const axis = shell?.querySelector<HTMLElement>('.theme-glow-timeline__axis')
        const axisGlow = shell?.querySelector<HTMLElement>('.theme-glow-timeline__axis-glow')
        const marker = shell?.querySelector<HTMLElement>('.theme-glow-timeline__marker')
        const dotSelector = splitRail
          ? '.theme-glow-timeline__item > .theme-glow-timeline__dot'
          : '.theme-glow-timeline__dot'
        const dots = gsap.utils.toArray<HTMLElement>(dotSelector, timeline)
        if (!axis || !axisGlow || !marker || dots.length === 0) return

        const measureTimelineRail = () => {
          if (!shell) return null

          const shellRect = shell.getBoundingClientRect()
          // Never measure dots inside display:none focus-away rows — empty rects yank the axis.
          const visibleDots = dots.filter((dot) => dot.getClientRects().length > 0)
          if (visibleDots.length === 0) return null

          const metrics = visibleDots.map((dot) => {
            const rect = dot.getBoundingClientRect()
            return {
              centerX: rect.left + rect.width / 2 - shellRect.left,
              centerY: rect.top + rect.height / 2 - shellRect.top,
              top: rect.top - shellRect.top,
              bottom: rect.bottom - shellRect.top,
              left: rect.left - shellRect.left,
              right: rect.right - shellRect.left,
            }
          })

          if (orientation === 'horizontal') {
            const axisY = metrics[0]?.centerY ?? 0
            let railLeft = metrics[0]?.centerX ?? 0
            let railWidth = 0

            if (metrics.length >= 2) {
              railLeft = metrics[0].centerX
              railWidth = Math.max(metrics[metrics.length - 1].centerX - railLeft, 0)
            }

            gsap.set([axis, axisGlow, marker], { top: axisY, yPercent: -50, xPercent: 0 })
            gsap.set(axis, { left: railLeft, width: railWidth, height: 2 })

            return { axisY, railLeft, railWidth, metrics, visibleDots }
          }

          const axisX = metrics[0]?.centerX ?? 0
          let railTop = metrics[0]?.centerY ?? 0
          let railHeight = 0

          if (metrics.length >= 2) {
            railTop = metrics[0].bottom
            const lastTop = metrics[metrics.length - 1].top
            railHeight = Math.max(lastTop - railTop, 0)
          }

          gsap.set([axis, axisGlow, marker], { left: axisX, xPercent: -50, yPercent: 0 })
          gsap.set(axis, { top: railTop, height: railHeight, width: 2 })

          return { railTop, railHeight, metrics, visibleDots }
        }

        const applyTimelineProgress = (progress: number) => {
          const layout = measureTimelineRail()
          if (!layout) return

          const { metrics, visibleDots } = layout
          const clampedProgress = gsap.utils.clamp(0, 1, progress)

          if (orientation === 'horizontal' && 'railLeft' in layout) {
            const axisY = layout.axisY ?? 0
            const railLeft = layout.railLeft ?? 0
            const railWidth = layout.railWidth ?? 0
            const headX =
              railWidth > 0 ? railLeft + railWidth * clampedProgress : metrics[0]?.centerX ?? 0

            gsap.set(axisGlow, {
              left: railLeft,
              top: axisY,
              width: railWidth,
              height: 2,
              scaleX: railWidth > 0 ? clampedProgress : 0,
              transformOrigin: 'left center',
              yPercent: -50,
              xPercent: 0,
            })

            gsap.set(marker, {
              left: headX,
              top: axisY,
              xPercent: -50,
              yPercent: -50,
              opacity: railWidth > 0 ? 1 : 0,
            })

            visibleDots.forEach((dot, index) => {
              const centerX = metrics[index]?.centerX ?? 0
              const stepThreshold = metrics.length <= 1 ? 0 : index / (metrics.length - 1)
              const reachedByHead = headX >= centerX - 1
              const reachedByProgress = clampedProgress >= stepThreshold - 0.02
              dot.classList.toggle('is-glow-active', reachedByHead || reachedByProgress)
            })
            return
          }

          const { railTop, railHeight } = layout as {
            railTop: number
            railHeight: number
            metrics: typeof metrics
            visibleDots: typeof visibleDots
          }
          const headY =
            railHeight > 0 ? railTop + railHeight * clampedProgress : metrics[0]?.centerY ?? 0

          gsap.set(axisGlow, {
            top: railTop,
            left: metrics[0]?.centerX ?? 0,
            height: railHeight,
            width: 2,
            scaleY: railHeight > 0 ? clampedProgress : 0,
            transformOrigin: 'top center',
            xPercent: -50,
            yPercent: 0,
          })

          gsap.set(marker, {
            top: headY,
            left: metrics[0]?.centerX ?? 0,
            yPercent: -50,
            xPercent: -50,
            opacity: railHeight > 0 ? 1 : 0,
          })

          visibleDots.forEach((dot, index) => {
            const centerY = metrics[index]?.centerY ?? 0
            const stepThreshold = metrics.length <= 1 ? 0 : index / (metrics.length - 1)
            const reachedByHead = headY >= centerY - 1
            const reachedByProgress = clampedProgress >= stepThreshold - 0.02
            dot.classList.toggle('is-glow-active', reachedByHead || reachedByProgress)
          })
        }

        applyTimelineProgress(0)

        const mainTrigger = ScrollTrigger.create({
          ...(scroller ? { scroller } : {}),
          trigger,
          start: scroll.start,
          end: scroll.end,
          scrub: scrubValue,
          invalidateOnRefresh: true,
          onUpdate: (self) => applyTimelineProgress(self.progress),
          onRefresh: (self) => applyTimelineProgress(self.progress),
        })
        triggers.push(mainTrigger)
        applyTimelineProgress(mainTrigger.progress)

        // Remeasure after layout/enter transforms settle (nested peel + panel reveal).
        const settle = () => {
          if (cancelled) return
          refreshScroll()
          applyTimelineProgress(mainTrigger.progress)
        }
        requestAnimationFrame(() => {
          requestAnimationFrame(settle)
        })
        settleTimers.push(window.setTimeout(settle, 64))
        settleTimers.push(window.setTimeout(settle, 420))

        if (typeof ResizeObserver !== 'undefined') {
          let resizeRaf = 0
          resizeObserver = new ResizeObserver(() => {
            // Coalesce RO storms (menu peel, preview folds, Monaco layout).
            if (resizeRaf) return
            resizeRaf = window.requestAnimationFrame(() => {
              resizeRaf = 0
              if (cancelled) return
              refreshScroll()
              applyTimelineProgress(mainTrigger.progress)
            })
          })
          resizeObserver.observe(trigger)
          if (shell) resizeObserver.observe(shell)
        }

        if (rolesScroll) {
          const roleGroups = gsap.utils.toArray<HTMLElement>(
            '.theme-glow-timeline__roles--glow',
            timeline,
          )

          roleGroups.forEach((group) => {
            const subDots = gsap.utils.toArray<HTMLElement>(
              '.theme-glow-timeline__dot--sub',
              group,
            )
            const subAxis = group.querySelector<HTMLElement>('.theme-glow-timeline__roles-axis')
            const subAxisGlow = group.querySelector<HTMLElement>(
              '.theme-glow-timeline__roles-axis-glow',
            )
            const subMarker = group.querySelector<HTMLElement>(
              '.theme-glow-timeline__roles-marker',
            )
            if (!subAxis || !subAxisGlow || !subMarker || subDots.length === 0) return

            const measureSubRail = () => {
              const groupRect = group.getBoundingClientRect()
              const metrics = subDots.map((dot) => {
                const rect = dot.getBoundingClientRect()
                return {
                  centerX: rect.left + rect.width / 2 - groupRect.left,
                  centerY: rect.top + rect.height / 2 - groupRect.top,
                  top: rect.top - groupRect.top,
                  bottom: rect.bottom - groupRect.top,
                }
              })

              const axisX = metrics[0]?.centerX ?? 0
              let railTop = metrics[0]?.centerY ?? 0
              let railHeight = 0

              if (metrics.length >= 2) {
                railTop = metrics[0].bottom
                const lastTop = metrics[metrics.length - 1].top
                railHeight = Math.max(lastTop - railTop, 0)
              }

              gsap.set([subAxis, subAxisGlow, subMarker], { left: axisX, xPercent: -50 })
              gsap.set(subAxis, { top: railTop, height: railHeight, yPercent: 0 })

              return { railTop, railHeight, metrics }
            }

            const applySubProgress = (progress: number) => {
              const layout = measureSubRail()
              if (!layout) return

              const { railTop, railHeight, metrics } = layout
              const clampedProgress = gsap.utils.clamp(0, 1, progress)
              const headY =
                railHeight > 0
                  ? railTop + railHeight * clampedProgress
                  : metrics[0]?.centerY ?? 0

              gsap.set(subAxisGlow, {
                top: railTop,
                height: railHeight,
                scaleY: railHeight > 0 ? clampedProgress : 0,
                transformOrigin: 'top center',
                yPercent: 0,
              })

              gsap.set(subMarker, {
                top: headY,
                yPercent: -50,
                opacity: railHeight > 0 ? 1 : 0,
              })

              subDots.forEach((dot, dotIndex) => {
                const centerY = metrics[dotIndex]?.centerY ?? 0
                const stepThreshold =
                  metrics.length <= 1 ? 0 : dotIndex / (metrics.length - 1)
                const reachedByHead = headY >= centerY - 1
                const reachedByProgress = clampedProgress >= stepThreshold - 0.02
                dot.classList.toggle('is-glow-active', reachedByHead || reachedByProgress)
              })
            }

            applySubProgress(0)

            triggers.push(
              ScrollTrigger.create({
                ...(scroller ? { scroller } : {}),
                trigger: group,
                start: rolesScroll.start,
                end: rolesScroll.end,
                scrub: scrubValue,
                invalidateOnRefresh: true,
                onUpdate: (self) => applySubProgress(self.progress),
                onRefresh: (self) => applySubProgress(self.progress),
              }),
            )
          })
        }

        refreshScroll()
      }

      frameId = requestAnimationFrame(bind)
      return () => {
        cancelled = true
        cancelAnimationFrame(frameId)
        settleTimers.forEach((id) => window.clearTimeout(id))
        resizeObserver?.disconnect()
        triggers.forEach((t) => t.kill())
      }
    },
    {
      scope: scopeRef,
      dependencies: [
        reducedMotion,
        enabled,
        timing,
        scroll,
        rolesScroll,
        splitRail,
        orientation,
        scrollerRef,
        scrubValue,
        refreshScroll,
      ],
    },
  )
}

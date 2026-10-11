import { useRef, type RefObject } from 'react'
import { CurvedMonitorCard } from '../components/CurvedMonitorCard'
import { HOME_FEATURE_GROUPS } from '../components/curvedMonitorCard/featureGroups'
import { PageScrollType } from '../components/PageScrollType'
import { gsap, ScrollTrigger, useGSAP, useGsapPage } from '../lib/gsap'

type HomeMoreFeaturesSceneProps = {
  scrollerRef: RefObject<HTMLDivElement | null>
}

/**
 * Home band above Pricing — extras on the bent feature-group card.
 * The card fills the section and enters/exits with the page scroller.
 */
export function HomeMoreFeaturesScene({ scrollerRef }: HomeMoreFeaturesSceneProps) {
  const rootRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const { reducedMotion } = useGsapPage()

  useGSAP(
    () => {
      const root = rootRef.current
      const stage = stageRef.current
      if (!root || !stage || reducedMotion) return

      let cancelled = false
      let attempts = 0
      let frameId = 0
      let trigger: ScrollTrigger | undefined

        const bind = () => {
        if (cancelled) return
        const scroller = scrollerRef.current
        if (!scroller) {
          attempts += 1
          if (attempts < 48) frameId = requestAnimationFrame(bind)
          return
        }

        gsap.set(stage, { autoAlpha: 0, y: 36 })

        const showBowl = () => {
          gsap.to(stage, {
            autoAlpha: 1,
            y: 0,
            duration: 0.72,
            ease: 'power2.out',
            overwrite: 'auto',
          })
        }
        const hideBowl = (y: number) => {
          gsap.to(stage, {
            autoAlpha: 0,
            y,
            duration: 0.36,
            ease: 'power2.in',
            overwrite: 'auto',
          })
        }

        trigger = ScrollTrigger.create({
          trigger: root,
          scroller,
          start: 'top 88%',
          end: 'bottom 18%',
          onEnter: showBowl,
          onLeave: () => hideBowl(-22),
          onEnterBack: showBowl,
          onLeaveBack: () => hideBowl(36),
        })
      }

      frameId = requestAnimationFrame(bind)
      return () => {
        cancelled = true
        cancelAnimationFrame(frameId)
        trigger?.kill()
      }
    },
    {
      scope: rootRef,
      dependencies: [reducedMotion, scrollerRef],
      revertOnUpdate: true,
    },
  )

  const title = reducedMotion ? (
    <h2 className="page-scene--home-more-features__title type-display-lg theme-page-scroll-type--center">
      More{' '}
      <span className="page-scene--home-more-features__word--accent">Vurify</span> features
    </h2>
  ) : (
    <PageScrollType
      as="h2"
      text="More Vurify features"
      effect={2}
      mode="enter"
      scrollerRef={scrollerRef}
      className="page-scene--home-more-features__title type-display-lg theme-page-scroll-type--center theme-page-scroll-type--block"
      start="top 88%"
      wordClassNames={{
        Vurify: 'page-scene--home-more-features__word--accent',
      }}
    />
  )

  return (
    <section
      ref={rootRef}
      id="home-scene-4b"
      className="page-scene page-scene--home-more-features"
      aria-label="More Vurify features"
    >
      <div className="page-scene--home-more-features__layout">
        <header className="page-scene--home-more-features__header">
          {title}
        </header>
        <div ref={stageRef} className="page-scene--home-more-features__stage">
          <CurvedMonitorCard groups={HOME_FEATURE_GROUPS} />
        </div>
      </div>
    </section>
  )
}

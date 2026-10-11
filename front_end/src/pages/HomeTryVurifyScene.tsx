import type { RefObject } from 'react'
import { PageScrollType } from '../components/PageScrollType'
import { VurifyTestimonialShift } from '../components/VurifyTestimonialShift'
import { useGsapPage } from '../lib/gsap'

type HomeTryVurifySceneProps = {
  scrollerRef: RefObject<HTMLDivElement | null>
}

/**
 * Home Internal Scene 06 — reviews only.
 */
export function HomeTryVurifyScene({ scrollerRef }: HomeTryVurifySceneProps) {
  const { reducedMotion } = useGsapPage()

  const title = reducedMotion ? (
    <h2 className="page-scene--home-try-vurify__title type-display-lg">
      What people say about{' '}
      <span className="page-scene--home-try-vurify__word--accent">Vurify</span>
    </h2>
  ) : (
    <PageScrollType
      as="h2"
      text="What people say about Vurify"
      effect={6}
      mode="enter"
      scrollerRef={scrollerRef}
      className="page-scene--home-try-vurify__title type-display-lg theme-page-scroll-type--block"
      start="top 85%"
      wordClassNames={{
        Vurify: 'page-scene--home-try-vurify__word--accent',
      }}
    />
  )

  return (
    <section
      id="home-scene-6"
      className="page-scene page-scene--home-try-vurify"
      aria-label="What people say about Vurify"
    >
      <div className="page-scene--home-try-vurify__layout">
        <div className="page-scene--home-try-vurify__testimonials">
          <VurifyTestimonialShift
            lead={title}
            reducedMotion={reducedMotion}
            className="page-scene--home-try-vurify__shift"
          />
        </div>
      </div>
    </section>
  )
}

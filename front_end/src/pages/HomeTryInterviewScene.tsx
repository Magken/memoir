import type { RefObject } from 'react'
import { HomeTryInterviewChooser } from '../components/HomeTryInterviewChooser'
import { useGsapPage } from '../lib/gsap'
import type { TryInterviewKitId } from '../lib/tryInterview/tryInterviewKits'

type HomeTryInterviewSceneProps = {
  scrollerRef: RefObject<HTMLDivElement | null>
  /** Opens `/try-interview?kit=` for the displayed kit. */
  onTakeInterview?: (kitId: TryInterviewKitId) => void
}

/**
 * Home Internal Scene 07 — test-interview kit chooser with take CTA.
 */
export function HomeTryInterviewScene({
  scrollerRef,
  onTakeInterview,
}: HomeTryInterviewSceneProps) {
  const { reducedMotion } = useGsapPage()

  return (
    <section
      id="home-scene-7"
      className="page-scene page-scene--home-try-interview"
      aria-label="Take a test interview"
    >
      <div className="page-scene--home-try-interview__layout">
        <HomeTryInterviewChooser
          scrollerRef={scrollerRef}
          reducedMotion={reducedMotion}
          onTakeInterview={onTakeInterview}
        />
      </div>
    </section>
  )
}

import { useRef } from 'react'
import gsap, { useGSAP, useGsapPage } from '../lib/gsap'
import { PageLoader } from './Loader'

type PageLoadingSceneProps = {
  ready: boolean
  label?: string
  onComplete?: () => void
  debug?: boolean
}

export function PageLoadingScene({
  ready,
  label = 'Loading…',
  onComplete,
  debug = false,
}: PageLoadingSceneProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const underlayRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const { timing, reducedMotion } = useGsapPage()

  useGSAP(
    () => {
      const root = rootRef.current
      const panel = panelRef.current
      const underlay = underlayRef.current
      const content = contentRef.current
      if (!ready || !root || !panel || !underlay || !content) return

      if (debug) {
        console.debug('[PageLoadingScene]', { ready, reducedMotion })
      }

      if (reducedMotion) {
        gsap.set(root, { autoAlpha: 0, pointerEvents: 'none' })
        queueMicrotask(() => onComplete?.())
        return
      }

      const sequence = gsap.timeline({
        defaults: { ease: timing.ease.inOut },
        onComplete,
      })

      sequence
        .addLabel('ready')
        .to(
          content,
          {
            autoAlpha: 0,
            y: -12,
            duration: timing.duration.fast,
          },
          'ready',
        )
        .addLabel('peel', `ready+=${timing.duration.fast * 0.55}`)
        .to(
          panel,
          {
            clipPath: 'inset(0 0 100% 0)',
            duration: timing.duration.page,
          },
          'peel',
        )
        .to(
          underlay,
          {
            clipPath: 'inset(0 0 100% 0)',
            duration: timing.duration.slow,
          },
          'peel+=0.08',
        )
        .set(root, { autoAlpha: 0, pointerEvents: 'none' })
    },
    {
      dependencies: [debug, onComplete, ready, reducedMotion, timing],
      scope: rootRef,
      revertOnUpdate: true,
    },
  )

  return (
    <div ref={rootRef} className="page-loading-scene">
      <div ref={underlayRef} className="page-loading-scene__underlay" aria-hidden />
      <div ref={panelRef} className="page-loading-scene__panel" aria-hidden />
      <div ref={contentRef} className="page-loading-scene__content">
        <PageLoader compact label={label} className="page-loading-scene__loader" />
      </div>
    </div>
  )
}

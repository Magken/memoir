import { useCallback, useEffect, useRef, useState } from 'react'
import {
  WaveMaskTransitionStage,
  type WaveMaskTransitionApi,
} from './WaveMaskTransitionStage'
import type { WaveMaskVariant } from '../lib/transitions/waveMaskTransition'

type WaveMaskImagePreviewProps = {
  src: string
  alt?: string
  variant?: WaveMaskVariant
  className?: string
}

/** Image swap with wave-mask reveal — ref.gsap-transition-8 scroll variant for picker previews. */
export function WaveMaskImagePreview({
  src,
  alt = '',
  variant = 'scroll',
  className = '',
}: WaveMaskImagePreviewProps) {
  const apiRef = useRef<WaveMaskTransitionApi | null>(null)
  const committedSrcRef = useRef(src)
  const activeTweenRef = useRef<ReturnType<typeof import('gsap').default.timeline> | ReturnType<typeof import('gsap').default.to> | null>(null)
  const [pair, setPair] = useState({ a: src, b: src })

  const runTransition = useCallback(
    (from: string, to: string) => {
      setPair({ a: from, b: to })
      requestAnimationFrame(() => {
        const api = apiRef.current
        if (!api) return
        activeTweenRef.current?.kill()
        api.reset()
        activeTweenRef.current = api.playEnter()
        activeTweenRef.current.eventCallback('onComplete', () => {
          committedSrcRef.current = to
          api.reset()
          setPair({ a: to, b: to })
          activeTweenRef.current = null
        })
      })
    },
    [],
  )

  useEffect(() => {
    if (src === committedSrcRef.current) return
    runTransition(committedSrcRef.current, src)
  }, [runTransition, src])

  useEffect(
    () => () => {
      activeTweenRef.current?.kill()
    },
    [],
  )

  return (
    <>
      {alt ? <span className="sr-only">{alt}</span> : null}
      <WaveMaskTransitionStage
      imageA={pair.a}
      imageB={pair.b}
      variant={variant}
      showCopy={false}
      className={className}
      onReady={(api) => {
        apiRef.current = api
      }}
      />
    </>
  )
}

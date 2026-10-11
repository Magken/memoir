import { useEffect, useRef, useState } from 'react'
import {
  NEURON_FIELD_DEFAULT_PUBLIC,
  NeuronFieldFilterEngine,
} from '../lib/imageEffects/neuronFieldFilter'
import { DEFAULT_LOADER_LABEL } from '../lib/loaders/loaderVariants'
import { ContentLoadOverlay } from './Loader'

type NeuronFieldImageProps = {
  src: string
  alt?: string
  className?: string
  /** Dot glyph size px — smaller = denser field. Default 4. */
  dotSize?: number
  /** Neuron spark intensity 0–1. */
  neuronIntensity?: number
  /** Time-based twinkle, sparks, color drift, and continuous RAF. Default false. */
  motion?: boolean
  label?: string
  debug?: boolean
}

export function NeuronFieldImage({
  src,
  alt = '',
  className = '',
  dotSize = NEURON_FIELD_DEFAULT_PUBLIC.dotSize,
  neuronIntensity = NEURON_FIELD_DEFAULT_PUBLIC.neuronIntensity,
  motion = false,
  label,
  debug = false,
}: NeuronFieldImageProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<NeuronFieldFilterEngine | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadLabel, setLoadLabel] = useState(DEFAULT_LOADER_LABEL)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !src) return undefined

    setLoading(true)
    setLoadLabel(DEFAULT_LOADER_LABEL)

    const engine = new NeuronFieldFilterEngine(canvas)
    engineRef.current = engine
    let cancelled = false

    engine.setThemeRoot(hostRef.current?.closest('.theme') ?? null)
    void engine
      .preloadImages([src])
      .then(() => {
        if (cancelled) return
        engine.setSlide(src)
        engine.setPublicParams({ dotSize, neuronIntensity, morphProgress: 0, motion })
        try {
          engine.init()
          setLoading(false)
        } catch (error) {
          if (debug) console.error('[NeuronFieldImage] init failed', error)
        }
      })
      .catch((error) => {
        if (debug) console.error('[NeuronFieldImage] preload failed', error)
      })

    return () => {
      cancelled = true
      engine.destroy()
      engineRef.current = null
      setLoading(true)
    }
  }, [debug, src])

  useEffect(() => {
    const engine = engineRef.current
    if (!engine || loading) return
    engine.setPublicParams({ dotSize, neuronIntensity, morphProgress: 0, motion })
  }, [dotSize, loading, motion, neuronIntensity])

  if (debug) {
    console.debug('[NeuronFieldImage]', { src, loading, dotSize, neuronIntensity })
  }

  return (
    <figure
      className={['theme-neuron-field-image', className].filter(Boolean).join(' ')}
      aria-label={label ?? alt}
      data-ready={!loading || undefined}
    >
      <div className="theme-gallery__stage-wrap">
        <div
          ref={hostRef}
          className="theme-neuron-field-image__stage"
          role="region"
          aria-label={label ?? alt}
        >
          <canvas ref={canvasRef} className="theme-neuron-field-image__canvas" aria-hidden />
          <ContentLoadOverlay loading={loading} label={loadLabel} />
        </div>
      </div>
      {alt ? <figcaption className="sr-only">{alt}</figcaption> : null}
    </figure>
  )
}

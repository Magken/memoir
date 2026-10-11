import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import gsap from '../lib/gsap'
import {
  waveMaskConfigForVariant,
  waveMaskPolygonPoints,
  waveMaskRevealDistance,
  WAVE_MASK_REVEAL_DURATION,
  type WaveMaskVariant,
} from '../lib/transitions/waveMaskTransition'

export type WaveMaskTransitionApi = {
  playEnter: () => ReturnType<typeof gsap.to>
  reset: () => void
}

type WaveMaskTransitionStageProps = {
  imageA: string
  imageB: string
  titleA?: string
  titleB?: string
  variant: WaveMaskVariant
  showCopy?: boolean
  className?: string
  onReady?: (api: WaveMaskTransitionApi) => void
}

export function WaveMaskTransitionStage({
  imageA,
  imageB,
  titleA = 'Before',
  titleB = 'After',
  variant,
  showCopy = true,
  className = '',
  onReady,
}: WaveMaskTransitionStageProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const waveGroupRef = useRef<SVGGElement>(null)
  const wavePolygonsRef = useRef<SVGPolygonElement[]>([])
  const waveYRef = useRef({ value: 0 })
  const tickerRef = useRef<((time: number) => void) | null>(null)
  const sizeRef = useRef({ width: 640, height: 360 })
  const [dims, setDims] = useState({ width: 640, height: 360 })
  const maskId = useId().replace(/:/g, '')

  const config = waveMaskConfigForVariant(variant)

  const syncWavePolygons = useCallback(() => {
    const { width, height } = sizeRef.current
    const time = gsap.ticker.time
    const waveY = waveYRef.current.value

    wavePolygonsRef.current.forEach((polygon, index) => {
      const points = waveMaskPolygonPoints(width, height, index, config, time, waveY, variant)
      gsap.set(polygon, { attr: { points } })
    })
  }, [config, variant])

  const stopTicker = useCallback(() => {
    if (tickerRef.current) {
      gsap.ticker.remove(tickerRef.current)
      tickerRef.current = null
    }
  }, [])

  const startTicker = useCallback(() => {
    if (tickerRef.current) return
    const tick = () => syncWavePolygons()
    tickerRef.current = tick
    gsap.ticker.add(tick)
  }, [syncWavePolygons])

  const measure = useCallback(() => {
    const root = rootRef.current
    if (!root) return
    const width = Math.max(1, Math.round(root.clientWidth))
    const height = Math.max(1, Math.round(root.clientHeight))
    sizeRef.current = { width, height }
    setDims({ width, height })
    if (svgRef.current) {
      svgRef.current.setAttribute('viewBox', `0 0 ${width} ${height}`)
    }
    syncWavePolygons()
  }, [syncWavePolygons])

  const reset = useCallback(() => {
    stopTicker()
    waveYRef.current.value = 0
    syncWavePolygons()
  }, [stopTicker, syncWavePolygons])

  const playEnter = useCallback(() => {
    measure()
    startTicker()
    waveYRef.current.value = 0
    syncWavePolygons()

    const reveal = waveMaskRevealDistance(sizeRef.current.height, variant)
    return gsap.to(waveYRef.current, {
      value: reveal,
      duration: WAVE_MASK_REVEAL_DURATION,
      ease: 'power2.inOut',
      onUpdate: syncWavePolygons,
    })
  }, [measure, startTicker, syncWavePolygons, variant])

  useLayoutEffect(() => {
    const group = waveGroupRef.current
    if (!group) return

    wavePolygonsRef.current = []
    group.replaceChildren()

    for (let index = 0; index < config.waveCount; index += 1) {
      const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')
      if (index === 0) {
        polygon.setAttribute('fill', '#fff')
      } else {
        polygon.setAttribute('fill', 'none')
        polygon.setAttribute('stroke', '#fff')
        if (variant === 'scroll') {
          polygon.setAttribute('stroke-dasharray', '2 4')
        }
        polygon.setAttribute('stroke-width', String(1.2 - index / config.waveCount))
      }
      group.appendChild(polygon)
      wavePolygonsRef.current.push(polygon)
    }

    measure()
  }, [config.waveCount, measure, variant])

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return undefined

    const observer = new ResizeObserver(() => measure())
    observer.observe(root)
    return () => observer.disconnect()
  }, [measure])

  useEffect(() => {
    onReady?.({ playEnter, reset })
  }, [onReady, playEnter, reset])

  useEffect(() => () => stopTicker(), [stopTicker])

  const hostClass = [
    'gsap-transition-wave-mask',
    `gsap-transition-wave-mask--${variant}`,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div ref={rootRef} className={hostClass}>
      <svg
        ref={svgRef}
        className="gsap-transition-wave-mask__svg"
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden={!showCopy}
      >
        <defs>
          <mask id={maskId}>
            <rect x="0" y="0" width={dims.width} height={dims.height} fill="#000" />
            <g ref={waveGroupRef} />
          </mask>
        </defs>

        <image
          className="gsap-transition-wave-mask__image gsap-transition-wave-mask__image--base"
          href={imageA}
          x="0"
          y="0"
          width={dims.width}
          height={dims.height}
          preserveAspectRatio="xMidYMid slice"
        />

        {showCopy ? (
          <text
            className="gsap-transition-wave-mask__outline type-display-sm"
            x="50%"
            y="50%"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {titleA}
          </text>
        ) : null}

        <g mask={`url(#${maskId})`}>
          <rect className="gsap-transition-wave-mask__fill" x="0" y="0" width={dims.width} height={dims.height} />
          <image
            className="gsap-transition-wave-mask__image gsap-transition-wave-mask__image--reveal"
            href={imageB}
            x="0"
            y="0"
            width={dims.width}
            height={dims.height}
            preserveAspectRatio="xMidYMid slice"
          />
          {showCopy ? (
            <text
              className="gsap-transition-wave-mask__reveal type-display-sm"
              x="50%"
              y="50%"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {titleB}
            </text>
          ) : null}
        </g>
      </svg>
    </div>
  )
}

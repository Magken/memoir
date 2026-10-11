import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import type { IsometricSliceTextLayout } from '../lib/isometrics/isometricScroll'
import { useTypeWordCloudScrub } from '../hooks/useTypeWordCloudScrub'
import {
  TYPE_WORD_CLOUD_ENTRIES,
  typeWordCloudCells,
  typeWordCloudEstimateBounds,
  typeWordCloudFontPx,
  type TypeWordCloudBounds,
  type TypeWordCloudCell,
} from '../lib/theme/typeWordCloud'

export type TypeWordCloudProps = {
  className?: string
  /** Pointer X scrubs the word stagger timeline. */
  mouseFollow?: boolean
  /** Pointer down scoops the field + soft blur. */
  pressInteraction?: boolean
  /** Stagger density multiplier — higher = tighter wave. */
  sliceDensity?: number
  /** Stagger travel multiplier. */
  sliceTravel?: number
  /** `ref` — axonometric rotate/skew wrapper · `flat` — no wrapper transform. */
  layout?: IsometricSliceTextLayout
}

function measureBounds(fontFamily: string): TypeWordCloudBounds {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const map = new Map<string, { width: number; height: number }>()
  for (const entry of TYPE_WORD_CLOUD_ENTRIES) {
    const fontPx = typeWordCloudFontPx(entry.weight)
    if (!ctx) {
      map.set(entry.word, typeWordCloudEstimateBounds(entry.word, fontPx))
      continue
    }
    ctx.font = `600 ${fontPx}px ${fontFamily}`
    const metrics = ctx.measureText(entry.word)
    const ascent = metrics.actualBoundingBoxAscent || fontPx * 0.8
    const descent = metrics.actualBoundingBoxDescent || fontPx * 0.2
    map.set(entry.word, {
      width: Math.max(fontPx * 0.5, metrics.width),
      height: ascent + descent,
    })
  }
  return map
}

/**
 * Type word cloud — display font + accent, axonometric wrapper, pointer-scrubbed
 * stagger (same interaction model as `ref.isometric3` slice columns).
 */
export function TypeWordCloud({
  className = '',
  mouseFollow = true,
  pressInteraction = true,
  sliceDensity = 1,
  sliceTravel = 1,
  layout = 'ref',
}: TypeWordCloudProps) {
  const stageRef = useRef<HTMLDivElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const fieldRef = useRef<HTMLDivElement>(null)
  const [pack, setPack] = useState(() => typeWordCloudCells())

  useLayoutEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    let cancelled = false
    const run = async () => {
      try {
        await document.fonts.ready
      } catch {
        /* ignore */
      }
      if (cancelled) return
      const family = getComputedStyle(stage).fontFamily || 'sans-serif'
      setPack(typeWordCloudCells(TYPE_WORD_CLOUD_ENTRIES, measureBounds(family)))
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [])

  useTypeWordCloudScrub(stageRef, wrapperRef, fieldRef, {
    mouseFollow,
    pressInteraction,
    sliceDensity,
    sliceTravel,
    layout,
    cellCount: pack.cells.length,
  })

  const stageClass = [
    'theme-word-cloud',
    layout === 'ref' ? 'theme-word-cloud--ref-layout' : 'theme-word-cloud--flat-layout',
    mouseFollow ? 'theme-word-cloud--scrub' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const wrapperClass = [
    'theme-word-cloud__wrapper',
    layout === 'ref' ? 'theme-word-cloud__wrapper--ref' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const stageStyle = {
    '--wc-layout-w': pack.bounds.w,
    '--wc-layout-h': pack.bounds.h,
  } as CSSProperties

  return (
    <div
      ref={stageRef}
      className={stageClass}
      style={stageStyle}
      aria-label="Word cloud — move pointer to scrub · press to scoop"
    >
      <div ref={wrapperRef} className={wrapperClass}>
        <div ref={fieldRef} className="theme-word-cloud__field">
          {pack.cells.map((cell) => (
            <Word key={cell.id} cell={cell} bounds={pack.bounds} />
          ))}
        </div>
      </div>
    </div>
  )
}

function Word({
  cell,
  bounds,
}: {
  cell: TypeWordCloudCell
  bounds: { w: number; h: number }
}) {
  const style = {
    '--wc-x': `${((cell.x + bounds.w / 2) / bounds.w) * 100}%`,
    '--wc-y': `${((cell.y + bounds.h / 2) / bounds.h) * 100}%`,
    '--wc-rot': `${cell.rotateDeg}deg`,
    '--wc-fs': `${cell.fontPx}px`,
  } as CSSProperties

  return (
    <span
      className="theme-word-cloud__word"
      style={style}
      data-weight={cell.weight >= 100 ? 'hero' : undefined}
    >
      {cell.word}
    </span>
  )
}

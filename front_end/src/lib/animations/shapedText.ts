/** Character positions along shaped paths — ShapedText.tsx */

export type ShapedTextLayout =
  | 'circle'
  | 'ellipse'
  | 'semicircle'
  | 'smile'
  | 'arch'
  | 'wave'
  | 'zigzag'
  | 'spiral'
  | 'scurve'
  | 'square'

export type ShapedTextTrigger = 'hover' | 'enter'

export type ShapedTextMotion = 'rise' | 'expand' | 'scatter'

export type ShapedTextPoint = {
  x: number
  y: number
  rotation: number
  scale?: number
}

export type ShapedTextLayoutResult = {
  flat: ShapedTextPoint[]
  shaped: ShapedTextPoint[]
  scatter: ShapedTextPoint[]
  charWidths: number[]
  fontSize: number
  fitScale: number
}

export type ShapedTextStageBox = {
  width: number
  height: number
  cx: number
  cy: number
}

export const SHAPED_TEXT_LAYOUT_OPTIONS = [
  { value: 'circle', label: 'Circle' },
  { value: 'ellipse', label: 'Ellipse' },
  { value: 'semicircle', label: 'Semicircle' },
  { value: 'smile', label: 'Smile arc' },
  { value: 'arch', label: 'Arch' },
  { value: 'wave', label: 'Wave' },
  { value: 'zigzag', label: 'Zigzag' },
  { value: 'spiral', label: 'Spiral' },
  { value: 'scurve', label: 'S-curve' },
  { value: 'square', label: 'Square border' },
] as const satisfies ReadonlyArray<{ value: ShapedTextLayout; label: string }>

export const SHAPED_TEXT_MOTION_OPTIONS = [
  { value: 'rise', label: 'Rise in / settle out' },
  { value: 'expand', label: 'Expand in / contract out' },
  { value: 'scatter', label: 'Scatter in / pull out' },
] as const satisfies ReadonlyArray<{ value: ShapedTextMotion; label: string }>

/** Tracking between glyph centers — em relative to font size. */
export const SHAPED_TEXT_TRACKING_EM = 0.055

export function shapedTextDisplayUnits(text: string): string[] {
  return [...text.replace(/\s/g, '\u00a0')]
}

export function shapedTextStageBox(width: number, height: number): ShapedTextStageBox {
  const insetX = Math.max(20, width * 0.1)
  const insetY = Math.max(16, height * 0.14)
  const innerW = Math.max(1, width - insetX * 2)
  const innerH = Math.max(1, height - insetY * 2)

  return {
    width: innerW,
    height: innerH,
    cx: insetX + innerW / 2,
    cy: insetY + innerH / 2,
  }
}

export function shapedTextFontFromElement(element: HTMLElement): string {
  const style = getComputedStyle(element)
  return `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
}

export function shapedTextMeasureWidths(units: string[], font: string): number[] {
  if (typeof document === 'undefined') {
    return units.map(() => 10)
  }

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return units.map(() => 10)
  }

  ctx.font = font
  return units.map((unit) => ctx.measureText(unit).width)
}

function trackingPx(fontSize: number): number {
  return fontSize * SHAPED_TEXT_TRACKING_EM
}

function textSpan(charWidths: number[], fontSize: number): number {
  if (charWidths.length === 0) return 0
  const gap = trackingPx(fontSize)
  return charWidths.reduce((sum, width) => sum + width, 0) + gap * Math.max(charWidths.length - 1, 0)
}

function glyphExtents(charWidth: number, fontSize: number, rotationDeg: number) {
  const rad = (rotationDeg * Math.PI) / 180
  const halfW = charWidth / 2
  const halfH = fontSize * 0.52
  const cos = Math.abs(Math.cos(rad))
  const sin = Math.abs(Math.sin(rad))
  return {
    halfW: halfW * cos + halfH * sin,
    halfH: halfW * sin + halfH * cos,
  }
}

/** Scale + center layout so rotated glyphs stay inside the stage. */
export function shapedTextFitLayout(
  points: ShapedTextPoint[],
  charWidths: number[],
  fontSize: number,
  width: number,
  height: number,
): { points: ShapedTextPoint[]; fitScale: number } {
  if (points.length === 0) {
    return { points, fitScale: 1 }
  }

  const pad = fontSize * 0.62
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  points.forEach((point, index) => {
    const charWidth = charWidths[index] ?? fontSize * 0.45
    const { halfW, halfH } = glyphExtents(charWidth, fontSize, point.rotation)
    minX = Math.min(minX, point.x - halfW)
    maxX = Math.max(maxX, point.x + halfW)
    minY = Math.min(minY, point.y - halfH)
    maxY = Math.max(maxY, point.y + halfH)
  })

  const boundsW = Math.max(maxX - minX, 1)
  const boundsH = Math.max(maxY - minY, 1)
  const availW = Math.max(width - pad * 2, 1)
  const availH = Math.max(height - pad * 2, 1)
  const fitScale = Math.min(1, availW / boundsW, availH / boundsH)
  const boundsCx = (minX + maxX) / 2
  const boundsCy = (minY + maxY) / 2
  const stageCx = width / 2
  const stageCy = height / 2

  return {
    fitScale,
    points: points.map((point) => ({
      ...point,
      x: stageCx + (point.x - boundsCx) * fitScale,
      y: stageCy + (point.y - boundsCy) * fitScale,
    })),
  }
}

function tangentDegrees(x0: number, y0: number, x1: number, y1: number): number {
  return (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI
}

function offsetAlongTangent(
  point: ShapedTextPoint,
  next: ShapedTextPoint,
  distance: number,
): { x: number; y: number } {
  const dx = next.x - point.x
  const dy = next.y - point.y
  const len = Math.hypot(dx, dy) || 1
  return {
    x: point.x - (dx / len) * distance,
    y: point.y - (dy / len) * distance,
  }
}

/** Slide start position — ref.text-shaped-2 chs stagger along path tangent. */
export function shapedTextSlideFrom(
  point: ShapedTextPoint,
  next: ShapedTextPoint,
  distance = 14,
): { x: number; y: number; rotation: number } {
  const offset = offsetAlongTangent(point, next, distance)
  return { x: offset.x, y: offset.y, rotation: point.rotation }
}

function centersAlongSpan(charWidths: number[], fontSize: number, span: number): number[] {
  if (charWidths.length === 0) return []
  if (charWidths.length === 1) return [span / 2]

  const total = textSpan(charWidths, fontSize)
  const gap = trackingPx(fontSize)
  let cursor = 0

  return charWidths.map((width) => {
    const center = cursor + width / 2
    cursor += width + gap
    return (center / total) * span
  })
}

function arcPoints(
  charWidths: number[],
  fontSize: number,
  box: ShapedTextStageBox,
  radiusX: number,
  radiusY: number,
  centerAngle: number,
  maxSpan: number,
  yOffset = 0,
): ShapedTextPoint[] {
  const span = textSpan(charWidths, fontSize)
  const minRadius = span / Math.max(maxSpan, 0.2)
  const fitRadiusX = Math.max(radiusX, minRadius)
  const fitRadiusY = Math.max(radiusY, minRadius * (radiusY / Math.max(radiusX, 1)))
  const angleSpan = Math.min(maxSpan, span / Math.max(fitRadiusX, 1))
  const startAngle = centerAngle - angleSpan / 2
  const centers = centersAlongSpan(charWidths, fontSize, angleSpan)

  return centers.map((arcOffset, index) => {
    const angle = startAngle + arcOffset
    const x = box.cx + Math.cos(angle) * fitRadiusX
    const y = box.cy + yOffset + Math.sin(angle) * fitRadiusY
    const nextAngle =
      index < centers.length - 1
        ? startAngle + centers[index + 1]
        : angle + (angleSpan / Math.max(charWidths.length - 1, 1)) * 0.5
    const nextX = box.cx + Math.cos(nextAngle) * fitRadiusX
    const nextY = box.cy + yOffset + Math.sin(nextAngle) * fitRadiusY
    return { x, y, rotation: tangentDegrees(x, y, nextX, nextY) }
  })
}

function pointOnSquarePerimeter(
  dist: number,
  left: number,
  right: number,
  top: number,
  bottom: number,
  sideLen: number,
): { x: number; y: number } {
  const perimeter = sideLen * 4
  const p = ((dist % perimeter) + perimeter) % perimeter

  if (p < sideLen) {
    return { x: left + p, y: top }
  }
  if (p < sideLen * 2) {
    return { x: right, y: top + (p - sideLen) }
  }
  if (p < sideLen * 3) {
    return { x: right - (p - sideLen * 2), y: bottom }
  }
  return { x: left, y: bottom - (p - sideLen * 3) }
}

/** Square perimeter — top center, clockwise; card border / frame labels. */
function squarePerimeterPoints(
  charWidths: number[],
  fontSize: number,
  box: ShapedTextStageBox,
): ShapedTextPoint[] {
  const span = textSpan(charWidths, fontSize)
  const pad = fontSize * 0.55
  const maxHalf = Math.max(Math.min(box.width, box.height) / 2 - pad, fontSize)
  const minHalf = span / 7.6
  const half = Math.min(maxHalf, Math.max(maxHalf * 0.86, minHalf))

  const left = box.cx - half
  const right = box.cx + half
  const top = box.cy - half
  const bottom = box.cy + half
  const sideLen = half * 2
  const perimeter = sideLen * 4
  const startAt = sideLen / 2
  const centers = centersAlongSpan(charWidths, fontSize, perimeter)

  return centers.map((arcOffset, index) => {
    const dist = startAt + arcOffset
    const distNext =
      startAt + (centers[Math.min(index + 1, centers.length - 1)] ?? arcOffset + perimeter * 0.04)
    const point = pointOnSquarePerimeter(dist, left, right, top, bottom, sideLen)
    const next = pointOnSquarePerimeter(distNext, left, right, top, bottom, sideLen)
    return {
      x: point.x,
      y: point.y,
      rotation: tangentDegrees(point.x, point.y, next.x, next.y),
    }
  })
}

function polylinePoints(
  charWidths: number[],
  fontSize: number,
  box: ShapedTextStageBox,
  yAt: (t: number) => number,
  rotationScale = 1,
  padRatio = 0.06,
): ShapedTextPoint[] {
  const padX = box.width * padRatio
  const usable = box.width - padX * 2
  const centers = centersAlongSpan(charWidths, fontSize, usable)

  return centers.map((offset, index) => {
    const x = box.cx - usable / 2 + offset
    const y = yAt(offset / usable)
    const nextOffset = centers[Math.min(index + 1, centers.length - 1)] ?? offset + usable * 0.04
    const xNext = box.cx - usable / 2 + nextOffset
    const yNext = yAt(nextOffset / usable)
    return {
      x,
      y,
      rotation: tangentDegrees(x, y, xNext, yNext) * rotationScale,
    }
  })
}

/** Resting baseline before characters animate into the shaped layout. */
export function shapedTextFlatLayout(
  charWidths: number[],
  width: number,
  height: number,
  fontSize: number,
): ShapedTextPoint[] {
  if (charWidths.length === 0) return []

  const box = shapedTextStageBox(width, height)
  const gap = trackingPx(fontSize)
  const total = textSpan(charWidths, fontSize)
  const y = box.cy + box.height * 0.3
  let cursor = box.cx - total / 2

  return charWidths.map((charWidth) => {
    const x = cursor + charWidth / 2
    cursor += charWidth + gap
    return { x, y, rotation: 0, scale: 1 }
  })
}

/** Outward scatter targets for hover-out motion. */
export function shapedTextScatterLayout(
  charWidths: number[],
  width: number,
  height: number,
  _fontSize: number,
  originIndex?: number,
): ShapedTextPoint[] {
  if (charWidths.length === 0) return []

  const box = shapedTextStageBox(width, height)
  const mid = originIndex ?? Math.floor(charWidths.length / 2)

  return charWidths.map((_, index) => {
    const delta = index - mid
    const spread = delta / Math.max(charWidths.length - 1, 1)
    const angle = spread * Math.PI * 0.75 - Math.PI / 2
    const radius = box.width * (0.18 + Math.abs(spread) * 0.22)
    return {
      x: box.cx + Math.cos(angle) * radius,
      y: box.cy + Math.sin(angle) * radius * 0.55 + box.height * 0.1,
      rotation: spread * 18,
      scale: 0.78,
    }
  })
}

export function computeShapedTextLayout(
  charWidths: number[],
  layout: ShapedTextLayout,
  width: number,
  height: number,
  fontSize: number,
): ShapedTextPoint[] {
  if (charWidths.length === 0) return []

  const box = shapedTextStageBox(width, height)
  const span = textSpan(charWidths, fontSize)

  switch (layout) {
    case 'circle': {
      const minR = Math.min(box.width, box.height) * 0.3
      const radius = Math.max(minR, (span / (Math.PI * 2)) * 1.06)
      return arcPoints(charWidths, fontSize, box, radius, radius, -Math.PI / 2, Math.PI * 2)
    }

    case 'ellipse': {
      const rx = Math.max(box.width * 0.36, span / (Math.PI * 2) * 1.05)
      const ry = box.height * 0.32
      return arcPoints(charWidths, fontSize, box, rx, ry, -Math.PI / 2, Math.PI * 2)
    }

    case 'semicircle': {
      const radius = Math.max(box.width * 0.38, box.height * 0.36, span / Math.PI)
      return arcPoints(
        charWidths,
        fontSize,
        box,
        radius,
        radius * 0.92,
        -Math.PI / 2,
        Math.PI,
        box.height * 0.14,
      )
    }

    case 'smile':
      return arcPoints(
        charWidths,
        fontSize,
        box,
        Math.max(box.width * 0.36, span / Math.PI),
        box.height * 0.3,
        Math.PI / 2,
        Math.PI,
        -box.height * 0.06,
      )

    case 'arch':
      return arcPoints(
        charWidths,
        fontSize,
        box,
        Math.max(box.width * 0.34, span / (Math.PI * 0.82)),
        box.height * 0.36,
        -Math.PI / 2,
        Math.PI * 0.82,
        box.height * 0.16,
      )

    case 'wave':
      return polylinePoints(charWidths, fontSize, box, (t) => {
        const phase = t * Math.PI * 2 * 1.35
        return box.cy + Math.sin(phase) * box.height * 0.26
      })

    case 'zigzag':
      return polylinePoints(
        charWidths,
        fontSize,
        box,
        (t) => {
          const peaks = 3.5
          const tri = (t * peaks) % 1
          const amp = box.height * 0.26
          return box.cy + (tri < 0.5 ? 1 - tri * 2 : tri * 2 - 1) * amp
        },
        0.45,
      )

    case 'spiral': {
      const turns = 1.1
      const maxRadius = Math.min(box.width, box.height) * 0.38
      const centers = centersAlongSpan(charWidths, fontSize, 1)

      return centers.map((t, index) => {
        const angle = -Math.PI / 2 + t * Math.PI * 2 * turns
        const radius = maxRadius * (0.32 + t * 0.68)
        const x = box.cx + Math.cos(angle) * radius
        const y = box.cy + Math.sin(angle) * radius
        const tNext = centers[Math.min(index + 1, centers.length - 1)] ?? Math.min(t + 0.05, 1)
        const angleNext = -Math.PI / 2 + tNext * Math.PI * 2 * turns
        const radiusNext = maxRadius * (0.32 + tNext * 0.68)
        const xNext = box.cx + Math.cos(angleNext) * radiusNext
        const yNext = box.cy + Math.sin(angleNext) * radiusNext
        return { x, y, rotation: tangentDegrees(x, y, xNext, yNext) }
      })
    }

    case 'scurve':
      return polylinePoints(charWidths, fontSize, box, (t) => box.cy + Math.sin(t * Math.PI) * box.height * 0.3)

    case 'square':
      return squarePerimeterPoints(charWidths, fontSize, box)

    default:
      return shapedTextFlatLayout(charWidths, width, height, fontSize)
  }
}

function layoutBounds(
  points: ShapedTextPoint[],
  charWidths: number[],
  fontSize: number,
): { minX: number; maxX: number; minY: number; maxY: number } {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  points.forEach((point, index) => {
    const charWidth = charWidths[index] ?? fontSize * 0.45
    const { halfW, halfH } = glyphExtents(charWidth, fontSize, point.rotation)
    minX = Math.min(minX, point.x - halfW)
    maxX = Math.max(maxX, point.x + halfW)
    minY = Math.min(minY, point.y - halfH)
    maxY = Math.max(maxY, point.y + halfH)
  })

  if (!Number.isFinite(minX)) {
    return { minX: 0, maxX: 1, minY: 0, maxY: 1 }
  }

  return { minX, maxX, minY, maxY }
}

/** Fit flat, shaped, and scatter poses with one transform so motion never clips. */
export function resolveShapedTextLayout(
  charWidths: number[],
  layout: ShapedTextLayout,
  width: number,
  height: number,
  fontSize: number,
): ShapedTextLayoutResult {
  const flatRaw = shapedTextFlatLayout(charWidths, width, height, fontSize)
  const shapedRaw = computeShapedTextLayout(charWidths, layout, width, height, fontSize)
  const scatterRaw = shapedTextScatterLayout(charWidths, width, height, fontSize)

  const pad = fontSize * 0.62
  const combined = [...flatRaw, ...shapedRaw, ...scatterRaw]
  const { minX, maxX, minY, maxY } = layoutBounds(combined, charWidths, fontSize)
  const boundsW = Math.max(maxX - minX, 1)
  const boundsH = Math.max(maxY - minY, 1)
  const availW = Math.max(width - pad * 2, 1)
  const availH = Math.max(height - pad * 2, 1)
  const fitScale = Math.min(1, availW / boundsW, availH / boundsH)
  const boundsCx = (minX + maxX) / 2
  const boundsCy = (minY + maxY) / 2
  const stageCx = width / 2
  const stageCy = height / 2

  const applyFit = (points: ShapedTextPoint[]) =>
    points.map((point) => ({
      ...point,
      x: stageCx + (point.x - boundsCx) * fitScale,
      y: stageCy + (point.y - boundsCy) * fitScale,
    }))

  return {
    flat: applyFit(flatRaw),
    shaped: applyFit(shapedRaw),
    scatter: applyFit(scatterRaw),
    charWidths,
    fontSize,
    fitScale,
  }
}

export const SHAPED_TEXT_IN_DURATION = 0.62
export const SHAPED_TEXT_OUT_DURATION = 0.48
export const SHAPED_TEXT_STAGGER_IN = 0.042
export const SHAPED_TEXT_STAGGER_OUT = 0.032
export const SHAPED_TEXT_EASE_IN = 'expo.out'
export const SHAPED_TEXT_EASE_OUT = 'power2.in'
export const SHAPED_TEXT_SLIDE_PX = 14

/** @deprecated use SHAPED_TEXT_IN_DURATION */
export const SHAPED_TEXT_DURATION = SHAPED_TEXT_IN_DURATION
/** @deprecated use SHAPED_TEXT_STAGGER_IN */
export const SHAPED_TEXT_STAGGER = SHAPED_TEXT_STAGGER_IN
/** @deprecated use SHAPED_TEXT_EASE_IN */
export const SHAPED_TEXT_EASE = SHAPED_TEXT_EASE_IN

export function shapedTextStaggerFrom(layout: ShapedTextLayout): 'start' | 'center' | 'end' | 'edges' {
  if (layout === 'spiral' || layout === 'circle' || layout === 'ellipse') return 'center'
  if (layout === 'wave' || layout === 'scurve' || layout === 'zigzag' || layout === 'square') return 'start'
  return 'edges'
}

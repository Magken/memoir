export type MermaidViewBox = {
  x: number
  y: number
  width: number
  height: number
}

export const MERMAID_VIEW_ZOOM_MIN = 0.1
export const MERMAID_VIEW_ZOOM_MAX = 10
export const MERMAID_VIEW_ZOOM_STEP = 1.1
export const MERMAID_VIEW_WHEEL_DELTA_CAP = 120
export const MERMAID_VIEW_WHEEL_ZOOM_INTENSITY = 0.0016
export const MERMAID_FIT_VIEWPORT_FACTOR = 0.9

const MIN_VIEWBOX_SIZE = 1e-4
const MAX_VIEWBOX_SIZE = 1e8

export function isValidViewBox(viewBox: MermaidViewBox) {
  return (
    Number.isFinite(viewBox.x) &&
    Number.isFinite(viewBox.y) &&
    Number.isFinite(viewBox.width) &&
    Number.isFinite(viewBox.height) &&
    viewBox.width >= MIN_VIEWBOX_SIZE &&
    viewBox.height >= MIN_VIEWBOX_SIZE &&
    viewBox.width <= MAX_VIEWBOX_SIZE &&
    viewBox.height <= MAX_VIEWBOX_SIZE
  )
}

/** Scroll up (negative deltaY) zooms in; batched wheel deltas should be summed before calling. */
export function wheelZoomFactorFromDelta(deltaY: number) {
  if (!Number.isFinite(deltaY) || deltaY === 0) return 1
  const clamped = Math.sign(deltaY) * Math.min(Math.abs(deltaY), MERMAID_VIEW_WHEEL_DELTA_CAP)
  return Math.exp(-clamped * MERMAID_VIEW_WHEEL_ZOOM_INTENSITY)
}

export function readSvgViewBox(svgEl: SVGSVGElement): MermaidViewBox {
  const vb = svgEl.viewBox.baseVal
  if (vb.width > 0 && vb.height > 0) {
    return { x: vb.x, y: vb.y, width: vb.width, height: vb.height }
  }

  try {
    const bbox = svgEl.getBBox()
    return { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height }
  } catch {
    return { x: 0, y: 0, width: 1, height: 1 }
  }
}

export function applySvgViewBox(svgEl: SVGSVGElement, viewBox: MermaidViewBox) {
  svgEl.setAttribute(
    'viewBox',
    `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`,
  )
}

/** Fill the canvas host — pan/zoom is driven by viewBox, not CSS scale. */
export function prepareMermaidSvgForViewPort(svgEl: SVGSVGElement) {
  svgEl.setAttribute('width', '100%')
  svgEl.setAttribute('height', '100%')
  svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet')
  svgEl.style.width = '100%'
  svgEl.style.height = '100%'
  svgEl.style.maxWidth = 'none'
  svgEl.style.maxHeight = 'none'
  svgEl.style.display = 'block'
}

function mermaidDiagramMeasureTargets(svgEl: SVGSVGElement): SVGGraphicsElement[] {
  const targets: SVGGraphicsElement[] = []
  const seen = new Set<SVGGraphicsElement>()

  const push = (el: Element | null | undefined) => {
    if (!(el instanceof SVGGraphicsElement) || seen.has(el)) return
    seen.add(el)
    targets.push(el)
  }

  push(svgEl.querySelector('g.root'))
  push(svgEl.querySelector('[id^="graph-"]'))
  for (const child of svgEl.children) {
    if (child instanceof SVGGraphicsElement && child.tagName.toLowerCase() === 'g') {
      push(child)
    }
  }

  if (targets.length === 0) targets.push(svgEl)
  return targets
}

export function measureMermaidDiagramUserBounds(svgEl: SVGSVGElement): MermaidViewBox | null {
  const targets = mermaidDiagramMeasureTargets(svgEl)

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const el of targets) {
    try {
      const bbox = el.getBBox()
      if (bbox.width <= 0 || bbox.height <= 0) continue
      minX = Math.min(minX, bbox.x)
      minY = Math.min(minY, bbox.y)
      maxX = Math.max(maxX, bbox.x + bbox.width)
      maxY = Math.max(maxY, bbox.y + bbox.height)
    } catch {
      // not measurable yet
    }
  }

  if (!Number.isFinite(minX)) return null

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

export function viewBoxZoomRatio(base: MermaidViewBox, current: MermaidViewBox) {
  if (!base.width || !current.width || !Number.isFinite(current.width)) return 1
  const ratio = base.width / current.width
  if (!Number.isFinite(ratio) || ratio <= 0) return 1
  return ratio
}

export function viewBoxZoomPercent(base: MermaidViewBox, current: MermaidViewBox) {
  const ratio = viewBoxZoomRatio(base, current)
  const percent = Math.round(ratio * 100)
  return Math.min(
    MERMAID_VIEW_ZOOM_MAX * 100,
    Math.max(MERMAID_VIEW_ZOOM_MIN * 100, percent),
  )
}

export function viewBoxAtZoomRatio(
  base: MermaidViewBox,
  current: MermaidViewBox,
  zoomRatio: number,
  focalX = 0.5,
  focalY = 0.5,
): MermaidViewBox {
  const safeRatio = Math.min(
    MERMAID_VIEW_ZOOM_MAX,
    Math.max(MERMAID_VIEW_ZOOM_MIN, zoomRatio),
  )
  const width = base.width / safeRatio
  const height = base.height / safeRatio
  const focalPointX = current.x + current.width * focalX
  const focalPointY = current.y + current.height * focalY

  const next = {
    x: focalPointX - width * focalX,
    y: focalPointY - height * focalY,
    width,
    height,
  }

  return isValidViewBox(next) ? next : current
}

export function limitViewBoxZoom(
  base: MermaidViewBox,
  next: MermaidViewBox,
  focalX = 0.5,
  focalY = 0.5,
): MermaidViewBox {
  if (!isValidViewBox(base)) return next

  const zoom = viewBoxZoomRatio(base, next)
  if (!Number.isFinite(zoom) || zoom <= 0 || !isValidViewBox(next)) {
    const fallbackRatio =
      !Number.isFinite(zoom) || zoom > MERMAID_VIEW_ZOOM_MAX
        ? MERMAID_VIEW_ZOOM_MAX
        : MERMAID_VIEW_ZOOM_MIN
    return viewBoxAtZoomRatio(base, base, fallbackRatio, focalX, focalY)
  }

  const clamped = Math.min(MERMAID_VIEW_ZOOM_MAX, Math.max(MERMAID_VIEW_ZOOM_MIN, zoom))
  if (Math.abs(clamped - zoom) < 0.0001) return next
  return viewBoxAtZoomRatio(base, next, clamped, focalX, focalY)
}

export function zoomViewBoxAt(
  current: MermaidViewBox,
  factor: number,
  focalX: number,
  focalY: number,
): MermaidViewBox {
  if (factor <= 0 || !Number.isFinite(factor) || !isValidViewBox(current)) return current

  const focalPointX = current.x + current.width * focalX
  const focalPointY = current.y + current.height * focalY
  const width = current.width / factor
  const height = current.height / factor

  const next = {
    x: focalPointX - width * focalX,
    y: focalPointY - height * focalY,
    width,
    height,
  }

  return isValidViewBox(next) ? next : current
}

export function panViewBoxByPixels(
  current: MermaidViewBox,
  hostWidth: number,
  hostHeight: number,
  deltaXPx: number,
  deltaYPx: number,
): MermaidViewBox {
  if (!hostWidth || !hostHeight) return current

  return {
    ...current,
    x: current.x - (deltaXPx * current.width) / hostWidth,
    y: current.y - (deltaYPx * current.height) / hostHeight,
  }
}

export function fitViewBoxToDiagram(
  svgEl: SVGSVGElement,
  hostWidth: number,
  hostHeight: number,
  viewportFactor = MERMAID_FIT_VIEWPORT_FACTOR,
): MermaidViewBox {
  const bounds = measureMermaidDiagramUserBounds(svgEl) ?? readSvgViewBox(svgEl)
  const pad = (1 - viewportFactor) / 2

  let x = bounds.x - bounds.width * pad
  let y = bounds.y - bounds.height * pad
  let width = bounds.width * (1 + pad * 2)
  let height = bounds.height * (1 + pad * 2)

  if (hostWidth > 0 && hostHeight > 0) {
    const hostAspect = hostWidth / hostHeight
    const boxAspect = width / height
    if (boxAspect > hostAspect) {
      const nextHeight = width / hostAspect
      y -= (nextHeight - height) / 2
      height = nextHeight
    } else {
      const nextWidth = height * hostAspect
      x -= (nextWidth - width) / 2
      width = nextWidth
    }
  }

  return { x, y, width, height }
}

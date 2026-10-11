export type ForceViewBox = {
  x: number
  y: number
  width: number
  height: number
}

export const FORCE_VIEW_ZOOM_MIN = 0.1
export const FORCE_VIEW_ZOOM_MAX = 10
export const FORCE_VIEW_ZOOM_STEP = 1.1
export const FORCE_VIEW_WHEEL_DELTA_CAP = 120
export const FORCE_VIEW_WHEEL_ZOOM_INTENSITY = 0.0016
export const FORCE_FIT_VIEWPORT_FACTOR = 0.9

const MIN_VIEWBOX_SIZE = 1e-4
const MAX_VIEWBOX_SIZE = 1e8

export function isValidViewBox(viewBox: ForceViewBox) {
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

export function wheelZoomFactorFromDelta(deltaY: number) {
  if (!Number.isFinite(deltaY) || deltaY === 0) return 1
  const clamped = Math.sign(deltaY) * Math.min(Math.abs(deltaY), FORCE_VIEW_WHEEL_DELTA_CAP)
  return Math.exp(-clamped * FORCE_VIEW_WHEEL_ZOOM_INTENSITY)
}

export function applySvgViewBox(svgEl: SVGSVGElement, viewBox: ForceViewBox) {
  svgEl.setAttribute('viewBox', `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`)
}

export function readSvgViewBox(svgEl: SVGSVGElement): ForceViewBox {
  const vb = svgEl.viewBox.baseVal
  if (vb.width > 0 && vb.height > 0) {
    return { x: vb.x, y: vb.y, width: vb.width, height: vb.height }
  }
  try {
    const bbox = svgEl.getBBox()
    if (bbox.width > 0 && bbox.height > 0) {
      return { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height }
    }
  } catch {
    // not measurable
  }
  return { x: 0, y: 0, width: 800, height: 600 }
}

export function prepareForceSvgForViewPort(svgEl: SVGSVGElement) {
  svgEl.setAttribute('width', '100%')
  svgEl.setAttribute('height', '100%')
  svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet')
  svgEl.style.width = '100%'
  svgEl.style.height = '100%'
  svgEl.style.maxWidth = 'none'
  svgEl.style.maxHeight = 'none'
  svgEl.style.display = 'block'
}

export function viewBoxZoomRatio(base: ForceViewBox, current: ForceViewBox) {
  if (!base.width || !current.width || !Number.isFinite(current.width)) return 1
  const ratio = base.width / current.width
  if (!Number.isFinite(ratio) || ratio <= 0) return 1
  return ratio
}

export function viewBoxZoomPercent(base: ForceViewBox, current: ForceViewBox) {
  const ratio = viewBoxZoomRatio(base, current)
  const percent = Math.round(ratio * 100)
  return Math.min(FORCE_VIEW_ZOOM_MAX * 100, Math.max(FORCE_VIEW_ZOOM_MIN * 100, percent))
}

export function forceZoomPercent(zoom: number) {
  return Math.round(Math.min(FORCE_VIEW_ZOOM_MAX, Math.max(FORCE_VIEW_ZOOM_MIN, zoom)) * 100)
}

export function viewBoxAtZoomRatio(
  base: ForceViewBox,
  current: ForceViewBox,
  zoomRatio: number,
  focalX = 0.5,
  focalY = 0.5,
): ForceViewBox {
  const safeRatio = Math.min(FORCE_VIEW_ZOOM_MAX, Math.max(FORCE_VIEW_ZOOM_MIN, zoomRatio))
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
  base: ForceViewBox,
  next: ForceViewBox,
  focalX = 0.5,
  focalY = 0.5,
): ForceViewBox {
  if (!isValidViewBox(base)) return next
  const zoom = viewBoxZoomRatio(base, next)
  if (!Number.isFinite(zoom) || zoom <= 0 || !isValidViewBox(next)) {
    const fallbackRatio =
      !Number.isFinite(zoom) || zoom > FORCE_VIEW_ZOOM_MAX
        ? FORCE_VIEW_ZOOM_MAX
        : FORCE_VIEW_ZOOM_MIN
    return viewBoxAtZoomRatio(base, base, fallbackRatio, focalX, focalY)
  }
  const clamped = Math.min(FORCE_VIEW_ZOOM_MAX, Math.max(FORCE_VIEW_ZOOM_MIN, zoom))
  if (Math.abs(clamped - zoom) < 0.0001) return next
  return viewBoxAtZoomRatio(base, next, clamped, focalX, focalY)
}

export function zoomViewBoxAt(
  current: ForceViewBox,
  factor: number,
  focalX: number,
  focalY: number,
): ForceViewBox {
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
  current: ForceViewBox,
  hostWidth: number,
  hostHeight: number,
  deltaXPx: number,
  deltaYPx: number,
): ForceViewBox {
  if (!hostWidth || !hostHeight) return current
  return {
    ...current,
    x: current.x - (deltaXPx * current.width) / hostWidth,
    y: current.y - (deltaYPx * current.height) / hostHeight,
  }
}

export function measureForceGraphBounds(
  nodes: Array<{ x?: number; y?: number }>,
  pad = 40,
): ForceViewBox {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const node of nodes) {
    if (node.x == null || node.y == null) continue
    minX = Math.min(minX, node.x)
    minY = Math.min(minY, node.y)
    maxX = Math.max(maxX, node.x)
    maxY = Math.max(maxY, node.y)
  }
  if (!Number.isFinite(minX)) {
    return { x: -200, y: -150, width: 400, height: 300 }
  }
  return {
    x: minX - pad,
    y: minY - pad,
    width: Math.max(maxX - minX + pad * 2, 80),
    height: Math.max(maxY - minY + pad * 2, 80),
  }
}

export function fitViewBoxToBounds(
  bounds: ForceViewBox,
  hostWidth: number,
  hostHeight: number,
  viewportFactor = FORCE_FIT_VIEWPORT_FACTOR,
): ForceViewBox {
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

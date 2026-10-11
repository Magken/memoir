export type RoundedScrollAxis = 'vertical' | 'horizontal'

export type RoundedScrollConfig = {
  radius: number
  scrollPadding: number
  stroke: number
  inset: number
  trail: number
  thumb: number
  finish: number
  offsetCorner: number
  offsetEnd: number
  /** Vertical path span as fraction of bar height — raw default 0.89; cards use cardScrollConfig `1` */
  trackFill: number
}

/** Vertical default — shortens tall side rails so bottom stroke is not clipped. */
const TRACK_HEIGHT_FILL_DEFAULT = 0.89
/** Horizontal drawable span — full width inside bar box. */
const TRACK_WIDTH_FILL = 1

/** Reference defaults (craft-of-ui curved scroller). */
export const ROUNDED_SCROLL_DEFAULTS: RoundedScrollConfig = {
  radius: 22,
  scrollPadding: 48,
  stroke: 3,
  inset: 4,
  trail: 14,
  thumb: 52,
  finish: 5,
  offsetCorner: -50,
  offsetEnd: 30,
  trackFill: TRACK_HEIGHT_FILL_DEFAULT,
}

export type RoundedScrollKeyframe = [progress: number, strokeDashoffset: number]

export type RoundedScrollSyncResult = {
  keyframes: RoundedScrollKeyframe[]
  keyframesCss: string
  trackLength: number
  cornerLength: number
}

function buildTrackPaths(
  span: number,
  config: RoundedScrollConfig,
  fill: number,
  axis: RoundedScrollAxis,
): { cornerPath: string; trackPath: string } {
  const pad = config.inset + config.stroke * 0.5
  const fullSpan = Math.max(0, span - pad * 2)
  const end = pad + fullSpan * fill
  const mid = config.radius
  const innerRad = Math.max(0, config.radius - pad)
  const trackSide = config.radius * 2 - pad
  /* Horizontal mirrors vertical — opposite sweep keeps corners concave toward track */
  const sweep = axis === 'horizontal' ? 0 : 1

  if (axis === 'vertical') {
    const cornerPath = `
  M${mid - config.trail},${pad}
    ${innerRad === 0 ? '' : `L${mid},${pad}`}
    ${
      innerRad === 0
        ? `L${trackSide},${pad}`
        : `a${innerRad},${innerRad} 0 0 ${sweep} ${innerRad} ${innerRad}`
    }`

    const trackPath = `
    M${mid - config.trail},${pad}
    ${innerRad === 0 ? '' : `L${mid},${pad}`}
    ${
      innerRad === 0
        ? `L${trackSide},${pad}`
        : `a${innerRad},${innerRad} 0 0 ${sweep} ${innerRad} ${innerRad}`
    }
    L${trackSide},${end - innerRad}
    ${
      innerRad === 0
        ? `L${trackSide},${end}`
        : `a${innerRad},${innerRad} 0 0 ${sweep} ${-innerRad} ${innerRad}`
    }
    L${mid - config.trail},${end}
  `

    return { cornerPath, trackPath }
  }

  const cornerPath = `
  M${pad},${mid - config.trail}
    ${innerRad === 0 ? '' : `L${pad},${mid}`}
    ${
      innerRad === 0
        ? `L${pad},${trackSide}`
        : `a${innerRad},${innerRad} 0 0 ${sweep} ${innerRad} ${innerRad}`
    }`

  const trackPath = `
    M${pad},${mid - config.trail}
    ${innerRad === 0 ? '' : `L${pad},${mid}`}
    ${
      innerRad === 0
        ? `L${pad},${trackSide}`
        : `a${innerRad},${innerRad} 0 0 ${sweep} ${innerRad} ${innerRad}`
    }
    L${end - innerRad},${trackSide}
    ${
      innerRad === 0
        ? `L${end},${trackSide}`
        : `a${innerRad},${innerRad} 0 0 ${sweep} ${innerRad} ${-innerRad}`
    }
    L${end},${mid - config.trail}
  `

  return { cornerPath, trackPath }
}

/** Room inside the CSS bar box for round stroke caps (`.theme-rounded-scroll` has `overflow: hidden`). */
function strokeCapReserve(config: RoundedScrollConfig): number {
  return config.stroke * 0.5 + config.finish
}

/** Path start/end inset inside the viewBox (`buildTrackPaths` pad). */
function pathEdgePad(config: RoundedScrollConfig): number {
  return config.inset + config.stroke * 0.5
}

/** Extra bottom-only inset for compact full-fill rails (does not change top path start). */
function verticalBottomExtra(config: RoundedScrollConfig): number {
  return pathEdgePad(config) + Math.max(2, Math.round(config.trail * 0.35))
}

/** Extra inline-end inset for horizontal rails (mirror verticalBottomExtra on path end). */
function horizontalEndExtra(config: RoundedScrollConfig): number {
  return pathEdgePad(config) + Math.max(2, Math.round(config.trail * 0.35))
}

/** Vertical drawable length — reserve stroke cap + top path pad + extra bottom inset. */
function verticalPathSpan(boxSpan: number, config: RoundedScrollConfig, minSpan: number): number {
  if (config.trackFill >= 1) {
    const pad = pathEdgePad(config)
    return Math.max(
      minSpan,
      boxSpan - strokeCapReserve(config) - pad * 2 - verticalBottomExtra(config),
    )
  }
  return Math.max(minSpan, boxSpan)
}

/** Horizontal drawable length — reserve stroke caps + corner bulge at path ends. */
function horizontalPathSpan(boxSpan: number, config: RoundedScrollConfig, minSpan: number): number {
  return Math.max(minSpan, boxSpan - strokeCapReserve(config) * 2 - horizontalEndExtra(config))
}

type BarBoxMetrics = {
  /** CSS `.theme-rounded-scroll__bar` span (viewBox size). */
  boxSpan: number
  /** Drawable axis length passed to `buildTrackPaths` — shorter when `trackFill` is full. */
  pathSpan: number
  viewWidth: number
  viewHeight: number
}

/** Align viewBox + path span with the laid-out SVG bar box (cards + menu dropdown). */
function resolveBarBoxMetrics(
  axis: RoundedScrollAxis,
  barEl: SVGSVGElement,
  scrollerEl: HTMLElement,
  viewportEl: HTMLElement,
  config: RoundedScrollConfig,
): BarBoxMetrics {
  const barRect = barEl.getBoundingClientRect()
  const minSpan = config.radius * 4

  if (axis === 'horizontal') {
    let boxSpan = Math.round(barRect.width)
    if (boxSpan < minSpan) {
      boxSpan = scrollerEl.clientWidth || viewportEl.clientWidth
    }
    const pathSpan = horizontalPathSpan(boxSpan, config, minSpan)
    const boxHeight = Math.round(barRect.height) || config.radius * 2
    return {
      boxSpan,
      pathSpan,
      viewWidth: boxSpan,
      viewHeight: boxHeight,
    }
  }

  let boxSpan = Math.round(barRect.height)
  if (boxSpan < minSpan) {
    boxSpan = viewportEl.clientHeight
  }
  const pathSpan = verticalPathSpan(boxSpan, config, minSpan)
  return {
    boxSpan,
    pathSpan,
    viewWidth: config.radius * 2,
    viewHeight: boxSpan,
  }
}

const SCROLL_OVERFLOW_EPSILON_PX = 2
/** Hide start/end clouds within this fraction of scroll range (0.1 = top/bottom 10%). */
const SCROLL_CLOUD_EDGE_LEEWAY = 0.1
/** Keep start/end padding keyframes ordered — never above 49% scroll. */
const SCROLL_PAD_PROGRESS_MAX = 49

function readScrollRange(viewportEl: HTMLElement, axis: RoundedScrollAxis): number {
  if (axis === 'horizontal') {
    return Math.max(0, viewportEl.scrollWidth - viewportEl.clientWidth)
  }
  return Math.max(0, viewportEl.scrollHeight - viewportEl.clientHeight)
}

/** Scroll-padding segment as keyframe % — clamped so `100 - pad` stays after `pad`. */
export function computeScrollPadProgress(scrollPadding: number, scrollRange: number): number {
  if (scrollRange <= SCROLL_OVERFLOW_EPSILON_PX) return 0
  const raw = Math.floor((scrollPadding / scrollRange) * 100)
  return Math.min(SCROLL_PAD_PROGRESS_MAX, Math.max(0, raw))
}

type RoundedScrollStrokeOffsets = {
  offsetStart: number
  offsetPad: number
  offsetMidEnd: number
  offsetEnd: number
}

/** Monotonic stroke-dash offsets — last segment never reverses (compact rails / short corners). */
function computeStrokeOffsets(
  config: RoundedScrollConfig,
  trackLength: number,
  cornerLength: number,
): RoundedScrollStrokeOffsets {
  const offsetStart = config.thumb - config.finish - config.offsetEnd
  const offsetPad = (cornerLength + config.offsetCorner) * -1
  const offsetMidEndRaw =
    (Math.floor(trackLength) - cornerLength - config.thumb - config.offsetCorner) * -1
  const offsetEndRaw = (Math.floor(trackLength) - config.finish - config.offsetEnd) * -1
  const offsetEnd = Math.min(offsetMidEndRaw, offsetEndRaw)
  const offsetMidEnd = Math.max(offsetMidEndRaw, offsetEndRaw)
  return { offsetStart, offsetPad, offsetMidEnd, offsetEnd }
}

function buildRoundedScrollKeyframes(
  config: RoundedScrollConfig,
  trackLength: number,
  cornerLength: number,
  padProgress: number,
): RoundedScrollKeyframe[] {
  const { offsetStart, offsetPad, offsetMidEnd, offsetEnd } = computeStrokeOffsets(
    config,
    trackLength,
    cornerLength,
  )

  const keyframes: RoundedScrollKeyframe[] = [[0, offsetStart]]

  if (padProgress <= 0) {
    keyframes.push([100, offsetEnd])
    return keyframes
  }

  keyframes.push([padProgress, offsetPad])

  const midProgress = 100 - padProgress
  if (midProgress > padProgress) {
    keyframes.push([midProgress, offsetMidEnd])
  }

  keyframes.push([100, offsetEnd])
  return keyframes
}

function readCloudEdgeLeeway(scrollerEl: HTMLElement): number {
  const raw = getComputedStyle(scrollerEl)
    .getPropertyValue('--theme-scroll-cloud-edge-leeway')
    .trim()
  const legacy = getComputedStyle(scrollerEl)
    .getPropertyValue('--theme-rounded-scroll-cloud-edge-leeway')
    .trim()
  const value = raw || legacy
  const parsed = parseFloat(value)
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 0.5) return SCROLL_CLOUD_EDGE_LEEWAY
  return parsed
}

/** Sync curved SVG track/thumb paths + scroll keyframes (reference: craft-of-ui curved scroller). */
export function syncRoundedScrollBar({
  scrollerEl,
  viewportEl,
  barEl,
  thumbEl,
  trackEl,
  config,
  axis = 'vertical',
}: {
  scrollerEl: HTMLElement
  viewportEl: HTMLElement
  barEl: SVGSVGElement
  thumbEl: SVGPathElement
  trackEl: SVGPathElement
  config: RoundedScrollConfig
  axis?: RoundedScrollAxis
}): RoundedScrollSyncResult {
  const isHorizontal = axis === 'horizontal'
  const { pathSpan, viewWidth, viewHeight } = resolveBarBoxMetrics(
    axis,
    barEl,
    scrollerEl,
    viewportEl,
    config,
  )
  const barHeight = viewHeight
  const barWidth = viewWidth

  barEl.setAttribute('viewBox', `0 0 ${barWidth} ${barHeight}`)
  scrollerEl.style.setProperty('--theme-rounded-scroll-stroke-width', String(config.stroke))
  scrollerEl.style.setProperty('--theme-rounded-scroll-path-radius', String(config.radius))
  scrollerEl.style.setProperty('--theme-rounded-scroll-padding', String(config.scrollPadding))
  scrollerEl.style.setProperty('--theme-rounded-scroll-thumb-size', String(config.thumb))
  scrollerEl.dataset.roundedScrollAxis = axis

  const { cornerPath, trackPath } = isHorizontal
    ? buildTrackPaths(pathSpan, config, TRACK_WIDTH_FILL, 'horizontal')
    : buildTrackPaths(pathSpan, config, config.trackFill, 'vertical')

  thumbEl.setAttribute('d', cornerPath)
  const cornerLength = Math.ceil(thumbEl.getTotalLength())

  thumbEl.setAttribute('d', trackPath)
  trackEl.setAttribute('d', trackPath)

  const trackLength = Math.ceil(trackEl.getTotalLength())
  const scrollRange = readScrollRange(viewportEl, axis)
  const padProgress = computeScrollPadProgress(config.scrollPadding, scrollRange)

  const keyframes = buildRoundedScrollKeyframes(config, trackLength, cornerLength, padProgress)

  const keyframeName = isHorizontal ? 'theme-rounded-scroll-x' : 'theme-rounded-scroll-y'
  const keyframesCss = `@keyframes ${keyframeName} {
${keyframes.map(([pct, offset]) => `  ${pct}% { stroke-dashoffset: ${offset}; }`).join('\n')}
}`

  scrollerEl.style.setProperty('--theme-rounded-scroll-track-length', String(trackLength))
  scrollerEl.style.setProperty(
    '--theme-rounded-scroll-dash-gap',
    String(Math.ceil(trackLength) + config.thumb),
  )
  scrollerEl.style.setProperty('--theme-rounded-scroll-track-start', String(cornerLength))
  scrollerEl.style.setProperty(
    '--theme-rounded-scroll-start',
    String(config.thumb * 2 + cornerLength),
  )
  scrollerEl.style.setProperty(
    '--theme-rounded-scroll-destination',
    String(Math.ceil(trackLength) - cornerLength + config.thumb),
  )

  scrollerEl.dataset.roundedScrollOverflow = viewportHasScrollOverflow(viewportEl, axis)
    ? 'true'
    : 'false'
  scrollerEl.dataset.scrollOverflow = scrollerEl.dataset.roundedScrollOverflow

  return { keyframes, keyframesCss, trackLength, cornerLength }
}

/** Interpolate thumb offset for browsers without scroll-driven animations. */
export function roundedScrollOffsetAt(
  scrollProgress: number,
  keyframes: RoundedScrollKeyframe[],
): number {
  const pct = Math.max(0, Math.min(100, scrollProgress * 100))
  if (keyframes.length === 0) return 0
  if (keyframes.length === 1) return keyframes[0][1]

  const sorted = [...keyframes].sort((a, b) => a[0] - b[0])

  for (let index = 0; index < sorted.length - 1; index += 1) {
    const [startPct, startOffset] = sorted[index]
    const [endPct, endOffset] = sorted[index + 1]
    if (pct >= startPct && pct <= endPct) {
      const span = endPct - startPct || 1
      const t = (pct - startPct) / span
      return startOffset + (endOffset - startOffset) * t
    }
  }
  return sorted[sorted.length - 1][1]
}

export function supportsScrollTimeline(): boolean {
  return typeof CSS !== 'undefined' && CSS.supports('animation-timeline: scroll()')
}

/** Scroll progress 0–1; 0 when there is nothing to scroll. */
export function readRoundedScrollProgress(
  viewportEl: HTMLElement,
  axis: RoundedScrollAxis,
): number {
  const range = readScrollRange(viewportEl, axis)
  if (range <= SCROLL_OVERFLOW_EPSILON_PX) return 0
  if (axis === 'horizontal') {
    return Math.max(0, Math.min(1, Math.min(viewportEl.scrollLeft, range) / range))
  }
  return Math.max(0, Math.min(1, Math.min(viewportEl.scrollTop, range) / range))
}

/** True when viewport content exceeds the visible scrollport (1px tolerance for subpixels). */
export function viewportHasScrollOverflow(
  viewportEl: HTMLElement,
  axis: RoundedScrollAxis,
): boolean {
  return readScrollRange(viewportEl, axis) > SCROLL_OVERFLOW_EPSILON_PX
}

/** Sets `data-scroll-at-start` / `data-scroll-at-end` on the scroller for edge fade overlays. */
export function syncScrollEdgeState(
  scrollerEl: HTMLElement,
  viewportEl: HTMLElement,
  axis: RoundedScrollAxis,
): void {
  if (!viewportHasScrollOverflow(viewportEl, axis)) {
    scrollerEl.dataset.scrollAtStart = 'true'
    scrollerEl.dataset.scrollAtEnd = 'true'
    return
  }

  const progress = readRoundedScrollProgress(viewportEl, axis)
  const leeway = readCloudEdgeLeeway(scrollerEl)
  scrollerEl.dataset.scrollAtStart = progress <= leeway ? 'true' : 'false'
  scrollerEl.dataset.scrollAtEnd = progress >= 1 - leeway ? 'true' : 'false'
}

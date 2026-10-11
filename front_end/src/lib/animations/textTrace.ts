import { gsap } from '../gsap'

/** ref.text-trace-1 — gostroke enter draw */
export const TRACE_DRAW_DURATION = 1
export const TRACE_ENTER_DURATION = 3
export const TRACE_DRAW_EASE = 'power2.out'

export function measureStrokeLength(textEl: SVGTextElement): number {
  return Math.ceil(textEl.getComputedTextLength()) || 400
}

/** Measured dash length in px — reference uses `stroke-dasharray: 400px`. */
export function setStrokeDashLength(svg: SVGSVGElement, textEl: SVGTextElement): number {
  const len = measureStrokeLength(textEl)
  textEl.setAttribute('stroke-dasharray', `${len}px`)
  svg.style.setProperty('--type-trace-dash', `${len}px`)
  return len
}

/** Enter once — reference @keyframes gostroke (-dash → 0, opacity 0 → 1). */
export function playStrokeEnter(
  textEl: SVGTextElement,
  len: number,
  reverse = false,
): gsap.core.Timeline {
  const dash = `${len}px`
  const fromOffset = reverse ? '0px' : `-${dash}`
  const toOffset = reverse ? dash : '0px'

  textEl.setAttribute('stroke-dasharray', dash)
  gsap.set(textEl, { opacity: reverse ? 1 : 0, attr: { 'stroke-dashoffset': fromOffset } })

  const tl = gsap.timeline()
  tl.to(textEl, {
    opacity: reverse ? 0 : 1,
    attr: { 'stroke-dashoffset': toOffset },
    duration: reverse ? TRACE_DRAW_DURATION : TRACE_ENTER_DURATION,
    ease: TRACE_DRAW_EASE,
  })
  return tl
}

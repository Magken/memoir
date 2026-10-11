export { viewBoxZoomPercent } from './svgViewPort'

export type MermaidPan = {
  x: number
  y: number
}

export function mermaidZoomPercent(zoom: number) {
  return Math.round(zoom * 100)
}

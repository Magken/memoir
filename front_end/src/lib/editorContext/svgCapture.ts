/**
 * Shared SVG capture helpers — inline live computed paints so standalone
 * SVG/PNG downloads match the themed on-screen diagram (Draw-quality path).
 */
import { toPng } from 'html-to-image'
import { downloadBlob, downloadText } from './download'

const PAINT_PROPS = [
  'fill',
  'stroke',
  'stroke-width',
  'stroke-opacity',
  'fill-opacity',
  'opacity',
  'color',
  'font-size',
  'font-family',
  'font-weight',
  'letter-spacing',
  'paint-order',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-dasharray',
] as const

function isTransparent(value: string) {
  return !value || value === 'none' || value === 'transparent' || value === 'rgba(0, 0, 0, 0)'
}

function cssPropToAttr(prop: string) {
  return prop
}

/** Clone an in-DOM SVG with computed paints baked into attributes/styles. */
export function cloneSvgWithInlinedPaints(
  svgEl: SVGSVGElement,
  opts: { removeSelectors?: readonly string[] } = {},
): SVGSVGElement {
  const clone = svgEl.cloneNode(true) as SVGSVGElement
  if (!clone.getAttribute('xmlns')) {
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  }
  if (!clone.getAttribute('xmlns:xlink')) {
    clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink')
  }

  for (const sel of opts.removeSelectors ?? []) {
    clone.querySelectorAll(sel).forEach((node) => node.remove())
  }

  const liveNodes = [svgEl as Element, ...Array.from(svgEl.querySelectorAll('*'))]
  const cloneNodes = [clone as Element, ...Array.from(clone.querySelectorAll('*'))]

  for (let i = 0; i < liveNodes.length; i += 1) {
    const live = liveNodes[i]
    const target = cloneNodes[i]
    if (!live || !target || !(target instanceof Element)) continue
    const computed = getComputedStyle(live)
    for (const prop of PAINT_PROPS) {
      const value = computed.getPropertyValue(prop).trim()
      if (!value) continue
      const isSvgPaint =
        (prop === 'fill' || prop === 'stroke') &&
        target instanceof SVGElement &&
        !(target instanceof SVGForeignObjectElement)

      // Paths default to fill=black — bake `none` so stroked links don't become blobs.
      if (isSvgPaint && (value === 'none' || isTransparent(value))) {
        if (prop === 'fill') {
          target.setAttribute('fill', 'none')
          ;(target as SVGElement).style.setProperty('fill', 'none')
        }
        continue
      }
      if (isTransparent(value)) continue

      if (isSvgPaint) {
        target.setAttribute(cssPropToAttr(prop), value)
      }
      ;(target as HTMLElement | SVGElement).style?.setProperty(prop, value)
    }

    // Halos / dims: keep computed opacity (including 0) so hidden chrome stays hidden.
    const opacity = computed.opacity
    if (opacity !== '' && target instanceof SVGElement) {
      ;(target as SVGElement).style.setProperty('opacity', opacity)
    }
  }

  // Crop to content bounds — pan/zoom viewBox often leaves the graph in a corner.
  const pad = 24
  let box: { x: number; y: number; width: number; height: number } | null = null
  try {
    const bbox = svgEl.getBBox()
    if (bbox.width > 0 && bbox.height > 0) {
      box = {
        x: bbox.x - pad,
        y: bbox.y - pad,
        width: bbox.width + pad * 2,
        height: bbox.height + pad * 2,
      }
    }
  } catch {
    box = null
  }
  if (!box) {
    const rect = svgEl.getBoundingClientRect()
    const vb = svgEl.viewBox.baseVal
    box = {
      x: vb?.width > 0 ? vb.x : 0,
      y: vb?.height > 0 ? vb.y : 0,
      width: vb?.width > 0 ? vb.width : rect.width || 800,
      height: vb?.height > 0 ? vb.height : rect.height || 600,
    }
  }

  const width = Math.max(1, Math.round(box.width))
  const height = Math.max(1, Math.round(box.height))
  clone.setAttribute('viewBox', `${box.x} ${box.y} ${box.width} ${box.height}`)
  clone.setAttribute('width', String(width))
  clone.setAttribute('height', String(height))
  clone.style.width = `${width}px`
  clone.style.height = `${height}px`
  clone.style.background = resolveBackground(svgEl.parentElement ?? svgEl)
  clone.removeAttribute('class')

  return clone
}

export function serializeInlinedSvg(
  svgEl: SVGSVGElement,
  opts: { removeSelectors?: readonly string[] } = {},
): string {
  const clone = cloneSvgWithInlinedPaints(svgEl, opts)
  const xml = new XMLSerializer().serializeToString(clone)
  return xml.startsWith('<?xml') ? xml : `<?xml version="1.0" encoding="UTF-8"?>\n${xml}`
}

export function downloadInlinedSvg(
  svgEl: SVGSVGElement,
  filename: string,
  opts: { removeSelectors?: readonly string[] } = {},
) {
  const safe = filename.endsWith('.svg') ? filename : `${filename}.svg`
  downloadText(safe, serializeInlinedSvg(svgEl, opts), 'image/svg+xml;charset=utf-8')
}

function resolveBackground(el: Element): string {
  const bg = getComputedStyle(el).backgroundColor
  if (bg && !isTransparent(bg)) return bg
  const host = el.closest('[class*="__canvas"], [class*="__stage"], [class*="__preview"]')
  if (host) {
    const hostBg = getComputedStyle(host).backgroundColor
    if (hostBg && !isTransparent(hostBg)) return hostBg
  }
  return '#ffffff'
}

/** Rasterize an inlined SVG clone via canvas (avoids html-to-image CSS var gaps). */
export async function rasterizeSvgToPng(
  svgEl: SVGSVGElement,
  opts: { removeSelectors?: readonly string[]; pixelRatio?: number; backgroundColor?: string } = {},
): Promise<Blob> {
  const ratio = opts.pixelRatio ?? 2
  const clone = cloneSvgWithInlinedPaints(svgEl, { removeSelectors: opts.removeSelectors })
  const width = Number(clone.getAttribute('width')) || 800
  const height = Number(clone.getAttribute('height')) || 600
  const bg = opts.backgroundColor ?? resolveBackground(svgEl.parentElement ?? svgEl)
  clone.style.background = bg

  const xml = new XMLSerializer().serializeToString(clone)
  const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }))
  try {
    const img = new Image()
    img.decoding = 'sync'
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('SVG rasterize failed'))
      img.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(width * ratio))
    canvas.height = Math.max(1, Math.round(height * ratio))
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas unavailable')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('PNG encode failed'))),
        'image/png',
      )
    })
    return blob
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function rasterizeHtmlToPng(
  element: HTMLElement,
  opts: {
    pixelRatio?: number
    backgroundColor?: string
    width?: number
    height?: number
    filter?: (node: HTMLElement) => boolean
  } = {},
): Promise<Blob> {
  const width = opts.width ?? element.offsetWidth
  const height = opts.height ?? element.offsetHeight
  const pixelRatio = opts.pixelRatio ?? Math.max(2, Math.min(3, window.devicePixelRatio || 2))

  const dataUrl = await toPng(element, {
    cacheBust: true,
    pixelRatio,
    width,
    height,
    canvasWidth: Math.max(1, Math.round(width * pixelRatio)),
    canvasHeight: Math.max(1, Math.round(height * pixelRatio)),
    backgroundColor: opts.backgroundColor ?? resolveBackground(element),
    filter: (node) => {
      if (!(node instanceof HTMLElement)) return true
      return opts.filter?.(node) ?? true
    },
  })
  const response = await fetch(dataUrl)
  const blob = await response.blob()
  if (!(blob instanceof Blob)) {
    throw new Error('PNG rasterize returned no blob')
  }
  return blob
}

export function downloadPngBlob(blob: Blob, filename: string) {
  if (!(blob instanceof Blob)) {
    throw new Error('PNG download expected a Blob')
  }
  const safe = filename.endsWith('.png') ? filename : `${filename}.png`
  downloadBlob(blob, safe)
}

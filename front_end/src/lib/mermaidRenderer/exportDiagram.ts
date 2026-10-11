import {
  downloadInlinedSvg,
  downloadPngBlob,
  rasterizeHtmlToPng,
  rasterizeSvgToPng,
  serializeInlinedSvg,
} from '../editorContext/svgCapture'

type StylePatch = { el: HTMLElement | SVGElement; prop: string; prev: string }

/** Bake computed theme paints onto the live SVG (incl. foreignObject HTML labels). */
function flattenMermaidPaints(svgEl: SVGSVGElement): () => void {
  const patches: StylePatch[] = []
  const nodes = [svgEl as Element, ...Array.from(svgEl.querySelectorAll('*'))]
  for (const node of nodes) {
    if (!(node instanceof HTMLElement) && !(node instanceof SVGElement)) continue
    const computed = getComputedStyle(node)
    for (const prop of ['fill', 'stroke', 'color', 'background-color', 'opacity', 'stroke-width'] as const) {
      const value = computed.getPropertyValue(prop).trim()
      if (!value || value === 'none' || value === 'transparent' || value === 'rgba(0, 0, 0, 0)') {
        continue
      }
      const styleProp = prop
      patches.push({ el: node, prop: styleProp, prev: node.style.getPropertyValue(styleProp) })
      node.style.setProperty(styleProp, value)
      if ((prop === 'fill' || prop === 'stroke') && node instanceof SVGElement) {
        node.setAttribute(prop, value)
      }
    }
  }
  return () => {
    for (const { el, prop, prev } of patches) {
      if (prev) el.style.setProperty(prop, prev)
      else el.style.removeProperty(prop)
    }
  }
}

/** Serialize the live Mermaid SVG with theme paints inlined. */
export function serializeMermaidSvg(svgEl: SVGSVGElement): string {
  return serializeInlinedSvg(svgEl)
}

export function downloadMermaidSvg(svgEl: SVGSVGElement, filename: string) {
  downloadInlinedSvg(svgEl, filename)
}

/**
 * PNG via html-to-image on the canvas host so foreignObject HTML labels survive
 * (SVG→Image→canvas often drops them). Falls back to SVG rasterize.
 */
export async function exportMermaidViewportPng(svgEl: SVGSVGElement): Promise<Blob> {
  const host =
    (svgEl.closest('.theme-mermaid-renderer__canvas') as HTMLElement | null) ??
    (svgEl.parentElement as HTMLElement | null)
  const restore = flattenMermaidPaints(svgEl)
  try {
    await new Promise<void>((r) => requestAnimationFrame(() => r()))
    if (host) {
      return await rasterizeHtmlToPng(host, {
        pixelRatio: 2,
        filter: (node) => !node.classList.contains('theme-mermaid-renderer__canvas-zoom'),
      })
    }
    return await rasterizeSvgToPng(svgEl, { pixelRatio: 2 })
  } finally {
    restore()
  }
}

export function downloadMermaidPng(blob: Blob, filename: string) {
  downloadPngBlob(blob, filename)
}

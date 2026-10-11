import {
  downloadInlinedSvg,
  downloadPngBlob,
  rasterizeSvgToPng,
  serializeInlinedSvg,
} from '../editorContext/svgCapture'

const FORCE_REMOVE = [
  '.theme-force-graph-renderer__node-hit',
  '.theme-force-graph-renderer__node-halo',
  'defs',
] as const

const INTERACTION_CLASSES = [
  'theme-force-graph-renderer__node-group--selected',
  'theme-force-graph-renderer__node-group--hovered',
  'theme-force-graph-renderer__node-group--dim',
  'theme-force-graph-renderer__link--dim',
  'theme-force-graph-renderer__link--hot',
] as const

type ChromePatch = {
  el: Element
  className: string
  filter: string | null
}

function captureNeutralPatches(svgEl: SVGSVGElement): ChromePatch[] {
  const patches: ChromePatch[] = []
  svgEl
    .querySelectorAll('.theme-force-graph-renderer__node-group, .theme-force-graph-renderer__link')
    .forEach((el) => {
      const prev = el.getAttribute('class') ?? ''
      let next = prev
      for (const cls of INTERACTION_CLASSES) {
        next = next.split(cls).join('').trim().replace(/\s+/g, ' ')
      }
      patches.push({ el, className: prev, filter: el.getAttribute('filter') })
      if (next !== prev) el.setAttribute('class', next)
      el.querySelectorAll('[filter]').forEach((child) => {
        patches.push({
          el: child,
          className: child.getAttribute('class') ?? '',
          filter: child.getAttribute('filter'),
        })
        child.removeAttribute('filter')
      })
    })
  return patches
}

function restorePatches(patches: ChromePatch[]) {
  for (const patch of patches) {
    if (patch.className) patch.el.setAttribute('class', patch.className)
    else patch.el.removeAttribute('class')
    if (patch.filter) patch.el.setAttribute('filter', patch.filter)
    else patch.el.removeAttribute('filter')
  }
}

/** Neutralize hover/selection chrome so export matches a clean resting graph. */
function withNeutralForceChrome<T>(svgEl: SVGSVGElement, run: () => T): T {
  const patches = captureNeutralPatches(svgEl)
  try {
    return run()
  } finally {
    restorePatches(patches)
  }
}

async function withNeutralForceChromeAsync<T>(
  svgEl: SVGSVGElement,
  run: () => Promise<T>,
): Promise<T> {
  const patches = captureNeutralPatches(svgEl)
  try {
    return await run()
  } finally {
    restorePatches(patches)
  }
}

/** Serialize the live force SVG with theme paints inlined. */
export function serializeForceSvg(svgEl: SVGSVGElement): string {
  return withNeutralForceChrome(svgEl, () =>
    serializeInlinedSvg(svgEl, { removeSelectors: FORCE_REMOVE }),
  )
}

export function downloadForceSvg(svgEl: SVGSVGElement, filename: string) {
  withNeutralForceChrome(svgEl, () => {
    downloadInlinedSvg(svgEl, filename, { removeSelectors: FORCE_REMOVE })
  })
}

export async function exportForceViewportPng(svgEl: SVGSVGElement): Promise<Blob> {
  return withNeutralForceChromeAsync(svgEl, () =>
    rasterizeSvgToPng(svgEl, {
      removeSelectors: FORCE_REMOVE,
      pixelRatio: 2,
    }),
  )
}

export function downloadForcePng(blob: Blob, filename: string) {
  downloadPngBlob(blob, filename)
}

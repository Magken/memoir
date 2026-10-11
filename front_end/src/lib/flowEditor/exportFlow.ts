import {
  getNodesBounds,
  getViewportForBounds,
  type Node,
  type Viewport,
} from '@xyflow/react'
import { downloadPngBlob, rasterizeHtmlToPng } from '../editorContext/svgCapture'

type StylePatch = {
  el: HTMLElement | SVGElement
  prop: string
  prev: string
}

const CHROME_PROPS = [
  'background-color',
  'border-color',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'outline-color',
] as const

/**
 * html-to-image often drops CSS `var()` / `color-mix()` on SVG stroke/fill/markers
 * and HTML node chrome. Resolve live computed colors for the capture window, then restore.
 */
function flattenPaintsForExport(root: HTMLElement): () => void {
  const patches: StylePatch[] = []

  const paintables = root.querySelectorAll<SVGElement>(
    [
      '.react-flow__edge-path',
      '.react-flow__connection-path',
      '.react-flow__arrowhead',
      'marker path',
      'marker polygon',
      'marker circle',
      '.react-flow__edge-text',
      '.react-flow__edge-textbg',
      'text',
      'tspan',
    ].join(', '),
  )

  for (const el of paintables) {
    const computed = getComputedStyle(el)
    const stroke = computed.stroke
    const fill = computed.fill
    if (stroke && stroke !== 'none' && stroke !== 'rgba(0, 0, 0, 0)') {
      patches.push({ el, prop: 'stroke', prev: el.style.stroke })
      el.style.stroke = stroke
    }
    if (fill && fill !== 'none' && fill !== 'rgba(0, 0, 0, 0)') {
      patches.push({ el, prop: 'fill', prev: el.style.fill })
      el.style.fill = fill
    }
  }

  const markers = root.querySelectorAll<SVGMarkerElement>('marker')
  for (const marker of markers) {
    const child = marker.querySelector<SVGElement>('path, polygon, circle, polyline')
    if (!child) continue
    const computed = getComputedStyle(child)
    const fill = computed.fill
    const stroke = computed.stroke
    const hostStroke =
      getComputedStyle(root).getPropertyValue('--theme-text').trim() ||
      getComputedStyle(document.documentElement).getPropertyValue('--theme-text').trim() ||
      '#1a1a1a'
    if (!fill || fill === 'none' || fill.includes('context') || fill === 'rgba(0, 0, 0, 0)') {
      patches.push({ el: child, prop: 'fill', prev: child.style.fill })
      child.style.fill =
        hostStroke.startsWith('#') || hostStroke.startsWith('rgb')
          ? hostStroke
          : stroke || hostStroke
    } else if (fill.includes('var(') || fill.includes('color-mix')) {
      patches.push({ el: child, prop: 'fill', prev: child.style.fill })
      child.style.fill = hostStroke
    }
    if (stroke && (stroke.includes('var(') || stroke.includes('context'))) {
      patches.push({ el: child, prop: 'stroke', prev: child.style.stroke })
      child.style.stroke = hostStroke
    }
  }

  const htmlPaint = root.querySelectorAll<HTMLElement>(
    '.react-flow__node, .react-flow__node *, .react-flow__edge-textwrapper, .react-flow__edge-textwrapper *',
  )
  for (const el of htmlPaint) {
    const computed = getComputedStyle(el)
    const color = computed.color
    const bg = computed.backgroundColor
    const border = computed.borderColor
    if (color && color !== 'rgba(0, 0, 0, 0)') {
      patches.push({ el, prop: 'color', prev: el.style.color })
      el.style.color = color
    }
    if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
      patches.push({ el, prop: 'background-color', prev: el.style.backgroundColor })
      el.style.backgroundColor = bg
    }
    if (border && border !== 'rgba(0, 0, 0, 0)') {
      patches.push({ el, prop: 'border-color', prev: el.style.borderColor })
      el.style.borderColor = border
    }
    for (const prop of CHROME_PROPS) {
      const value = computed.getPropertyValue(prop).trim()
      if (!value || value === 'transparent' || value === 'rgba(0, 0, 0, 0)') continue
      patches.push({ el, prop, prev: el.style.getPropertyValue(prop) })
      el.style.setProperty(prop, value)
    }
  }

  return () => {
    for (const { el, prop, prev } of patches) {
      if (prev) el.style.setProperty(prop, prev)
      else el.style.removeProperty(prop)
    }
  }
}

function resolveBackgroundColor(stage: HTMLElement): string {
  const fromStage = getComputedStyle(stage).backgroundColor
  if (fromStage && fromStage !== 'rgba(0, 0, 0, 0)' && fromStage !== 'transparent') {
    return fromStage
  }
  return '#ffffff'
}

function shouldCaptureFlowNode(node: HTMLElement): boolean {
  const skip = [
    'react-flow__panel',
    'react-flow__controls',
    'react-flow__minimap',
    'react-flow__attribution',
    'react-flow__nodesselection',
    'react-flow__selection',
    'react-flow__handle',
    'react-flow__resize-control',
    'react-flow__edgeupdater',
    'react-flow__node-toolbar',
    'theme-flow-editor__canvas-zoom',
    'theme-scroll__rail',
  ]
  for (const cls of skip) {
    if (node.classList.contains(cls)) return false
  }
  if (node.className.includes('selection') && node.className.includes('react-flow')) {
    return false
  }
  return true
}

function resolveExportDimensions(
  nodes: Node[],
  stage: HTMLElement,
): { width: number; height: number; viewport: Viewport | null } {
  const fallback = {
    width: Math.max(1, stage.clientWidth),
    height: Math.max(1, stage.clientHeight),
    viewport: null as Viewport | null,
  }
  if (nodes.length === 0) return fallback

  const bounds = getNodesBounds(nodes)
  if (bounds.width < 1 || bounds.height < 1) return fallback

  const padding = 48
  let width = Math.ceil(Math.max(bounds.width + padding * 2, 320))
  let height = Math.ceil(Math.max(bounds.height + padding * 2, 240))
  const maxDim = 3200
  if (width > maxDim || height > maxDim) {
    const scale = maxDim / Math.max(width, height)
    width = Math.ceil(width * scale)
    height = Math.ceil(height * scale)
  }

  const viewport = getViewportForBounds(bounds, width, height, 0.05, 8, 0.1)
  return { width, height, viewport }
}

export type FlowDiagramExportContext = {
  stage: HTMLElement
  viewport: HTMLElement
  nodes: Node[]
  getViewport: () => Viewport
  setViewport: (viewport: Viewport) => void
}

/**
 * Export the full diagram at content bounds (not a zoomed screen crop).
 * Temporarily fits the RF viewport, rasterizes at 2–3× DPR — crisp like Draw export.
 */
export async function exportFlowDiagramPng(ctx: FlowDiagramExportContext): Promise<Blob> {
  const { stage, viewport, nodes, getViewport, setViewport } = ctx
  const prevViewport = getViewport()
  const { width, height, viewport: exportViewport } = resolveExportDimensions(nodes, stage)

  stage.classList.add('theme-flow-editor__stage--exporting')
  if (exportViewport) setViewport(exportViewport)

  const restore = flattenPaintsForExport(viewport)
  try {
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())))
    if (width < 1 || height < 1) {
      throw new Error('Flow export has no size')
    }
    return await rasterizeHtmlToPng(viewport, {
      pixelRatio: Math.max(2, Math.min(3, window.devicePixelRatio || 2)),
      backgroundColor: resolveBackgroundColor(stage),
      width,
      height,
      filter: shouldCaptureFlowNode,
    })
  } finally {
    restore()
    setViewport(prevViewport)
    stage.classList.remove('theme-flow-editor__stage--exporting')
  }
}

/** Screen-sized capture when viewport helpers are unavailable. */
export async function exportFlowStagePng(stage: HTMLElement): Promise<Blob> {
  const viewport = stage.querySelector('.react-flow__viewport') as HTMLElement | null
  if (!viewport) throw new Error('Flow viewport not ready')

  stage.classList.add('theme-flow-editor__stage--exporting')
  const restore = flattenPaintsForExport(viewport)
  try {
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())))
    const width = stage.clientWidth
    const height = stage.clientHeight
    if (width < 1 || height < 1) {
      throw new Error('Flow stage has no size')
    }
    return await rasterizeHtmlToPng(viewport, {
      pixelRatio: Math.max(2, Math.min(3, window.devicePixelRatio || 2)),
      backgroundColor: resolveBackgroundColor(stage),
      width,
      height,
      filter: shouldCaptureFlowNode,
    })
  } finally {
    restore()
    stage.classList.remove('theme-flow-editor__stage--exporting')
  }
}

/** @deprecated Use exportFlowDiagramPng — viewport transform caused blurry partial captures. */
export async function exportFlowViewportPng(element: HTMLElement, _filename: string): Promise<Blob> {
  const stage =
    (element.closest('.theme-flow-editor__stage') as HTMLElement | null) ?? element
  return exportFlowStagePng(stage)
}

export function downloadFlowPng(blob: Blob, filename: string) {
  downloadPngBlob(blob, filename)
}

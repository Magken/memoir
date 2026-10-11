/** Per-block diagram preview dimensions (session state in DocEditor diagram plugin). */
export type DiagramBlockSize = {
  width: number
  height: number
  /** Horizontal shift from the code block's measured left edge. */
  leftOffset: number
}

export const DIAGRAM_BLOCK_MIN_WIDTH = 200
export const DIAGRAM_BLOCK_MIN_HEIGHT = 120
export const DIAGRAM_BLOCK_MAX_HEIGHT = 1920
/** Horizontal inset from the page content edge for diagram blocks (each side). */
export const DIAGRAM_BLOCK_EDGE_INSET = 12

export function clampDiagramHeight(height: number): number {
  return Math.min(DIAGRAM_BLOCK_MAX_HEIGHT, Math.max(DIAGRAM_BLOCK_MIN_HEIGHT, height))
}

export function clampDiagramWidth(width: number, left: number, surfaceWidth: number): number {
  const maxWidth = Math.max(
    DIAGRAM_BLOCK_MIN_WIDTH,
    surfaceWidth - left - DIAGRAM_BLOCK_EDGE_INSET,
  )
  return Math.min(maxWidth, Math.max(DIAGRAM_BLOCK_MIN_WIDTH, width))
}

/** Read `--editor-diagram-block-height` from the editor shell (fallback 480px). */
export function measureDefaultDiagramBlockHeight(shell: HTMLElement | null): number {
  if (!shell) return 480
  const probe = document.createElement('div')
  probe.style.cssText =
    'position:absolute;visibility:hidden;pointer-events:none;height:var(--editor-diagram-block-height);width:0'
  shell.appendChild(probe)
  const height = probe.offsetHeight
  shell.removeChild(probe)
  return height > 0 ? height : 480
}

export function resolveDiagramBlockSize(
  hostWidth: number,
  stored: DiagramBlockSize | undefined,
  defaultHeight: number,
  baseLeft: number,
): DiagramBlockSize {
  const contentWidth = Math.max(DIAGRAM_BLOCK_MIN_WIDTH, hostWidth)
  const leftOffset = stored?.leftOffset ?? 0
  const width = clampDiagramWidth(
    stored?.width ?? contentWidth,
    baseLeft + leftOffset,
    contentWidth,
  )
  const height = clampDiagramHeight(stored?.height ?? defaultHeight)
  return { width, height, leftOffset }
}

export type DiagramResizeEdge = 'bottom' | 'left' | 'right'

export function resizeDiagramBlockSize(
  start: DiagramBlockSize,
  edge: DiagramResizeEdge,
  deltaX: number,
  deltaY: number,
  baseLeft: number,
  surfaceWidth: number,
): DiagramBlockSize {
  if (edge === 'bottom') {
    return {
      ...start,
      height: clampDiagramHeight(start.height + deltaY),
    }
  }

  if (edge === 'right') {
    return {
      ...start,
      width: clampDiagramWidth(start.width + deltaX, baseLeft + start.leftOffset, surfaceWidth),
    }
  }

  const nextLeftOffset = start.leftOffset + deltaX
  const nextWidth = start.width - deltaX
  const left = baseLeft + nextLeftOffset
  const width = clampDiagramWidth(nextWidth, left, surfaceWidth)
  const appliedDelta = start.width - width
  return {
    width,
    height: start.height,
    leftOffset: start.leftOffset + appliedDelta,
  }
}

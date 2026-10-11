import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { useChartTheme } from '../../lib/charts/chartTheme'
import {
  downloadForcePng,
  downloadForceSvg,
  exportForceViewportPng,
} from '../../lib/forceGraph/exportGraph'
import {
  createForceSimulation,
  pinNode,
  releaseNode,
  type ForceSimulationHandle,
} from '../../lib/forceGraph/forceSimulation'
import { curvedLinkPath, forceNodeRadius } from '../../lib/forceGraph/linkGeometry'
import { parseForceGraphSource } from '../../lib/forceGraph/parseGraph'
import type { ForceSimLink, ForceSimNode } from '../../lib/forceGraph/types'
import {
  applySvgViewBox,
  fitViewBoxToBounds,
  FORCE_VIEW_ZOOM_STEP,
  isValidViewBox,
  limitViewBoxZoom,
  measureForceGraphBounds,
  panViewBoxByPixels,
  prepareForceSvgForViewPort,
  viewBoxZoomPercent,
  wheelZoomFactorFromDelta,
  zoomViewBoxAt,
  type ForceViewBox,
} from '../../lib/forceGraph/viewport'
import { CanvasFullscreenModal } from '../rendererParts/CanvasFullscreenModal'
import { CanvasZoomMenu } from '../rendererParts/CanvasZoomMenu'

type ForceGraphCanvasViewportProps = {
  source: string
  className?: string
  onError?: (message: string | null) => void
  zoom?: number
  onZoomChange?: (zoom: number) => void
  showZoomOverlay?: boolean
  allowFullscreenExpand?: boolean
  fullscreenTitle?: string
  autoFitOnRender?: boolean
  viewportRevision?: number
}

export type ForceGraphCanvasViewportHandle = {
  zoomFit: () => void
  zoomReset: () => void
  zoomIn: () => void
  zoomOut: () => void
  exportSvg: () => void
  exportPng: () => Promise<void>
}

const HOVER_SCALE = 1.32
const SELECTED_SCALE = 1.48
const CLICK_DRAG_SLOP_PX = 5

function groupIndex(group: string | number | undefined, paletteLen: number) {
  if (typeof group === 'number' && Number.isFinite(group)) {
    return Math.abs(Math.floor(group)) % paletteLen
  }
  if (typeof group === 'string' && group.length) {
    let hash = 0
    for (let i = 0; i < group.length; i += 1) hash = (hash * 31 + group.charCodeAt(i)) | 0
    return Math.abs(hash) % paletteLen
  }
  return 0
}

function linkEndpoint(end: string | ForceSimNode): { x: number; y: number; id?: string } | null {
  if (typeof end === 'object' && end && typeof end.x === 'number' && typeof end.y === 'number') {
    return { x: end.x, y: end.y, id: end.id }
  }
  return null
}

function linkNodeId(end: string | ForceSimNode): string | null {
  if (typeof end === 'string') return end
  if (typeof end === 'object' && end?.id) return end.id
  return null
}

function visualRadius(base: number, scale: number) {
  return base * scale
}

function simNodeById(handle: ForceSimulationHandle | null, id: string): ForceSimNode | undefined {
  return handle?.nodes.find((n) => n.id === id)
}

export const ForceGraphCanvasViewport = forwardRef<
  ForceGraphCanvasViewportHandle,
  ForceGraphCanvasViewportProps
>(function ForceGraphCanvasViewportImpl(
  {
    source,
    className = '',
    onError,
    onZoomChange,
    showZoomOverlay = false,
    allowFullscreenExpand = true,
    fullscreenTitle = 'Force graph',
    autoFitOnRender = false,
    viewportRevision = 0,
  },
  ref,
) {
  const chartTheme = useChartTheme()
  const glowFilterId = useId().replace(/:/g, '')
  const hostRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const simRef = useRef<ForceSimulationHandle | null>(null)
  const initialViewBoxRef = useRef<ForceViewBox | null>(null)
  const baseViewBoxRef = useRef<ForceViewBox | null>(null)
  const viewBoxRef = useRef<ForceViewBox | null>(null)
  const dragPanRef = useRef<{ x: number; y: number } | null>(null)
  const nodeDragRef = useRef<{
    node: ForceSimNode
    startClientX: number
    startClientY: number
    moved: boolean
  } | null>(null)
  const wheelFrameRef = useRef(0)
  const wheelPendingRef = useRef<{ deltaY: number; focalX: number; focalY: number } | null>(null)
  const didAutoFitRef = useRef(false)
  const [nodes, setNodes] = useState<ForceSimNode[]>([])
  const [links, setLinks] = useState<ForceSimLink[]>([])
  const [zoomDisplay, setZoomDisplay] = useState(100)
  const [isDragging, setIsDragging] = useState(false)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [fullscreenOpen, setFullscreenOpen] = useState(false)
  const [fullscreenRevision, setFullscreenRevision] = useState(0)

  const degreeById = useMemo(() => {
    const map = new Map<string, number>()
    for (const link of links) {
      const s = linkNodeId(link.source)
      const t = linkNodeId(link.target)
      if (s) map.set(s, (map.get(s) ?? 0) + 1)
      if (t) map.set(t, (map.get(t) ?? 0) + 1)
    }
    return map
  }, [links])

  const neighborIds = useMemo(() => {
    const focus = hoveredId ?? selectedId
    if (!focus) return null
    const set = new Set<string>([focus])
    for (const link of links) {
      const s = linkNodeId(link.source)
      const t = linkNodeId(link.target)
      if (s === focus && t) set.add(t)
      if (t === focus && s) set.add(s)
    }
    return set
  }, [hoveredId, selectedId, links])

  const nodeScale = useCallback(
    (id: string) => {
      if (selectedId === id) return SELECTED_SCALE
      if (hoveredId === id) return HOVER_SCALE
      return 1
    },
    [hoveredId, selectedId],
  )

  const notifyZoom = useCallback(
    (base: ForceViewBox, current: ForceViewBox) => {
      const percent = viewBoxZoomPercent(base, current)
      setZoomDisplay(percent)
      onZoomChange?.(percent / 100)
    },
    [onZoomChange],
  )

  const commitViewBox = useCallback(
    (next: ForceViewBox, focalX = 0.5, focalY = 0.5) => {
      const svgEl = svgRef.current
      const base = baseViewBoxRef.current
      if (!svgEl || !base) return
      const limited = limitViewBoxZoom(base, next, focalX, focalY)
      if (!isValidViewBox(limited)) return
      viewBoxRef.current = limited
      applySvgViewBox(svgEl, limited)
      notifyZoom(base, limited)
    },
    [notifyZoom],
  )

  const applyZoomFit = useCallback(() => {
    const host = hostRef.current
    const svgEl = svgRef.current
    if (!host || !svgEl || nodes.length === 0) return
    const hostRect = host.getBoundingClientRect()
    if (hostRect.width < 8 || hostRect.height < 8) return
    prepareForceSvgForViewPort(svgEl)
    const bounds = measureForceGraphBounds(nodes)
    const fit = fitViewBoxToBounds(bounds, hostRect.width, hostRect.height)
    initialViewBoxRef.current = { ...fit }
    baseViewBoxRef.current = fit
    commitViewBox(fit)
  }, [commitViewBox, nodes])

  const applyZoomReset = useCallback(() => {
    const initial = initialViewBoxRef.current
    if (!initial) return
    baseViewBoxRef.current = initial
    commitViewBox(initial)
  }, [commitViewBox])

  const zoomAtHostPoint = useCallback(
    (factor: number, focalX: number, focalY: number) => {
      const current = viewBoxRef.current
      if (!current) return
      commitViewBox(zoomViewBoxAt(current, factor, focalX, focalY), focalX, focalY)
    },
    [commitViewBox],
  )

  const zoomAtCenter = useCallback(
    (factor: number) => zoomAtHostPoint(factor, 0.5, 0.5),
    [zoomAtHostPoint],
  )

  useEffect(() => {
    const parsed = parseForceGraphSource(source)
    if (!parsed.ok) {
      simRef.current?.stop()
      simRef.current = null
      setNodes([])
      setLinks([])
      setHoveredId(null)
      setSelectedId(null)
      onError?.(parsed.error)
      return
    }

    onError?.(null)
    didAutoFitRef.current = false
    setHoveredId(null)
    setSelectedId(null)
    simRef.current?.stop()

    const handle = createForceSimulation(parsed.spec, (nextNodes, nextLinks) => {
      // Keep simulation object identity — shallow copies each tick break drag pin (fx/fy).
      setNodes(nextNodes.slice())
      setLinks(nextLinks.slice())
    })
    simRef.current = handle
    setNodes(handle.nodes.slice())
    setLinks(handle.links.slice())

    return () => {
      handle.stop()
      if (simRef.current === handle) simRef.current = null
    }
  }, [onError, source])

  useEffect(() => {
    const svgEl = svgRef.current
    const host = hostRef.current
    if (!svgEl || !host || nodes.length === 0) return
    if (viewBoxRef.current) return

    const hostRect = host.getBoundingClientRect()
    if (hostRect.width < 8 || hostRect.height < 8) return

    prepareForceSvgForViewPort(svgEl)
    const bounds = measureForceGraphBounds(nodes)
    const initial = fitViewBoxToBounds(bounds, hostRect.width, hostRect.height)
    initialViewBoxRef.current = { ...initial }
    baseViewBoxRef.current = initial
    viewBoxRef.current = initial
    applySvgViewBox(svgEl, initial)
    notifyZoom(initial, initial)
  }, [nodes, notifyZoom])

  useEffect(() => {
    if (!autoFitOnRender || didAutoFitRef.current || nodes.length === 0) return
    if (nodes.every((n) => n.x == null)) return
    didAutoFitRef.current = true
    requestAnimationFrame(() => applyZoomFit())
  }, [autoFitOnRender, applyZoomFit, nodes])

  useEffect(() => {
    if (!viewportRevision) return
    requestAnimationFrame(() => applyZoomFit())
  }, [viewportRevision, applyZoomFit])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const rect = host.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      const focalX = (event.clientX - rect.left) / rect.width
      const focalY = (event.clientY - rect.top) / rect.height
      const pending = wheelPendingRef.current
      if (pending) {
        pending.deltaY += event.deltaY
        pending.focalX = focalX
        pending.focalY = focalY
      } else {
        wheelPendingRef.current = { deltaY: event.deltaY, focalX, focalY }
      }
      if (wheelFrameRef.current) return
      wheelFrameRef.current = requestAnimationFrame(() => {
        wheelFrameRef.current = 0
        const batch = wheelPendingRef.current
        wheelPendingRef.current = null
        if (!batch) return
        zoomAtHostPoint(wheelZoomFactorFromDelta(batch.deltaY), batch.focalX, batch.focalY)
      })
    }

    host.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      host.removeEventListener('wheel', onWheel)
      if (wheelFrameRef.current) cancelAnimationFrame(wheelFrameRef.current)
    }
  }, [zoomAtHostPoint])

  const handleCanvasPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (nodeDragRef.current) return
    if (event.button !== 0) return
    const target = event.target as Element | null
    if (target?.closest('.theme-force-graph-renderer__node-hit')) return
    event.preventDefault()
    dragPanRef.current = { x: event.clientX, y: event.clientY }
    setIsDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handleCanvasPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const host = hostRef.current
    const current = viewBoxRef.current
    const drag = dragPanRef.current
    if (!host || !current || !drag) return
    const rect = host.getBoundingClientRect()
    const next = panViewBoxByPixels(
      current,
      rect.width,
      rect.height,
      event.clientX - drag.x,
      event.clientY - drag.y,
    )
    dragPanRef.current = { x: event.clientX, y: event.clientY }
    commitViewBox(next)
  }

  const handleCanvasPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const wasPanning = dragPanRef.current != null
    dragPanRef.current = null
    setIsDragging(false)
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      // already released
    }
    if (wasPanning && !nodeDragRef.current) {
      const target = event.target as Element | null
      if (target && (target === event.currentTarget || target.closest('svg'))) {
        const onNode = target.closest('.theme-force-graph-renderer__node-hit')
        if (!onNode) setSelectedId(null)
      }
    }
  }

  const handleNodePointerDown = (event: ReactPointerEvent<SVGElement>, nodeId: string) => {
    event.stopPropagation()
    event.preventDefault()
    const svgEl = svgRef.current
    const simNode = simNodeById(simRef.current, nodeId)
    if (!svgEl || !simNode) return

    dragPanRef.current = null
    setIsDragging(false)

    nodeDragRef.current = {
      node: simNode,
      startClientX: event.clientX,
      startClientY: event.clientY,
      moved: false,
    }
    const pt = svgEl.createSVGPoint()
    const toLocal = (clientX: number, clientY: number) => {
      pt.x = clientX
      pt.y = clientY
      const ctm = svgEl.getScreenCTM()
      if (!ctm) return null
      return pt.matrixTransform(ctm.inverse())
    }
    const local = toLocal(event.clientX, event.clientY)
    if (!local) return
    pinNode(simNode, local.x, local.y)
    simRef.current?.simulation.alphaTarget(0.3).restart()
    event.currentTarget.setPointerCapture(event.pointerId)

    const onMove = (e: PointerEvent) => {
      const active = nodeDragRef.current
      if (!active) return
      const dx = e.clientX - active.startClientX
      const dy = e.clientY - active.startClientY
      if (!active.moved && Math.hypot(dx, dy) > CLICK_DRAG_SLOP_PX) active.moved = true
      const next = toLocal(e.clientX, e.clientY)
      if (!next) return
      pinNode(active.node, next.x, next.y)
    }
    const onUp = (e: PointerEvent) => {
      const active = nodeDragRef.current
      if (active) {
        releaseNode(active.node)
        simRef.current?.simulation.alphaTarget(0)
        if (!active.moved) {
          setSelectedId((prev) => (prev === active.node.id ? null : active.node.id))
        }
      }
      nodeDragRef.current = null
      try {
        event.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        // already released
      }
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  useImperativeHandle(
    ref,
    () => ({
      zoomFit: applyZoomFit,
      zoomReset: applyZoomReset,
      zoomIn: () => zoomAtCenter(FORCE_VIEW_ZOOM_STEP),
      zoomOut: () => zoomAtCenter(1 / FORCE_VIEW_ZOOM_STEP),
      exportSvg: () => {
        const svgEl = svgRef.current
        if (!svgEl) return
        downloadForceSvg(svgEl, fullscreenTitle.trim() || 'force-graph')
      },
      exportPng: async () => {
        const svgEl = svgRef.current
        if (!svgEl) return
        const blob = await exportForceViewportPng(svgEl)
        downloadForcePng(blob, fullscreenTitle.trim() || 'force-graph')
      },
    }),
    [applyZoomFit, applyZoomReset, fullscreenTitle, zoomAtCenter],
  )

  const palette = chartTheme.palette
  const focusActive = neighborIds != null

  return (
    <div
      className={['theme-force-graph-renderer__canvas-host', className].filter(Boolean).join(' ')}
    >
      <div
        ref={hostRef}
        className={[
          'theme-force-graph-renderer__canvas',
          isDragging ? 'theme-force-graph-renderer__canvas--dragging' : '',
          focusActive ? 'theme-force-graph-renderer__canvas--focus' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerUp}
        onPointerCancel={handleCanvasPointerUp}
      >
        <div className="theme-force-graph-renderer__canvas-content">
          <svg ref={svgRef} aria-label="Force-directed graph">
            <defs>
              <filter
                id={glowFilterId}
                x="-80%"
                y="-80%"
                width="260%"
                height="260%"
                colorInterpolationFilters="sRGB"
              >
                <feGaussianBlur stdDeviation="2.4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <g className="theme-force-graph-renderer__links">
              {links.map((link, index) => {
                const s = linkEndpoint(link.source)
                const t = linkEndpoint(link.target)
                if (!s || !t) return null
                const sId = s.id ?? linkNodeId(link.source)
                const tId = t.id ?? linkNodeId(link.target)
                const sBase = forceNodeRadius(degreeById.get(sId ?? '') ?? 0)
                const tBase = forceNodeRadius(degreeById.get(tId ?? '') ?? 0)
                const sR = visualRadius(sBase, sId ? nodeScale(sId) : 1)
                const tR = visualRadius(tBase, tId ? nodeScale(tId) : 1)
                const d = curvedLinkPath(s, t, sR + 1.5, tR + 1.5)
                if (!d) return null
                const related =
                  !neighborIds ||
                  (sId != null && neighborIds.has(sId) && tId != null && neighborIds.has(tId))
                const hot =
                  (hoveredId != null || selectedId != null) &&
                  related &&
                  (sId === hoveredId ||
                    tId === hoveredId ||
                    sId === selectedId ||
                    tId === selectedId)
                return (
                  <path
                    key={`link-${index}`}
                    className={[
                      'theme-force-graph-renderer__link',
                      related ? '' : 'theme-force-graph-renderer__link--dim',
                      hot ? 'theme-force-graph-renderer__link--hot' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    d={d}
                    strokeWidth={1.1 + (link.value ?? 1) * 0.4}
                  />
                )
              })}
            </g>
            <g className="theme-force-graph-renderer__nodes">
              {nodes.map((node) => {
                if (node.x == null || node.y == null) return null
                const fill = palette[groupIndex(node.group, palette.length)] ?? palette[0]
                const baseR = forceNodeRadius(degreeById.get(node.id) ?? 0)
                const scale = nodeScale(node.id)
                const isSelected = selectedId === node.id
                const isHovered = hoveredId === node.id
                const dimmed = neighborIds != null && !neighborIds.has(node.id)
                const label = node.label ?? node.id
                return (
                  <g
                    key={node.id}
                    className={[
                      'theme-force-graph-renderer__node-group',
                      isSelected ? 'theme-force-graph-renderer__node-group--selected' : '',
                      isHovered ? 'theme-force-graph-renderer__node-group--hovered' : '',
                      dimmed ? 'theme-force-graph-renderer__node-group--dim' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    transform={`translate(${node.x},${node.y})`}
                    onPointerEnter={() => setHoveredId(node.id)}
                    onPointerLeave={() => setHoveredId((prev) => (prev === node.id ? null : prev))}
                  >
                    <g className="theme-force-graph-renderer__node-scale">
                      <circle
                        className="theme-force-graph-renderer__node-halo"
                        r={baseR + 5}
                        fill={fill}
                      />
                      <circle
                        className="theme-force-graph-renderer__node"
                        r={baseR}
                        fill={fill}
                        stroke={chartTheme.surface}
                        filter={
                          isSelected || isHovered ? `url(#${glowFilterId})` : undefined
                        }
                      />
                      <circle
                        className="theme-force-graph-renderer__node-core"
                        r={Math.max(2.5, baseR * 0.28)}
                        fill={chartTheme.surface}
                      />
                      <circle
                        className="theme-force-graph-renderer__node-hit"
                        r={baseR + 8}
                        onPointerDown={(e) => handleNodePointerDown(e, node.id)}
                      />
                    </g>
                    <text
                      className="theme-force-graph-renderer__label"
                      x={0}
                      y={baseR * scale + 14}
                      textAnchor="middle"
                      fill={chartTheme.text}
                    >
                      {label}
                    </text>
                  </g>
                )
              })}
            </g>
          </svg>
        </div>
      </div>

      {showZoomOverlay ? (
        <div className="theme-force-graph-renderer__canvas-zoom">
          <CanvasZoomMenu
            zoomLabel={`${zoomDisplay}%`}
            onZoomOut={() => zoomAtCenter(1 / FORCE_VIEW_ZOOM_STEP)}
            onZoomReset={applyZoomReset}
            onZoomIn={() => zoomAtCenter(FORCE_VIEW_ZOOM_STEP)}
            onZoomFit={applyZoomFit}
            onExpandFullscreen={
              allowFullscreenExpand
                ? () => {
                    setFullscreenRevision((v) => v + 1)
                    setFullscreenOpen(true)
                  }
                : undefined
            }
          />
        </div>
      ) : null}

      {allowFullscreenExpand ? (
        <CanvasFullscreenModal
          open={fullscreenOpen}
          title={fullscreenTitle}
          onClose={() => setFullscreenOpen(false)}
        >
          <ForceGraphCanvasViewport
            source={source}
            onError={onError}
            autoFitOnRender
            showZoomOverlay
            allowFullscreenExpand={false}
            fullscreenTitle={fullscreenTitle}
            viewportRevision={fullscreenRevision}
          />
        </CanvasFullscreenModal>
      ) : null}
    </div>
  )
})

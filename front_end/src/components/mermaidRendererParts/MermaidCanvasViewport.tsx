import { forwardRef, useCallback, useEffect, useLayoutEffect, useId, useImperativeHandle, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { mermaidZoomPercent } from '../../lib/mermaidRenderer/canvasViewport'
import {
  applySvgViewBox,
  fitViewBoxToDiagram,
  isValidViewBox,
  limitViewBoxZoom,
  MERMAID_VIEW_ZOOM_STEP,
  panViewBoxByPixels,
  prepareMermaidSvgForViewPort,
  readSvgViewBox,
  viewBoxZoomPercent,
  wheelZoomFactorFromDelta,
  zoomViewBoxAt,
  type MermaidViewBox,
} from '../../lib/mermaidRenderer/svgViewPort'
import {
  mermaidThemeFromPalette,
  renderMermaidDiagram,
} from '../../lib/mermaidRenderer/renderMermaid'
import {
  downloadMermaidPng,
  downloadMermaidSvg,
  exportMermaidViewportPng,
} from '../../lib/mermaidRenderer/exportDiagram'
import { useThemeColor } from '../../lib/theme'
import { ContentLoadOverlay } from '../Loader'
import { CanvasFullscreenModal } from '../rendererParts/CanvasFullscreenModal'
import { CanvasZoomMenu } from '../rendererParts/CanvasZoomMenu'

type MermaidCanvasViewportProps = {
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

export type MermaidCanvasViewportHandle = {
  zoomFit: () => void
  zoomReset: () => void
  zoomIn: () => void
  zoomOut: () => void
  exportSvg: () => void
  exportPng: () => Promise<void>
}

export const MermaidCanvasViewport = forwardRef<MermaidCanvasViewportHandle, MermaidCanvasViewportProps>(
  function MermaidCanvasViewportImpl(
    {
      source,
      className = '',
      onError,
      zoom: zoomMirror = 1,
      onZoomChange,
      showZoomOverlay = false,
      allowFullscreenExpand = true,
      fullscreenTitle = 'Mermaid diagram',
      autoFitOnRender = false,
      viewportRevision = 0,
    },
    ref,
  ) {
  const { paletteId } = useThemeColor()
  const baseId = useId()
  const hostRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const initialViewBoxRef = useRef<MermaidViewBox | null>(null)
  const baseViewBoxRef = useRef<MermaidViewBox | null>(null)
  const viewBoxRef = useRef<MermaidViewBox | null>(null)
  const bootstrapAttemptsRef = useRef(0)
  const dragRef = useRef<{ x: number; y: number } | null>(null)
  const wheelFrameRef = useRef(0)
  const wheelPendingRef = useRef<{ deltaY: number; focalX: number; focalY: number } | null>(null)
  const bindFunctionsRef = useRef<((element: Element) => void) | undefined>(undefined)
  const [svg, setSvg] = useState('')
  const [zoomDisplay, setZoomDisplay] = useState(100)
  const [isDragging, setIsDragging] = useState(false)
  const [fullscreenOpen, setFullscreenOpen] = useState(false)
  const [fullscreenRevision, setFullscreenRevision] = useState(0)
  const renderSeqRef = useRef(0)

  const notifyZoom = useCallback(
    (base: MermaidViewBox, current: MermaidViewBox) => {
      const ratio = viewBoxZoomPercent(base, current) / 100
      setZoomDisplay(viewBoxZoomPercent(base, current))
      onZoomChange?.(ratio)
    },
    [onZoomChange],
  )

  const commitViewBox = useCallback(
    (next: MermaidViewBox, focalX = 0.5, focalY = 0.5) => {
      const svgEl = contentRef.current?.querySelector('svg')
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
    const svgEl = contentRef.current?.querySelector('svg')
    if (!host || !svgEl || !initialViewBoxRef.current) return

    const hostRect = host.getBoundingClientRect()
    if (hostRect.width < 8 || hostRect.height < 8) return

    prepareMermaidSvgForViewPort(svgEl)
    const fit = fitViewBoxToDiagram(svgEl, hostRect.width, hostRect.height)
    baseViewBoxRef.current = fit
    commitViewBox(fit)
  }, [commitViewBox])

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
    (factor: number) => {
      zoomAtHostPoint(factor, 0.5, 0.5)
    },
    [zoomAtHostPoint],
  )

  useEffect(() => {
    const seq = ++renderSeqRef.current
    let cancelled = false

    async function run() {
      const theme = mermaidThemeFromPalette(paletteId)
      const id = `${baseId}-${seq}`.replace(/:/g, '')
      const result = await renderMermaidDiagram(id, source, theme)

      if (cancelled || seq !== renderSeqRef.current) return

      if (!result.ok) {
        setSvg('')
        onError?.(result.error)
        return
      }

      onError?.(null)
      setSvg(result.svg)
      bindFunctionsRef.current = result.bindFunctions
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [baseId, onError, paletteId, source])

  const bootstrapViewBoxRef = useRef<() => void>(() => {})

  bootstrapViewBoxRef.current = () => {
    const svgEl = contentRef.current?.querySelector('svg')
    const host = hostRef.current
    if (!svgEl || !host) return

    const hostRect = host.getBoundingClientRect()
    if (hostRect.width < 8 || hostRect.height < 8) {
      if (bootstrapAttemptsRef.current < 12) {
        bootstrapAttemptsRef.current += 1
        requestAnimationFrame(() => bootstrapViewBoxRef.current())
      }
      return
    }
    bootstrapAttemptsRef.current = 0

    prepareMermaidSvgForViewPort(svgEl)
    const initial = readSvgViewBox(svgEl)
    initialViewBoxRef.current = { ...initial }

    if (autoFitOnRender) {
      const fit = fitViewBoxToDiagram(svgEl, hostRect.width, hostRect.height)
      baseViewBoxRef.current = fit
      viewBoxRef.current = fit
      applySvgViewBox(svgEl, fit)
      notifyZoom(fit, fit)
      return
    }

    baseViewBoxRef.current = initial
    viewBoxRef.current = initial
    applySvgViewBox(svgEl, initial)
    notifyZoom(initial, initial)
  }

  useLayoutEffect(() => {
    if (!svg || !contentRef.current) return

    contentRef.current.innerHTML = svg
    bootstrapAttemptsRef.current = 0
    bindFunctionsRef.current?.(contentRef.current)

    let innerFrame = 0
    const outerFrame = requestAnimationFrame(() => {
      innerFrame = requestAnimationFrame(() => bootstrapViewBoxRef.current())
    })

    return () => {
      cancelAnimationFrame(outerFrame)
      cancelAnimationFrame(innerFrame)
    }
  }, [autoFitOnRender, svg, viewportRevision])

  useEffect(() => {
    if (!autoFitOnRender || !svg) return
    let inner = 0
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => applyZoomFit())
    })
    return () => {
      cancelAnimationFrame(outer)
      cancelAnimationFrame(inner)
    }
  }, [applyZoomFit, autoFitOnRender, svg, viewportRevision])

  const flushWheelZoom = useCallback(() => {
    wheelFrameRef.current = 0
    const pending = wheelPendingRef.current
    wheelPendingRef.current = null
    if (!pending || !viewBoxRef.current) return

    const factor = wheelZoomFactorFromDelta(pending.deltaY)
    if (Math.abs(factor - 1) < 0.0001) return
    zoomAtHostPoint(factor, pending.focalX, pending.focalY)
  }, [zoomAtHostPoint])

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      if (!svg || !viewBoxRef.current) return
      event.preventDefault()
      const host = hostRef.current
      if (!host) return
      const rect = host.getBoundingClientRect()
      if (!rect.width || !rect.height) return

      const focalX = (event.clientX - rect.left) / rect.width
      const focalY = (event.clientY - rect.top) / rect.height
      const pending = wheelPendingRef.current
      wheelPendingRef.current = {
        deltaY: (pending?.deltaY ?? 0) + event.deltaY,
        focalX,
        focalY,
      }

      if (!wheelFrameRef.current) {
        wheelFrameRef.current = requestAnimationFrame(() => flushWheelZoom())
      }
    },
    [flushWheelZoom, svg],
  )

  useEffect(() => {
    return () => {
      if (wheelFrameRef.current) {
        cancelAnimationFrame(wheelFrameRef.current)
        wheelFrameRef.current = 0
      }
      wheelPendingRef.current = null
    }
  }, [])

  useEffect(() => {
    const host = hostRef.current
    if (!host || !svg) return
    host.addEventListener('wheel', handleWheel, { passive: false })
    return () => host.removeEventListener('wheel', handleWheel)
  }, [handleWheel, svg])

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!svg || event.button !== 0) return
      event.preventDefault()
      event.currentTarget.setPointerCapture(event.pointerId)
      setIsDragging(true)
      dragRef.current = { x: event.clientX, y: event.clientY }
    },
    [svg],
  )

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    const current = viewBoxRef.current
    const host = hostRef.current
    if (!drag || !current || !host) return

    const rect = host.getBoundingClientRect()
    const next = panViewBoxByPixels(
      current,
      rect.width,
      rect.height,
      event.clientX - drag.x,
      event.clientY - drag.y,
    )
    dragRef.current = { x: event.clientX, y: event.clientY }
    viewBoxRef.current = next
    const svgEl = contentRef.current?.querySelector('svg')
    if (svgEl) applySvgViewBox(svgEl, next)
  }, [])

  const handlePointerUp = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current) {
      dragRef.current = null
      setIsDragging(false)
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }, [])

  useImperativeHandle(
    ref,
    () => ({
      zoomFit: applyZoomFit,
      zoomReset: applyZoomReset,
      zoomIn: () => zoomAtCenter(MERMAID_VIEW_ZOOM_STEP),
      zoomOut: () => zoomAtCenter(1 / MERMAID_VIEW_ZOOM_STEP),
      exportSvg: () => {
        const svgEl = contentRef.current?.querySelector('svg')
        if (!svgEl) return
        downloadMermaidSvg(svgEl, fullscreenTitle.trim() || 'mermaid')
      },
      exportPng: async () => {
        const svgEl = contentRef.current?.querySelector('svg')
        if (!svgEl) return
        const blob = await exportMermaidViewportPng(svgEl)
        downloadMermaidPng(blob, fullscreenTitle.trim() || 'mermaid')
      },
    }),
    [applyZoomFit, applyZoomReset, fullscreenTitle, zoomAtCenter],
  )

  const zoomLabel = zoomDisplay || mermaidZoomPercent(zoomMirror)

  const openFullscreen = useCallback(() => {
    setFullscreenRevision((value) => value + 1)
    setFullscreenOpen(true)
  }, [])

  if (!source.trim()) {
    return (
      <div className={['theme-mermaid-renderer__canvas-host', className].filter(Boolean).join(' ')}>
        <div className="theme-mermaid-renderer__canvas">
          <p className="type-body-sm type-muted">Enter Mermaid syntax to preview.</p>
        </div>
      </div>
    )
  }

  if (!svg) {
    return (
      <div className={['theme-mermaid-renderer__canvas-host', className].filter(Boolean).join(' ')}>
        <div className="theme-mermaid-renderer__canvas">
          <ContentLoadOverlay loading label="Rendering diagram" />
        </div>
      </div>
    )
  }

  return (
    <>
      <div className={['theme-mermaid-renderer__canvas-host', className].filter(Boolean).join(' ')}>
        <div
          className={[
            'theme-mermaid-renderer__canvas',
            isDragging ? 'theme-mermaid-renderer__canvas--dragging' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          ref={hostRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <div ref={contentRef} className="theme-mermaid-renderer__canvas-content" />
        </div>

        {showZoomOverlay ? (
          <div className="theme-mermaid-renderer__canvas-zoom">
            <CanvasZoomMenu
              zoomLabel={`${zoomLabel}%`}
              onZoomOut={() => zoomAtCenter(1 / MERMAID_VIEW_ZOOM_STEP)}
              onZoomReset={applyZoomReset}
              onZoomIn={() => zoomAtCenter(MERMAID_VIEW_ZOOM_STEP)}
              onZoomFit={applyZoomFit}
              onExpandFullscreen={
                allowFullscreenExpand ? openFullscreen : undefined
              }
            />
          </div>
        ) : null}
      </div>

      <CanvasFullscreenModal
        open={fullscreenOpen}
        title={fullscreenTitle}
        onClose={() => setFullscreenOpen(false)}
      >
        <MermaidCanvasViewport
          source={source}
          onError={onError}
          autoFitOnRender
          showZoomOverlay
          allowFullscreenExpand={false}
          fullscreenTitle={fullscreenTitle}
          viewportRevision={fullscreenRevision}
        />
      </CanvasFullscreenModal>
    </>
  )
},
)

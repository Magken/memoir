import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
  useImperativeHandle,
  forwardRef,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import type { EditorRuntimeHandle, ForceGraphEditorPayload } from '../lib/editorContext/types'
import { downloadExportedContext } from '../lib/editorContext/importExportManager'
import { countForceGraph } from '../lib/forceGraph/parseGraph'
import { SEED_FORCE_GRAPH } from '../lib/forceGraph/seedContent'
import {
  ForceGraphCanvasViewport,
  type ForceGraphCanvasViewportHandle,
} from './forceGraphRendererParts/ForceGraphCanvasViewport'
import { ForceGraphRendererToolbar } from './forceGraphRendererParts/ForceGraphRendererToolbar'
import { CanvasFullscreenModal } from './rendererParts/CanvasFullscreenModal'
import { SourcePaneEditor } from './rendererParts/SourcePaneEditor'

export type ForceGraphRendererVariant = 'workbench' | 'embed'

type ForceGraphRendererProps = {
  className?: string
  variant?: ForceGraphRendererVariant
  initialTitle?: string
  source?: string
  initialSourceOpen?: boolean
}

export type ForceGraphRendererEmbedProps = {
  className?: string
  source: string
}

const SOURCE_MIN = 180
const SOURCE_MAX = 480
const SOURCE_DEFAULT = 300

function useDebouncedHistory(initial: string) {
  const [source, setSource] = useState(initial)
  const [historyIndex, setHistoryIndex] = useState(0)
  const historyRef = useRef([initial])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastCommittedRef = useRef(initial)

  const commitToHistory = useCallback((next: string) => {
    if (next === lastCommittedRef.current) return
    setHistoryIndex((prev) => {
      const slice = historyRef.current.slice(0, prev + 1)
      slice.push(next)
      historyRef.current = slice
      lastCommittedRef.current = next
      return slice.length - 1
    })
  }, [])

  const onSourceChange = useCallback(
    (next: string) => {
      setSource(next)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => commitToHistory(next), 400)
    },
    [commitToHistory],
  )

  const replaceSource = useCallback((next: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    historyRef.current = [next]
    setHistoryIndex(0)
    lastCommittedRef.current = next
    setSource(next)
  }, [])

  const undo = useCallback(() => {
    if (historyIndex <= 0) return
    if (timerRef.current) clearTimeout(timerRef.current)
    const nextIndex = historyIndex - 1
    const next = historyRef.current[nextIndex]
    setHistoryIndex(nextIndex)
    lastCommittedRef.current = next
    setSource(next)
  }, [historyIndex])

  const redo = useCallback(() => {
    if (historyIndex >= historyRef.current.length - 1) return
    if (timerRef.current) clearTimeout(timerRef.current)
    const nextIndex = historyIndex + 1
    const next = historyRef.current[nextIndex]
    setHistoryIndex(nextIndex)
    lastCommittedRef.current = next
    setSource(next)
  }, [historyIndex])

  const canUndo = historyIndex > 0
  const canRedo = historyIndex < historyRef.current.length - 1

  return { source, onSourceChange, replaceSource, undo, redo, canUndo, canRedo }
}

export function ForceGraphRendererEmbed({ className = '', source }: ForceGraphRendererEmbedProps) {
  return <ForceGraphRenderer variant="embed" className={className} source={source} />
}

export type ForceGraphRendererHandle = EditorRuntimeHandle

export const ForceGraphRenderer = forwardRef<ForceGraphRendererHandle, ForceGraphRendererProps>(
  function ForceGraphRenderer(
    {
      className = '',
      variant = 'workbench',
      initialTitle = 'Untitled graph',
      source: sourceProp,
      initialSourceOpen = true,
    },
    ref,
  ) {
    const [title, setTitle] = useState(initialTitle)
    const [renderError, setRenderError] = useState<string | null>(null)
    const [sourceOpen, setSourceOpen] = useState(initialSourceOpen)
    const [zoom, setZoom] = useState(1)
    const canvasRef = useRef<ForceGraphCanvasViewportHandle>(null)
    const { source, onSourceChange, replaceSource, undo, redo, canUndo, canRedo } =
      useDebouncedHistory(SEED_FORCE_GRAPH)
    const [sourceWidth, setSourceWidth] = useState(SOURCE_DEFAULT)
    const [fullscreenOpen, setFullscreenOpen] = useState(false)
    const [fullscreenRevision, setFullscreenRevision] = useState(0)

    const previewSource = variant === 'embed' ? (sourceProp ?? '') : source
    const counts = countForceGraph(previewSource)

    useEffect(() => {
      if (variant !== 'embed') return
      setZoom(1)
    }, [previewSource, variant])

    const runtimeHandle = useMemo<EditorRuntimeHandle>(
      () => ({
        getContext: () =>
          ({
            source,
            viewport: { zoom, pan: { x: 0, y: 0 } },
          }) satisfies ForceGraphEditorPayload,
        loadContext: (payload) => {
          const next = payload as ForceGraphEditorPayload & { title?: string }
          if (next.title) setTitle(next.title)
          if (typeof next.source === 'string') replaceSource(next.source)
          if (next.viewport?.zoom) setZoom(next.viewport.zoom)
        },
      }),
      [replaceSource, source, zoom],
    )

    useImperativeHandle(ref, () => runtimeHandle, [runtimeHandle])

    const handleSave = useCallback(() => {
      downloadExportedContext('force', runtimeHandle, 'envelope-json', title)
    }, [runtimeHandle, title])

    const handleExport = useCallback(
      (formatId: string) => {
        if (formatId === 'svg') {
          canvasRef.current?.exportSvg()
          return
        }
        if (formatId === 'png') {
          void canvasRef.current?.exportPng()
          return
        }
        downloadExportedContext('force', runtimeHandle, formatId as 'native-json', title)
      },
      [runtimeHandle, title],
    )

    const handleRefresh = useCallback(() => {
      replaceSource(SEED_FORCE_GRAPH)
      setRenderError(null)
      setZoom(1)
      setTitle(initialTitle)
    }, [initialTitle, replaceSource])

    const handleCopy = useCallback(() => {
      void navigator.clipboard.writeText(source)
    }, [source])

    const handleExpandFullscreen = useCallback(() => {
      setFullscreenRevision((value) => value + 1)
      setFullscreenOpen(true)
    }, [])

    const startSourceResize = (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!sourceOpen) return
      event.preventDefault()
      const startX = event.clientX
      const startW = sourceWidth
      const onMove = (e: PointerEvent) => {
        const next = Math.min(SOURCE_MAX, Math.max(SOURCE_MIN, startW + (e.clientX - startX)))
        setSourceWidth(next)
      }
      const onUp = () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    }

    if (variant === 'embed') {
      return (
        <div
          className={['theme-force-graph-renderer', 'theme-force-graph-renderer--embed', className]
            .filter(Boolean)
            .join(' ')}
        >
          <ForceGraphCanvasViewport
            ref={canvasRef}
            source={previewSource}
            zoom={zoom}
            onZoomChange={setZoom}
            onError={setRenderError}
            showZoomOverlay
            autoFitOnRender
            fullscreenTitle={title}
          />
        </div>
      )
    }

    const shellStyle = {
      '--theme-force-graph-source-width': `${sourceWidth}px`,
    } as CSSProperties

    return (
      <div
        className={[
          'theme-force-graph-renderer',
          sourceOpen ? '' : 'theme-force-graph-renderer--source-closed',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        style={shellStyle}
      >
        <ForceGraphRendererToolbar
          title={title}
          onTitleChange={setTitle}
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
          onCopy={handleCopy}
          onSave={handleSave}
          onExport={handleExport}
          onRefresh={handleRefresh}
          sourceOpen={sourceOpen}
          onToggleSource={() => setSourceOpen((open) => !open)}
          zoom={zoom}
          onZoomIn={() => canvasRef.current?.zoomIn()}
          onZoomOut={() => canvasRef.current?.zoomOut()}
          onZoomReset={() => canvasRef.current?.zoomReset()}
          onZoomFit={() => canvasRef.current?.zoomFit()}
          onExpandFullscreen={handleExpandFullscreen}
        />

        <div className="theme-force-graph-renderer__body">
          <div className="theme-force-graph-renderer__source">
            <div className="theme-force-graph-renderer__pane-label type-caption type-faint">Source</div>
            <SourcePaneEditor
              classPrefix="theme-force-graph-renderer"
              value={source}
              onChange={onSourceChange}
              aria-label="Force graph JSON source"
            />
          </div>

          <div
            className="theme-force-graph-renderer__split"
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize panes"
            onPointerDown={startSourceResize}
          />

          <div className="theme-force-graph-renderer__preview-pane">
            <div className="theme-force-graph-renderer__pane-label type-caption type-faint">Preview</div>
            <ForceGraphCanvasViewport
              ref={canvasRef}
              className="theme-force-graph-renderer__preview-canvas"
              source={source}
              zoom={zoom}
              onZoomChange={setZoom}
              onError={setRenderError}
              autoFitOnRender
              fullscreenTitle={title}
            />
          </div>
        </div>

        <div className="theme-force-graph-renderer__status" role="status">
          <span className="type-caption">
            {counts ? `${counts.nodes} nodes · ${counts.links} links` : `${source.length} chars`}
          </span>
          <span className="theme-force-graph-renderer__status-spacer" />
          {renderError ? (
            <span className="type-caption type-muted">{renderError}</span>
          ) : (
            <span className="type-caption">Force · drag nodes · pan canvas · wheel zoom</span>
          )}
        </div>

        <CanvasFullscreenModal
          open={fullscreenOpen}
          title={title}
          onClose={() => setFullscreenOpen(false)}
        >
          <ForceGraphCanvasViewport
            source={source}
            onError={setRenderError}
            autoFitOnRender
            showZoomOverlay
            allowFullscreenExpand={false}
            fullscreenTitle={title}
            viewportRevision={fullscreenRevision}
          />
        </CanvasFullscreenModal>
      </div>
    )
  },
)

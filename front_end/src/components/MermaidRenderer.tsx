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
import type { EditorRuntimeHandle, MermaidEditorPayload } from '../lib/editorContext/types'
import { SEED_MERMAID } from '../lib/mermaidRenderer/seedContent'
import { downloadExportedContext } from '../lib/editorContext/importExportManager'
import {
  MermaidCanvasViewport,
  type MermaidCanvasViewportHandle,
} from './mermaidRendererParts/MermaidCanvasViewport'
import { MermaidRendererToolbar } from './mermaidRendererParts/MermaidRendererToolbar'
import { CanvasFullscreenModal } from './rendererParts/CanvasFullscreenModal'
import { SourcePaneEditor } from './rendererParts/SourcePaneEditor'

export type MermaidRendererVariant = 'workbench' | 'embed'

type MermaidRendererProps = {
  className?: string
  variant?: MermaidRendererVariant
  initialTitle?: string
  source?: string
  initialSourceOpen?: boolean
}

export type MermaidRendererEmbedProps = {
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

export function MermaidRendererEmbed({ className = '', source }: MermaidRendererEmbedProps) {
  return <MermaidRenderer variant="embed" className={className} source={source} />
}

export type MermaidRendererHandle = EditorRuntimeHandle

export const MermaidRenderer = forwardRef<MermaidRendererHandle, MermaidRendererProps>(function MermaidRenderer(
  {
    className = '',
    variant = 'workbench',
    initialTitle = 'Untitled diagram',
    source: sourceProp,
    initialSourceOpen = true,
  },
  ref,
) {
  const [title, setTitle] = useState(initialTitle)
  const [renderError, setRenderError] = useState<string | null>(null)
  const [sourceOpen, setSourceOpen] = useState(initialSourceOpen)
  const [zoom, setZoom] = useState(1)
  const canvasRef = useRef<MermaidCanvasViewportHandle>(null)
  const { source, onSourceChange, replaceSource, undo, redo, canUndo, canRedo } =
    useDebouncedHistory(SEED_MERMAID)
  const [sourceWidth, setSourceWidth] = useState(SOURCE_DEFAULT)
  const [fullscreenOpen, setFullscreenOpen] = useState(false)
  const [fullscreenRevision, setFullscreenRevision] = useState(0)

  const previewSource = variant === 'embed' ? (sourceProp ?? '') : source

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
        }) satisfies MermaidEditorPayload,
      loadContext: (payload) => {
        const next = payload as MermaidEditorPayload & { title?: string }
        if (next.title) setTitle(next.title)
        if (next.source !== undefined) replaceSource(next.source)
        if (next.viewport?.zoom) {
          setZoom(next.viewport.zoom)
        }
      },
    }),
    [replaceSource, source, zoom],
  )

  useImperativeHandle(ref, () => runtimeHandle, [runtimeHandle])

  const handleSave = useCallback(() => {
    downloadExportedContext('mermaid', runtimeHandle, 'envelope-json', title)
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
      downloadExportedContext('mermaid', runtimeHandle, formatId as 'mmd', title)
    },
    [runtimeHandle, title],
  )

  const handleRefresh = useCallback(() => {
    replaceSource(SEED_MERMAID)
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
        className={['theme-mermaid-renderer', 'theme-mermaid-renderer--embed', className]
          .filter(Boolean)
          .join(' ')}
      >
        <MermaidCanvasViewport
          ref={canvasRef}
          source={previewSource}
          zoom={zoom}
          onZoomChange={setZoom}
          onError={setRenderError}
          showZoomOverlay
          autoFitOnRender
        />
      </div>
    )
  }

  const shellStyle = {
    '--theme-mermaid-source-width': `${sourceWidth}px`,
  } as CSSProperties

  return (
    <div
      className={[
        'theme-mermaid-renderer',
        sourceOpen ? '' : 'theme-mermaid-renderer--source-closed',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={shellStyle}
    >
      <MermaidRendererToolbar
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

      <div className="theme-mermaid-renderer__body">
        <div className="theme-mermaid-renderer__source">
          <div className="theme-mermaid-renderer__pane-label type-caption type-faint">Source</div>
          <SourcePaneEditor
            classPrefix="theme-mermaid-renderer"
            value={source}
            onChange={onSourceChange}
            aria-label="Mermaid source"
          />
        </div>

        <div
          className="theme-mermaid-renderer__split"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize panes"
          onPointerDown={startSourceResize}
        />

        <div className="theme-mermaid-renderer__preview-pane">
          <div className="theme-mermaid-renderer__pane-label type-caption type-faint">Preview</div>
          <MermaidCanvasViewport
            ref={canvasRef}
            className="theme-mermaid-renderer__preview-canvas"
            source={source}
            zoom={zoom}
            onZoomChange={setZoom}
            onError={setRenderError}
            autoFitOnRender
          />
        </div>
      </div>

      <div className="theme-mermaid-renderer__status" role="status">
        <span className="type-caption">{source.length} chars</span>
        <span className="theme-mermaid-renderer__status-spacer" />
        {renderError ? (
          <span className="type-caption type-muted">{renderError}</span>
        ) : (
          <span className="type-caption">Mermaid · drag to pan · wheel to zoom</span>
        )}
      </div>

      <CanvasFullscreenModal
        open={fullscreenOpen}
        title={title}
        onClose={() => setFullscreenOpen(false)}
      >
        <MermaidCanvasViewport
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
})

import { $getNodeByKey, $addUpdateTag, SKIP_DOM_SELECTION_TAG, type NodeKey } from 'lexical'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { useLexicalEditable } from '@lexical/react/useLexicalEditable'
import { Code, Eye } from 'lucide-react'
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { useDocEditorDiagramOptions } from '../../../lib/docEditor/docEditorDiagramContext'
import {
  resolveDiagramBlockSize,
  resizeDiagramBlockSize,
  type DiagramBlockSize,
  type DiagramResizeEdge,
} from '../../../lib/docEditor/diagramBlockSize'
import { docDiagramCodeLanguageLabel } from '../../../lib/docEditor/diagramCodeLanguages'
import { $isDiagramCodeNode, type DiagramCodeNode } from '../../../lib/docEditor/nodes/diagramCodeNode'
import { IconButton } from '../../IconButton'
import { ContentLoadOverlay } from '../../Loader'
import { MermaidCanvasViewport } from '../../mermaidRendererParts/MermaidCanvasViewport'
import { DocEditorDiagramResizeHandles } from '../DocEditorDiagramResizeHandles'

const DrawCanvasHeadless = lazy(() =>
  import('../../drawCanvasParts/DrawCanvasHeadless').then((module) => ({
    default: module.DrawCanvasHeadless,
  })),
)

export type DiagramView = 'code' | 'render'

type DocEditorDiagramEmbedProps = {
  nodeKey: NodeKey
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(timer)
  }, [delayMs, value])
  return debounced
}

function stopEditorBubble(event: React.PointerEvent | React.MouseEvent) {
  event.stopPropagation()
}

function DocDiagramMermaidPreview({
  source,
  viewportRevision,
}: {
  source: string
  viewportRevision: number
}) {
  const [zoom, setZoom] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const trimmedSource = source.trim()

  useEffect(() => {
    setError(null)
  }, [trimmedSource])

  if (error) {
    return (
      <div className="theme-mermaid-renderer__canvas-host theme-mermaid-renderer--doc-embed">
        <div className="theme-mermaid-renderer__canvas">
          <p className="type-body-sm type-muted p-3">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <MermaidCanvasViewport
      className="theme-mermaid-renderer--doc-embed"
      source={trimmedSource}
      zoom={zoom}
      onZoomChange={setZoom}
      onError={setError}
      autoFitOnRender
      showZoomOverlay
      viewportRevision={viewportRevision}
    />
  )
}

function DocDiagramExcalidrawPreview({
  source,
  viewportRevision,
}: {
  source: string
  viewportRevision: number
}) {
  return (
    <Suspense
      fallback={
        <div className="editor-diagram-preview-card__loading">
          <ContentLoadOverlay loading label="Loading diagram" />
        </div>
      }
    >
      <DrawCanvasHeadless
        className="theme-draw-canvas--doc-embed"
        sceneJson={source.trim()}
        showZoomOverlay
        viewportRevision={viewportRevision}
      />
    </Suspense>
  )
}

function DiagramChrome({
  language,
  view,
  onViewChange,
}: {
  language: string
  view: DiagramView
  onViewChange: (view: DiagramView) => void
}) {
  return (
    <div className="editor-diagram-preview-card__chrome">
      <span className="editor-diagram-preview-card__label">{docDiagramCodeLanguageLabel(language)}</span>
      <div className="editor-diagram-preview-card__actions">
        <IconButton
          icon={Code}
          size="xs"
          variant="ghost"
          active={view === 'code'}
          aria-label="View source code"
          aria-pressed={view === 'code'}
          onClick={() => onViewChange('code')}
        />
        <IconButton
          icon={Eye}
          size="xs"
          variant="ghost"
          active={view === 'render'}
          aria-label="View diagram preview"
          aria-pressed={view === 'render'}
          onClick={() => onViewChange('render')}
        />
      </div>
    </div>
  )
}

export function DocEditorDiagramEmbed({ nodeKey }: DocEditorDiagramEmbedProps) {
  const [editor] = useLexicalComposerContext()
  const isEditable = useLexicalEditable()
  const { showViewOptions, defaultHeightRef } = useDocEditorDiagramOptions()
  const [view, setView] = useState<DiagramView>('render')
  const [viewportRevision, setViewportRevision] = useState(0)
  const hostWidthRef = useRef(320)

  const readNode = useCallback(() => {
    let language = 'mermaid'
    let source = ''
    let stored: DiagramBlockSize | undefined
    editor.getEditorState().read(() => {
      const node = $getNodeByKey(nodeKey)
      if (!$isDiagramCodeNode(node)) return
      language = node.getLanguage()
      source = node.getSource()
      const width = node.getBlockWidth()
      const height = node.getBlockHeight()
      const leftOffset = node.getLeftOffset()
      if (width !== undefined || height !== undefined || leftOffset !== undefined) {
        stored = {
          width: width ?? hostWidthRef.current,
          height: height ?? defaultHeightRef.current,
          leftOffset: leftOffset ?? 0,
        }
      }
    })
    return { language, source, stored }
  }, [defaultHeightRef, editor, nodeKey])

  const [snapshot, setSnapshot] = useState(readNode)

  useEffect(() => {
    return editor.registerUpdateListener(() => {
      setSnapshot(readNode())
    })
  }, [editor, readNode])

  const effectiveView: DiagramView = showViewOptions ? view : 'render'
  const debouncedSource = useDebouncedValue(snapshot.source, effectiveView === 'render' ? 280 : 0)

  const blockSize = useMemo(() => {
    const hostEl = editor.getElementByKey(nodeKey)
    const width = hostEl instanceof HTMLElement ? hostEl.clientWidth : hostWidthRef.current
    hostWidthRef.current = width > 0 ? width : hostWidthRef.current
    return resolveDiagramBlockSize(
      hostWidthRef.current,
      snapshot.stored,
      defaultHeightRef.current,
      0,
    )
  }, [defaultHeightRef, editor, nodeKey, snapshot.stored])

  const updateNode = useCallback(
    (mutate: (node: DiagramCodeNode) => void) => {
      editor.update(
        () => {
          $addUpdateTag(SKIP_DOM_SELECTION_TAG)
          const node = $getNodeByKey(nodeKey)
          if ($isDiagramCodeNode(node)) mutate(node)
        },
        { tag: SKIP_DOM_SELECTION_TAG },
      )
    },
    [editor, nodeKey],
  )

  const handleSourceChange = useCallback(
    (nextSource: string) => {
      setSnapshot((prev) => ({ ...prev, source: nextSource }))
      updateNode((node) => node.setSource(nextSource))
    },
    [updateNode],
  )

  const handleResizeStart = useCallback(
    (edge: DiagramResizeEdge, event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault()
      stopEditorBubble(event)
      const hostEl = editor.getElementByKey(nodeKey)
      const hostWidth =
        hostEl instanceof HTMLElement && hostEl.clientWidth > 0
          ? hostEl.clientWidth
          : hostWidthRef.current
      const startSize = blockSize
      const startX = event.clientX
      const startY = event.clientY

      event.currentTarget.setPointerCapture(event.pointerId)

      const onPointerMove = (moveEvent: PointerEvent) => {
        const next = resizeDiagramBlockSize(
          startSize,
          edge,
          moveEvent.clientX - startX,
          moveEvent.clientY - startY,
          0,
          hostWidth,
        )
        updateNode((node) => {
          node.setBlockSize(next.width, next.height, next.leftOffset)
        })
      }

      const onPointerUp = () => {
        window.removeEventListener('pointermove', onPointerMove)
        window.removeEventListener('pointerup', onPointerUp)
        setViewportRevision((value) => value + 1)
      }

      window.addEventListener('pointermove', onPointerMove)
      window.addEventListener('pointerup', onPointerUp, { once: true })
    },
    [blockSize, editor, nodeKey, updateNode],
  )

  const chrome = showViewOptions ? (
    <DiagramChrome language={snapshot.language} view={effectiveView} onViewChange={setView} />
  ) : null

  if (effectiveView === 'code') {
    return (
      <div
        className="editor-diagram-block editor-diagram-block--code"
        data-diagram-language={snapshot.language}
        onPointerDown={stopEditorBubble}
        onMouseDown={stopEditorBubble}
      >
        {chrome}
        <textarea
          className="editor-diagram-block__source"
          data-scroll-rail="mini"
          value={snapshot.source}
          readOnly={!isEditable}
          spellCheck={false}
          aria-label={`${docDiagramCodeLanguageLabel(snapshot.language)} source`}
          onChange={(event) => handleSourceChange(event.target.value)}
        />
      </div>
    )
  }

  return (
    <div
      className="editor-diagram-block editor-diagram-block--render"
      data-diagram-language={snapshot.language}
      onPointerDown={stopEditorBubble}
      onMouseDown={stopEditorBubble}
    >
      <div
        className="editor-diagram-preview-card editor-diagram-preview-card--resizable"
        style={{
          marginLeft: blockSize.leftOffset,
          width: blockSize.width,
          height: blockSize.height,
          minHeight: blockSize.height,
          maxHeight: blockSize.height,
        }}
      >
        {chrome}
        <div className="editor-diagram-preview-card__body">
          {snapshot.language === 'mermaid' ? (
            <DocDiagramMermaidPreview source={debouncedSource} viewportRevision={viewportRevision} />
          ) : (
            <DocDiagramExcalidrawPreview source={debouncedSource} viewportRevision={viewportRevision} />
          )}
        </div>
        <DocEditorDiagramResizeHandles onResizeStart={handleResizeStart} />
      </div>
    </div>
  )
}

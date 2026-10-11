import {
  useCallback,
  useRef,
  useState,
  useMemo,
  useImperativeHandle,
  forwardRef,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { SEED_LATEX, SEED_MARKDOWN } from '../lib/markdownRenderer/seedContent'
import { downloadExportedContext } from '../lib/editorContext/importExportManager'
import type { EditorRuntimeHandle, MarkdownEditorPayload } from '../lib/editorContext/types'
import { MarkdownRendererPreview } from './markdownRendererParts/MarkdownRendererPreview'
import {
  MarkdownRendererToolbar,
  type MarkdownSourceMode,
} from './markdownRendererParts/MarkdownRendererToolbar'
import { SourcePaneEditor } from './rendererParts/SourcePaneEditor'
import { ThemeScroll } from './ThemeScroll'
import { MarkdownPreview } from '../lib/markdownRenderer/renderMarkdown'

export type MarkdownRendererVariant = 'workbench' | 'embed'

type MarkdownRendererProps = {
  className?: string
  variant?: MarkdownRendererVariant
  initialTitle?: string
  source?: string
  mode?: MarkdownSourceMode
  initialSourceOpen?: boolean
}

export type MarkdownRendererEmbedProps = {
  className?: string
  source: string
  mode?: MarkdownSourceMode
  /** `chat` — compact preview for bubbles (skips embed scroll shell). */
  density?: 'doc' | 'chat'
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

export function MarkdownRendererEmbed({
  className = '',
  source,
  mode = 'markdown',
  density = 'doc',
}: MarkdownRendererEmbedProps) {
  if (density === 'chat' && mode === 'markdown') {
    return <MarkdownPreview source={source} density="chat" className={className} />
  }
  return (
    <MarkdownRenderer variant="embed" className={className} source={source} mode={mode} />
  )
}

export type MarkdownRendererHandle = EditorRuntimeHandle

export const MarkdownRenderer = forwardRef<MarkdownRendererHandle, MarkdownRendererProps>(function MarkdownRenderer(
  {
    className = '',
    variant = 'workbench',
    initialTitle = 'Untitled document',
    source: sourceProp,
    mode: modeProp = 'markdown',
    initialSourceOpen = true,
  },
  ref,
) {
  const [title, setTitle] = useState(initialTitle)
  const [mode, setMode] = useState<MarkdownSourceMode>(modeProp)
  const markdown = useDebouncedHistory(SEED_MARKDOWN)
  const latex = useDebouncedHistory(SEED_LATEX)
  const [sourceOpen, setSourceOpen] = useState(initialSourceOpen)
  const [sourceWidth, setSourceWidth] = useState(SOURCE_DEFAULT)

  const active = mode === 'markdown' ? markdown : latex
  const embedSource = sourceProp ?? ''
  const previewSource = variant === 'embed' ? embedSource : active.source
  const modeLabel = mode === 'markdown' ? 'Markdown' : 'LaTeX'

  const runtimeHandle = useMemo<EditorRuntimeHandle>(
    () => ({
      getContext: () =>
        ({
          mode,
          markdown: markdown.source,
          latex: latex.source,
        }) satisfies MarkdownEditorPayload,
      loadContext: (payload) => {
        const next = payload as MarkdownEditorPayload & { title?: string }
        if (next.title) setTitle(next.title)
        if (next.mode) setMode(next.mode)
        if (next.markdown !== undefined) markdown.replaceSource(next.markdown)
        if (next.latex !== undefined) latex.replaceSource(next.latex)
      },
    }),
    [latex, markdown, mode],
  )

  useImperativeHandle(ref, () => runtimeHandle, [runtimeHandle])

  const handleSave = useCallback(() => {
    downloadExportedContext('markdown', runtimeHandle, 'envelope-json', title)
  }, [runtimeHandle, title])

  const handleExport = useCallback(
    (formatId: string) => {
      downloadExportedContext('markdown', runtimeHandle, formatId as 'md', title)
    },
    [runtimeHandle, title],
  )

  const handleRefresh = useCallback(() => {
    markdown.replaceSource(SEED_MARKDOWN)
    latex.replaceSource(SEED_LATEX)
    setMode('markdown')
    setTitle(initialTitle)
  }, [initialTitle, latex, markdown])

  const handleModeChange = useCallback((next: MarkdownSourceMode) => {
    setMode(next)
  }, [])

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(active.source)
  }, [active.source])

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
        className={['theme-markdown-renderer', 'theme-markdown-renderer--embed', className]
          .filter(Boolean)
          .join(' ')}
      >
        <ThemeScroll rail="nano" className="theme-markdown-renderer__embed-scroll">
          <MarkdownRendererPreview mode={modeProp} source={previewSource} />
        </ThemeScroll>
      </div>
    )
  }

  const shellStyle = {
    '--theme-markdown-source-width': `${sourceWidth}px`,
  } as CSSProperties

  return (
    <div
      className={[
        'theme-markdown-renderer',
        sourceOpen ? '' : 'theme-markdown-renderer--source-closed',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={shellStyle}
    >
      <MarkdownRendererToolbar
        title={title}
        onTitleChange={setTitle}
        mode={mode}
        onModeChange={handleModeChange}
        onUndo={active.undo}
        onRedo={active.redo}
        canUndo={active.canUndo}
        canRedo={active.canRedo}
        onCopy={handleCopy}
        onSave={handleSave}
        onExport={handleExport}
        onRefresh={handleRefresh}
        sourceOpen={sourceOpen}
        onToggleSource={() => setSourceOpen((open) => !open)}
      />

      <div className="theme-markdown-renderer__body">
        <div className="theme-markdown-renderer__source">
          <div className="theme-markdown-renderer__pane-label type-caption type-faint">Source</div>
          <SourcePaneEditor
            classPrefix="theme-markdown-renderer"
            value={active.source}
            onChange={active.onSourceChange}
            aria-label={`${modeLabel} source`}
          />
        </div>

        <div
          className="theme-markdown-renderer__split"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize panes"
          onPointerDown={startSourceResize}
        />

        <div className="theme-markdown-renderer__preview-pane">
          <div className="theme-markdown-renderer__pane-label type-caption type-faint">Preview</div>
          <ThemeScroll rail="nano" className="theme-markdown-renderer__preview-scroll">
            <MarkdownRendererPreview mode={mode} source={active.source} />
          </ThemeScroll>
        </div>
      </div>

      <div className="theme-markdown-renderer__status" role="status">
        <span className="type-caption">{active.source.length} chars</span>
        <span className="theme-markdown-renderer__status-spacer" />
        <span className="type-caption">{modeLabel}</span>
      </div>
    </div>
  )
})

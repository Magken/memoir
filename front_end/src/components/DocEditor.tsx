import { useState, useCallback, useEffect, useMemo, useRef, useImperativeHandle, forwardRef, type CSSProperties } from 'react'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { CheckListPlugin } from '@lexical/react/LexicalCheckListPlugin'
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin'
import { TablePlugin } from '@lexical/react/LexicalTablePlugin'
import { TabIndentationPlugin } from '@lexical/react/LexicalTabIndentationPlugin'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { ListNode, ListItemNode } from '@lexical/list'
import { LinkNode, AutoLinkNode } from '@lexical/link'
import { TableNode, TableCellNode, TableRowNode } from '@lexical/table'
import { CodeNode, CodeHighlightNode } from '@lexical/code'
import { DOC_EDITOR_EMBED_NODES } from '../lib/docEditor/nodes'
import { DocEditorToolbar } from './docEditorParts/DocEditorToolbar'
import { DocEditorInsertModal } from './docEditorParts/DocEditorInsertModal'
import { DocEditorInsertModalProvider } from '../lib/docEditor/docEditorInsertModalContext'
import { DocEditorCodeHighlightPlugin } from './docEditorParts/DocEditorCodeHighlightPlugin'
import { DocEditorCodeLanguageLabelPlugin } from './docEditorParts/DocEditorCodeLanguageLabelPlugin'
import { DocEditorDiagramPreviewPlugin } from './docEditorParts/DocEditorDiagramPreviewPlugin'
import { DocEditorTableCellResizer } from './docEditorParts/DocEditorTableCellResizer'
import { DocEditorTableActionMenu } from './docEditorParts/DocEditorTableActionMenu'
import { DocEditorTableHoverActions } from './docEditorParts/DocEditorTableHoverActions'
import { DocEditorFloatingToolbar } from './docEditorParts/DocEditorFloatingToolbar'
import { DocEditorFloatingLinkEditor } from './docEditorParts/DocEditorFloatingLinkEditor'
import { DocEditorDraggableBlockPlugin } from './docEditorParts/DocEditorDraggableBlockPlugin'
import { DocEditorLinkEditProvider } from '../lib/docEditor/docEditorLinkEditContext'
import { DocEditorCollapsiblePlugin } from './docEditorParts/DocEditorCollapsiblePlugin'
import { DocEditorLayoutPlugin } from './docEditorParts/DocEditorLayoutPlugin'
import { DocEditorStatusBar } from './docEditorParts/DocEditorStatusBar'
import { ThemeScroll } from './ThemeScroll'
import {
  DEFAULT_PAGE_SETUP,
  resolvePageDimensions,
  type PageSetup,
} from '../lib/docEditor/pageSetup'
import {
  applyDocEditorPayload,
  DocEditorContextBridge,
  type DocEditorLexicalBridge,
} from './docEditorParts/DocEditorContextBridge'
import { DocEditorProposalBar } from './docEditorParts/DocEditorProposalBar'
import { EMPTY_LEXICAL_STATE } from '../lib/editorContext/fixtures'
import type { DocEditorPayload, EditorRuntimeHandle } from '../lib/editorContext/types'
import { downloadExportedContext, downloadText } from '../lib/editorContext/importExportManager'
import { DOC_DIAGRAM_BLOCK_HEIGHT_DEFAULT } from '../lib/docEditor/diagramCodeLanguages'
import { DocEditorDiagramProvider } from '../lib/docEditor/docEditorDiagramContext'

type DocEditorProps = {
  namespace?: string
  placeholder?: string
  autoFocus?: boolean
  className?: string
  /** Mermaid / Excalidraw code blocks — show code vs preview toggle (default true). */
  showDiagramViewOptions?: boolean
  /** Fixed height for mermaid / excalidraw source + preview viewports (default 16rem). */
  diagramBlockHeight?: string
  /** Seed document from brief JSON (writing section embed). */
  initialPayload?: DocEditorPayload
  /** Compact host for timeline section preview / edit. */
  embed?: boolean
  /**
   * `section` — strip titlebar / save / export; keep formatting ribbon.
   * `preview` — no chrome (collapsed Creator timeline mini).
   */
  chrome?: 'full' | 'section' | 'preview'
  /** Soft word floor — shown in status footer when set. */
  minWords?: number | null
  /** Soft word ceiling — shown in status footer when set. */
  maxWords?: number | null
  /** Publish context (e.g. ~600ms poll from section editor). */
  onPayloadChange?: (payload: DocEditorPayload) => void
  /** View-only: Lexical non-editable; hide floating format + mutate ribbon. */
  readOnly?: boolean
  /** Copilot pending essay for the Assist peel Edit-pending tab. */
  onPendingDiffChange?: (files: readonly { path: string }[]) => void
}

export type DocEditorHandle = EditorRuntimeHandle & {
  proposeDiff: (input: {
    original: string
    next: string
    signal?: AbortSignal
  }) => Promise<'accepted' | 'rejected' | 'miss' | 'replaced'>
  settlePendingFile: (path: string, accept: boolean) => void
  focusPendingFile: (path: string) => boolean
}

const LEXICAL_THEME = {
  paragraph: '',
  heading: { h1: '', h2: '', h3: '' },
  text: {
    bold: 'editor-text-bold',
    italic: 'editor-text-italic',
    underline: 'editor-text-underline',
    strikethrough: 'editor-text-strikethrough',
    underlineStrikethrough: 'editor-text-underlineStrikethrough',
    code: 'editor-text-code',
    subscript: 'editor-text-subscript',
    superscript: 'editor-text-superscript',
    highlight: 'editor-text-highlight',
    lowercase: 'editor-text-lowercase',
    uppercase: 'editor-text-uppercase',
    capitalize: 'editor-text-capitalize',
  },
  quote: '',
  list: {
    ul: 'editor-list-ul',
    ol: 'editor-list-ol',
    listitem: 'editor-list-item',
    checklist: 'editor-checklist',
    listitemChecked: 'editor-listitem-checked',
    listitemUnchecked: 'editor-listitem-unchecked',
    nested: { listitem: 'editor-nested-listitem' },
    olDepth: [
      'editor-list-ol1',
      'editor-list-ol2',
      'editor-list-ol3',
      'editor-list-ol4',
      'editor-list-ol5',
    ],
  },
  link: '',
  code: 'editor-code-block',
  codeHighlight: {
    atrule: 'editor-token-atrule',
    attr: 'editor-token-attr',
    boolean: 'editor-token-boolean',
    builtin: 'editor-token-builtin',
    cdata: 'editor-token-cdata',
    char: 'editor-token-char',
    class: 'editor-token-class',
    'class-name': 'editor-token-class-name',
    comment: 'editor-token-comment',
    constant: 'editor-token-constant',
    deleted: 'editor-token-deleted',
    doctype: 'editor-token-doctype',
    entity: 'editor-token-entity',
    function: 'editor-token-function',
    important: 'editor-token-important',
    inserted: 'editor-token-inserted',
    keyword: 'editor-token-keyword',
    namespace: 'editor-token-namespace',
    number: 'editor-token-number',
    operator: 'editor-token-operator',
    prolog: 'editor-token-prolog',
    property: 'editor-token-property',
    punctuation: 'editor-token-punctuation',
    regex: 'editor-token-regex',
    selector: 'editor-token-selector',
    string: 'editor-token-string',
    symbol: 'editor-token-symbol',
    tag: 'editor-token-tag',
    url: 'editor-token-url',
    variable: 'editor-token-variable',
  },
  table: 'editor-table',
  tableCell: 'editor-table-cell',
  tableCellHeader: 'editor-table-cell-header',
  tableRow: 'editor-table-row',
  tableSelection: 'editor-table-selection',
  hr: 'editor-hr',
  pageBreak: 'editor-page-break',
  image: 'editor-image-host',
  layoutContainer: 'editor-layout-container',
  layoutItem: 'editor-layout-item',
  stickyNote: 'editor-sticky-note',
  collapsibleContainer: 'editor-collapsible',
  collapsibleTitle: 'editor-collapsible-title',
  collapsibleContent: 'editor-collapsible-content',
  date: 'editor-date-host',
  equation: 'editor-equation-host',
  poll: 'editor-poll-host',
  videoEmbed: 'editor-video-embed-host',
  diagramCode: 'editor-diagram-code-host',
}

const EDITOR_NODES = [
  HeadingNode,
  QuoteNode,
  ListNode,
  ListItemNode,
  LinkNode,
  AutoLinkNode,
  TableNode,
  TableCellNode,
  TableRowNode,
  CodeNode,
  CodeHighlightNode,
  ...DOC_EDITOR_EMBED_NODES,
]

function onError(error: Error) {
  console.error('[DocEditor]', error)
}

function validateUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

function DocEditorEditableLock({ locked }: { locked: boolean }) {
  const [editor] = useLexicalComposerContext()
  useEffect(() => {
    editor.setEditable(!locked)
  }, [editor, locked])
  return null
}

function cloneDocPayload(payload: DocEditorPayload): DocEditorPayload {
  return {
    title: payload.title,
    pageSetup: payload.pageSetup,
    markdown: payload.markdown,
    lexical: payload.lexical == null ? payload.lexical : structuredClone(payload.lexical),
  }
}

export const DocEditor = forwardRef<DocEditorHandle, DocEditorProps>(function DocEditor(
  {
    namespace = 'DocEditor',
    placeholder = 'Start writing your document…',
    autoFocus = false,
    className = '',
    showDiagramViewOptions = true,
    diagramBlockHeight = DOC_DIAGRAM_BLOCK_HEIGHT_DEFAULT,
    initialPayload,
    embed = false,
    chrome = 'full',
    minWords = null,
    maxWords = null,
    onPayloadChange,
    readOnly = false,
    onPendingDiffChange,
  },
  ref,
) {
  const lexicalRef = useRef<DocEditorLexicalBridge>(null)
  const [documentTitle, setDocumentTitle] = useState(
    () => initialPayload?.title?.trim() || 'Untitled document',
  )
  const [pageSetup, setPageSetup] = useState<PageSetup>(
    () => initialPayload?.pageSetup ?? DEFAULT_PAGE_SETUP,
  )
  const initialPayloadRef = useRef(initialPayload)
  const [pageSurfaceElem, setPageSurfaceElem] = useState<HTMLDivElement | null>(null)
  const [floatingAnchorElem, setFloatingAnchorElem] = useState<HTMLDivElement | null>(null)
  const [isLinkEditMode, setIsLinkEditMode] = useState(false)
  const defaultDiagramHeightRef = useRef(480)
  const proposalSettleRef = useRef<
    ((v: 'accepted' | 'rejected' | 'miss' | 'replaced') => void) | null
  >(null)
  const proposalSnapshotRef = useRef<DocEditorPayload | null>(null)
  const onPendingDiffChangeRef = useRef(onPendingDiffChange)
  onPendingDiffChangeRef.current = onPendingDiffChange
  const [diffProposal, setDiffProposal] = useState<{ original: string; next: string } | null>(null)

  const onPageSurfaceRef = useCallback((node: HTMLDivElement | null) => {
    setPageSurfaceElem(node)
  }, [])

  const onFloatingAnchorRef = useCallback((node: HTMLDivElement | null) => {
    if (node) setFloatingAnchorElem(node)
  }, [])

  const pageDimensions = useMemo(() => resolvePageDimensions(pageSetup), [pageSetup])

  const shellStyle = useMemo(
    () =>
      ({
        '--editor-diagram-block-height': diagramBlockHeight,
      }) as CSSProperties,
    [diagramBlockHeight],
  )

  const runtimeHandle = useMemo<EditorRuntimeHandle>(
    () => ({
      getContext: () =>
        ({
          lexical: lexicalRef.current?.getEditorStateJson() ?? EMPTY_LEXICAL_STATE,
          pageSetup,
          title: documentTitle,
          markdown: lexicalRef.current?.exportMarkdown() ?? '',
        }) satisfies DocEditorPayload,
      loadContext: (payload) => {
        applyDocEditorPayload(
          lexicalRef.current,
          payload as DocEditorPayload & { markdown?: string; title?: string },
          setDocumentTitle,
          setPageSetup,
        )
      },
    }),
    [pageSetup, documentTitle],
  )

  const settleDiffProposal = useCallback((v: 'accepted' | 'rejected' | 'miss') => {
    if ((v === 'rejected' || v === 'miss') && proposalSnapshotRef.current) {
      applyDocEditorPayload(
        lexicalRef.current,
        proposalSnapshotRef.current,
        setDocumentTitle,
        setPageSetup,
      )
    }
    proposalSnapshotRef.current = null
    proposalSettleRef.current?.(v)
    proposalSettleRef.current = null
    setDiffProposal(null)
    onPendingDiffChangeRef.current?.([])
  }, [])

  const proposeDiff = useCallback(
    (input: { original: string; next: string; signal?: AbortSignal }) => {
      return new Promise<'accepted' | 'rejected' | 'miss' | 'replaced'>((resolve) => {
        if (proposalSnapshotRef.current) {
          applyDocEditorPayload(
            lexicalRef.current,
            proposalSnapshotRef.current,
            setDocumentTitle,
            setPageSetup,
          )
          proposalSnapshotRef.current = null
        }
        proposalSettleRef.current?.('replaced')
        proposalSettleRef.current = resolve
        input.signal?.addEventListener('abort', () => settleDiffProposal('miss'), { once: true })
        const live = {
          lexical: lexicalRef.current?.getEditorStateJson() ?? EMPTY_LEXICAL_STATE,
          pageSetup,
          title: documentTitle,
          markdown: lexicalRef.current?.exportMarkdown() ?? input.original,
        } satisfies DocEditorPayload
        proposalSnapshotRef.current = cloneDocPayload(live)
        applyDocEditorPayload(
          lexicalRef.current,
          {
            title: documentTitle,
            pageSetup,
            markdown: input.next,
            lexical: null,
          },
          setDocumentTitle,
          setPageSetup,
        )
        setDiffProposal({ original: input.original, next: input.next })
        onPendingDiffChangeRef.current?.([{ path: 'essay' }])
      })
    },
    [settleDiffProposal, pageSetup, documentTitle],
  )

  const settlePendingFile = useCallback(
    (_path: string, accept: boolean) => {
      settleDiffProposal(accept ? 'accepted' : 'rejected')
    },
    [settleDiffProposal],
  )

  const focusPendingFile = useCallback((_path: string) => Boolean(diffProposal), [diffProposal])

  useImperativeHandle(
    ref,
    () => ({ ...runtimeHandle, proposeDiff, settlePendingFile, focusPendingFile }),
    [runtimeHandle, proposeDiff, settlePendingFile, focusPendingFile],
  )

  useEffect(
    () => () => {
      proposalSettleRef.current?.('miss')
      proposalSettleRef.current = null
      onPendingDiffChangeRef.current?.([])
    },
    [],
  )

  useEffect(() => {
    const seed = initialPayloadRef.current
    if (!seed) return
    let cancelled = false
    let attempts = 0
    let raf = 0
    // Bridge mounts after first paint; retry briefly so markdown/lexical seeds land.
    const trySeed = () => {
      if (cancelled) return
      if (lexicalRef.current) {
        runtimeHandle.loadContext(seed)
        return
      }
      attempts += 1
      if (attempts < 12) {
        raf = window.requestAnimationFrame(trySeed)
      }
    }
    raf = window.requestAnimationFrame(trySeed)
    return () => {
      cancelled = true
      window.cancelAnimationFrame(raf)
    }
    // Mount-only seed from brief JSON.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onPayloadChangeRef = useRef(onPayloadChange)
  onPayloadChangeRef.current = onPayloadChange

  useEffect(() => {
    if (!onPayloadChange) return
    const id = window.setInterval(() => {
      onPayloadChangeRef.current?.(runtimeHandle.getContext() as DocEditorPayload)
    }, 600)
    return () => window.clearInterval(id)
  }, [onPayloadChange, runtimeHandle])

  const handleSave = useCallback(() => {
    downloadExportedContext('doc', runtimeHandle, 'envelope-json', documentTitle)
  }, [documentTitle, runtimeHandle])

  const handleExport = useCallback(
    async (formatId: string) => {
      if (formatId === 'png' || formatId === 'svg') return

      if (formatId === 'html') {
        const html = await lexicalRef.current?.exportHtml({ pageSetup, title: documentTitle })
        if (html) {
          const safeTitle =
            documentTitle.trim().replace(/\s+/g, '-').toLowerCase() || 'document'
          downloadText(`${safeTitle}.html`, html, 'text/html;charset=utf-8')
        }
        return
      }

      if (formatId === 'pdf') {
        await lexicalRef.current?.exportPdf({ pageSetup, title: documentTitle })
        return
      }

      downloadExportedContext('doc', runtimeHandle, formatId as 'envelope-json', documentTitle)
    },
    [documentTitle, pageSetup, runtimeHandle],
  )

  const handleRefresh = useCallback(() => {
    setDocumentTitle('Untitled document')
    setPageSetup(DEFAULT_PAGE_SETUP)
    lexicalRef.current?.loadEditorStateJson(EMPTY_LEXICAL_STATE)
  }, [])

  const handleFileAction = useCallback(
    (id: 'new' | 'reset') => {
      if (id === 'new' || id === 'reset') handleRefresh()
    },
    [handleRefresh],
  )

  const contentStyle = useMemo((): CSSProperties | undefined => {
    if (!pageDimensions) return undefined
    return {
      '--theme-doc-editor-page-width': `${pageDimensions.width}px`,
      '--theme-doc-editor-page-min-height': `${pageDimensions.height}px`,
      '--theme-doc-editor-page-margin': `${pageDimensions.margin}px`,
    } as CSSProperties
  }, [pageDimensions])

  const initialConfig = {
    namespace,
    theme: LEXICAL_THEME,
    nodes: EDITOR_NODES,
    onError,
    editable: !readOnly,
  }

  const isPageless = pageSetup.pageSize === 'pageless'

  const pageSurface = (
    <div ref={onPageSurfaceRef} className="theme-doc-editor__page-surface">
      <RichTextPlugin
        contentEditable={
          <ContentEditable
            className="theme-doc-editor__input"
            aria-placeholder={placeholder}
            placeholder={() => null}
          />
        }
        placeholder={<div className="theme-doc-editor__placeholder">{placeholder}</div>}
        ErrorBoundary={LexicalErrorBoundary}
      />
    </div>
  )

  const editorPlugins = (
    <>
      <HistoryPlugin />
      <ListPlugin />
      <CheckListPlugin />
      <LinkPlugin validateUrl={validateUrl} />
      <TablePlugin hasCellMerge hasCellBackgroundColor />
      {!readOnly && !diffProposal ? <DocEditorFloatingToolbar /> : null}
      <TabIndentationPlugin />
      <DocEditorCodeHighlightPlugin />
      <DocEditorCodeLanguageLabelPlugin />
      <DocEditorDiagramPreviewPlugin defaultHeightRef={defaultDiagramHeightRef} />
      <DocEditorCollapsiblePlugin />
      <DocEditorLayoutPlugin />
      {autoFocus && <AutoFocusPlugin />}
      <div ref={onFloatingAnchorRef} className="theme-doc-editor__floating-anchor" aria-hidden="true" />
    </>
  )

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <DocEditorDiagramProvider
        showViewOptions={showDiagramViewOptions}
        defaultHeightRef={defaultDiagramHeightRef}
      >
      <DocEditorLinkEditProvider value={{ isLinkEditMode, setIsLinkEditMode }}>
        <DocEditorInsertModalProvider>
        <div
          className={[
            'theme-doc-editor',
            embed ? 'theme-doc-editor--embed' : '',
            chrome === 'section' ? 'theme-doc-editor--section' : '',
            chrome === 'preview' ? 'theme-doc-editor--preview' : '',
            isPageless ? 'theme-doc-editor--pageless' : 'theme-doc-editor--paged',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          {...(chrome === 'section'
            ? { 'data-sitting-copy-ok': '', 'data-copy-surface': 'doc' }
            : {})}
          style={shellStyle}
        >
          <DocEditorToolbar
            documentTitle={documentTitle}
            onDocumentTitleChange={setDocumentTitle}
            pageSetup={pageSetup}
            onPageSetupChange={setPageSetup}
            onSave={handleSave}
            onExport={handleExport}
            onRefresh={handleRefresh}
            onFileAction={handleFileAction}
            chrome={chrome}
            readOnly={readOnly}
          />
          <div
            className={[
              'theme-doc-editor__content',
              isPageless ? 'theme-doc-editor__content--pageless' : 'theme-doc-editor__content--paged',
            ].join(' ')}
          >
            {diffProposal ? (
              <DocEditorProposalBar
                onAccept={() => settleDiffProposal('accepted')}
                onReject={() => settleDiffProposal('rejected')}
              />
            ) : null}
            {isPageless ? (
              <ThemeScroll rail="nano" className="theme-doc-editor__page-scroll">
                <div className="theme-doc-editor__page-canvas theme-doc-editor__page-canvas--pageless">
                  {pageSurface}
                  <div className="theme-doc-editor__sticky-layer" aria-hidden="true" />
                </div>
              </ThemeScroll>
            ) : (
              <ThemeScroll rail="nano" className="theme-doc-editor__page-scroll">
                <div
                  className="theme-doc-editor__page-canvas theme-doc-editor__page-canvas--paged"
                  style={contentStyle}
                >
                  {pageSurface}
                  <div className="theme-doc-editor__sticky-layer" aria-hidden="true" />
                </div>
              </ThemeScroll>
            )}
            {editorPlugins}
            <DocEditorEditableLock locked={readOnly || Boolean(diffProposal)} />
            <DocEditorContextBridge ref={lexicalRef} />
            {!readOnly && !diffProposal ? <DocEditorInsertModal /> : null}
          </div>
          {floatingAnchorElem && !readOnly && !diffProposal ? (
            <>
              <DocEditorTableCellResizer anchorElem={floatingAnchorElem} />
              <DocEditorTableActionMenu cellMerge anchorElem={floatingAnchorElem} />
              <DocEditorTableHoverActions anchorElem={floatingAnchorElem} />
              <DocEditorFloatingLinkEditor anchorElem={floatingAnchorElem} />
            </>
          ) : null}
          {pageSurfaceElem && !readOnly && !diffProposal ? (
            <DocEditorDraggableBlockPlugin anchorElem={pageSurfaceElem} />
          ) : null}
          {chrome !== 'preview' ? (
            <DocEditorStatusBar minWords={minWords} maxWords={maxWords} />
          ) : null}
        </div>
        </DocEditorInsertModalProvider>
      </DocEditorLinkEditProvider>
      </DocEditorDiagramProvider>
    </LexicalComposer>
  )
})

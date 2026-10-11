import type { OnMount } from '@monaco-editor/react'
import type { editor as MonacoEditor } from 'monaco-editor'
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  forwardRef,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { languageFromPath, resolveEditorLanguage } from '../lib/codeEditor/languageFromPath'
import {
  highlightEditorLine,
  highlightEditorLineRange,
  jumpEditorToLine,
} from '../lib/codeEditor/editorFind'
import {
  CODING_LANGUAGE_IDS,
  codingLanguageExtension,
  codingSolvePath,
  normalizeCodingLanguages,
  resolveCodingLanguageForFile,
} from '../lib/interviewBrief/codingLanguages'
import {
  isCodingExplorerVisiblePath,
  pickVisibleCodingFile,
  visibleCodingExplorerFiles,
  visibleCodingExplorerFolders,
} from '../lib/interviewBrief/codingWorkspaceFiles'
import {
  alternateFileKindFromPath,
  isAltViewAllowed,
  resolveAltViewForFile,
  type CodeEditorAltView,
} from '../lib/codeEditor/alternateView'
import { installMdnHover } from '../lib/codeEditor/mdnHover'
import { installWorkspaceCompletions } from '../lib/codeEditor/workspaceCompletions'
import { CodeEditorSearchHostProvider } from '../lib/codeEditor/CodeEditorSearchHostContext'
import {
  resolveSearchAdapter,
  searchAdapterScopeLabel,
} from '../lib/codeEditor/searchHotwire'
import { createSeedWorkspace } from '../lib/codeEditor/seedFiles'
import {
  appendTerminalPayload,
  resolveTerminalWorkspacePath,
  type CodeTerminalItem,
} from '../lib/interviewRunApi/formatCodeRunTerminal'
import {
  addFolder,
  allFolderPaths,
  basename,
  createFile,
  defaultPathInFolder,
  dirname,
  fileById,
  isDirty,
  normalizePath,
  pathExists,
  removeFolderSubtree,
  type CodeFile,
  type CodeWorkspace,
} from '../lib/codeEditor/workspace'
import { isDarkPalette, useThemeColor } from '../lib/theme'
import { Input } from './Input'
import { Modal } from './Modal'
import { CodeEditorSidebar, type CodeEditorSidebarView, type CodeEditorSearchScope } from './codeEditorParts/CodeEditorSidebar'
import type { CodeEditorFileAction } from './codeEditorParts/CodeEditorFileMenu'
import { CodeEditorStatusBar } from './codeEditorParts/CodeEditorStatusBar'
import { CodeEditorTabBar } from './codeEditorParts/CodeEditorTabBar'
import {
  CodeEditorTerminal,
  runStubTerminalCommand,
} from './codeEditorParts/CodeEditorTerminal'
import { CodeEditorToolbar } from './codeEditorParts/CodeEditorToolbar'
import { CodeEditorStageFile } from './codeEditorParts/CodeEditorStageFile'
import { WorkbenchDiffProposal } from './codeEditorParts/WorkbenchDiffProposal'
import { CodeEditorUploadModal } from './codeEditorParts/CodeEditorUploadModal'
import { importUploadedFiles } from '../lib/codeEditor/importWorkspaceFiles'
import { renameMonacoModelPath, monacoPathForWorkspace } from '../lib/codeEditor/monacoModelPath'
import { workspaceImportMarkers } from '../lib/codeEditor/workspaceImportCheck'
import {
  coalesceEdit,
  emptyWorkspaceEditStacks,
  entryPath,
  popRedo,
  popUndo,
  pushWorkspaceEdit,
  type WorkspaceEditStacks,
} from '../lib/codeEditor/workspaceEditHistory'
import { serializeCodeWorkspace, deserializeCodeWorkspace } from '../lib/codeEditor/workspaceSerialize'
import type { CodeEditorPayload, EditorRuntimeHandle } from '../lib/editorContext/types'
import { downloadExportedContext } from '../lib/editorContext/importExportManager'

type CodeEditorProps = {
  className?: string
  initialTitle?: string
  /** Seed workspace from brief JSON (coding section embed). */
  initialPayload?: CodeEditorPayload
  /** Compact host for timeline section preview / edit. */
  embed?: boolean
  /**
   * `section` — Creator / gate embed: hide File · Save · Export · title;
   * keep undo/redo + tools (lang · font · wrap · minimap · explorer · run · terminal).
   */
  chrome?: 'full' | 'section'
  /**
   * Coding-task language ids (`tools.*.languages`). When non-empty with `chrome="section"`,
   * the language menu lists only these.
   */
  allowedLanguages?: readonly string[]
  /** Publish serialized workspace (e.g. ~600ms poll from section editor). */
  onPayloadChange?: (payload: CodeEditorPayload) => void
  /**
   * Creator / host Run handler. When omitted, toolbar shows a stub terminal line.
   */
  onRun?: (api: {
    appendTerminal: (lines: string[] | CodeTerminalItem[]) => void
    getPayload: () => CodeEditorPayload
    /** Explorer / toolbar language slice — Run this language's `src/solve.*`. */
    activeLanguage?: string | null
  }) => void | Promise<void>
  /** View-only: Monaco/CSV non-editable; file mutate actions disabled. Run + terminal stay. */
  readOnly?: boolean
  /** Copilot pending file list for the Assist peel Proposed edit sheet. */
  onPendingDiffChange?: (files: readonly { path: string }[]) => void
}

export type CodeEditorHandle = EditorRuntimeHandle & {
  openWorkspacePath: (path: string, loc?: { line?: number; column?: number }) => boolean
  highlightWorkspaceRange: (path: string, startLine?: number, endLine?: number) => boolean
  proposeDiff: (input: {
    path?: string
    original?: string
    next?: string
    files?: readonly { id?: string; path: string; original: string; next: string }[]
    signal?: AbortSignal
    onFileDecision?: (path: string, decision: 'accepted' | 'rejected') => void | Promise<void>
  }) => Promise<'accepted' | 'rejected' | 'miss' | 'replaced'>
  settlePendingFile: (path: string, accept: boolean) => void
  focusPendingFile: (path: string) => boolean
}

type ModalKind = 'new' | 'new-folder' | 'rename' | 'upload' | 'help' | null

const FONT_SIZE_DEFAULT = 14
const EXPLORER_MIN = 140
const EXPLORER_MAX = 360
const EDITOR_FIND_MIN_WIDTH = 300
const TERMINAL_MIN = 96
const TERMINAL_MAX = 320

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function isSrcTreePath(path: string): boolean {
  const n = normalizePath(path)
  return n === 'src' || n.startsWith('src/')
}

function constrainToSrcFolder(folderPath: string | null | undefined): string {
  const n = normalizePath(folderPath ?? '')
  return isSrcTreePath(n) ? n : 'src'
}

function sanitizeFileStem(raw: string): string {
  const t = String(raw ?? '')
    .trim()
    .replace(/[/\\]/g, '')
    .replace(/^\.+/g, '')
  return t || 'untitled'
}

function stemWithoutExtension(name: string, ext: string): string {
  const e = ext.replace(/^\./, '')
  const re = new RegExp(`\\.${e}$`, 'i')
  return sanitizeFileStem(name).replace(re, '') || 'untitled'
}

export const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(function CodeEditor(
  {
    className = '',
    initialTitle = 'Untitled workspace',
    initialPayload,
    embed = false,
    chrome = 'full',
    allowedLanguages,
    onPayloadChange,
    onRun,
    readOnly = false,
    onPendingDiffChange,
  },
  ref,
) {
  const sectionChrome = chrome === 'section'
  const { paletteId } = useThemeColor()
  const monacoTheme = isDarkPalette(paletteId) ? 'vs-dark' : 'vs'

  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null)
  const editorsRef = useRef(new Map<string, MonacoEditor.IStandaloneCodeEditor>())
  const monacoApiRef = useRef<Parameters<OnMount>[1] | null>(null)
  const activeIdRef = useRef<string | null>(null)
  const editStacksRef = useRef<WorkspaceEditStacks>(emptyWorkspaceEditStacks())
  const workspaceRef = useRef<CodeWorkspace | null>(null)
  const seedPathsRef = useRef(
    new Set(
      (initialPayload?.files ?? []).map((f) => normalizePath(String(f.path ?? ''))).filter(Boolean),
    ),
  )
  const [title, setTitle] = useState(
    () => initialPayload?.title?.trim() || initialTitle,
  )
  const [workspace, setWorkspace] = useState<CodeWorkspace>(() =>
    initialPayload?.files?.length
      ? deserializeCodeWorkspace(initialPayload)
      : createSeedWorkspace(),
  )
  workspaceRef.current = workspace
  const [fontSize, setFontSize] = useState(FONT_SIZE_DEFAULT)
  const [wordWrap, setWordWrap] = useState(false)
  const [minimap, setMinimap] = useState(true)
  const [explorerOpen, setExplorerOpen] = useState(true)
  const [sidebarView, setSidebarView] = useState<CodeEditorSidebarView>('files')
  const [searchScope, setSearchScope] = useState<CodeEditorSearchScope>('workspace')
  const [pendingJump, setPendingJump] = useState<{
    fileId: string
    line: number
    column: number
  } | null>(null)
  const pendingJumpRef = useRef(pendingJump)
  const proposalSettleRef = useRef<
    ((v: 'accepted' | 'rejected' | 'miss' | 'replaced') => void) | null
  >(null)
  const pendingQueueRef = useRef<
    Array<{ id?: string; path: string; original: string; next: string; language: string }>
  >([])
  const pendingAcceptedRef = useRef(false)
  const pendingFileDecisionRef = useRef<
    ((path: string, decision: 'accepted' | 'rejected') => void | Promise<void>) | undefined
  >(undefined)
  const onPendingDiffChangeRef = useRef(onPendingDiffChange)
  onPendingDiffChangeRef.current = onPendingDiffChange
  const [diffProposal, setDiffProposal] = useState<{
    id?: string
    path: string
    original: string
    next: string
    language: string
  } | null>(null)
  pendingJumpRef.current = pendingJump
  const openEditorSearchRef = useRef<() => void>(() => {})
  const [terminalOpen, setTerminalOpen] = useState(true)
  const [terminalItems, setTerminalItems] = useState<CodeTerminalItem[]>(() => [
    {
      kind: 'text',
      text: onRun
        ? 'Ready. Press Run to test the active solve file against cases.'
        : 'Terminal ready. Type help for commands.',
      tone: 'meta',
    },
  ])
  const [runBusy, setRunBusy] = useState(false)
  const [cursor, setCursor] = useState({ line: 1, column: 1 })
  const [explorerWidth, setExplorerWidth] = useState(200)
  const [terminalHeight, setTerminalHeight] = useState(140)
  const [modal, setModal] = useState<ModalKind>(null)
  const [pathDraft, setPathDraft] = useState('')
  const [pathError, setPathError] = useState<string | null>(null)
  const [newFileStem, setNewFileStem] = useState('untitled')
  const [newFileFolder, setNewFileFolder] = useState('src')
  const [uploadBusy, setUploadBusy] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [altViewsByFile, setAltViewsByFile] = useState<Record<string, CodeEditorAltView>>({})
  const [srcLanguage, setSrcLanguage] = useState<string | null>(null)

  const activeFile = useMemo(
    () => (workspace.activeId ? fileById(workspace.files, workspace.activeId) : undefined),
    [workspace],
  )

  const languageMenuIds = useMemo(() => {
    if (!sectionChrome) return undefined
    const ids: string[] = []
    const seen = new Set<string>()
    const push = (id: string | null | undefined) => {
      const n = String(id ?? '').trim()
      if (!n || seen.has(n)) return
      seen.add(n)
      ids.push(n)
    }
    for (const id of normalizeCodingLanguages(allowedLanguages ?? [])) push(id)
    for (const file of workspace.files) {
      const n = file.path.replace(/\\/g, '/')
      if (!n.startsWith('src/')) continue
      push(resolveCodingLanguageForFile(n, file.language, CODING_LANGUAGE_IDS))
    }
    return ids
  }, [allowedLanguages, sectionChrome, workspace.files])

  const explorerLanguage = useMemo(() => {
    const menu = languageMenuIds ?? (allowedLanguages ? [...allowedLanguages] : [])
    if (!menu.length) return null
    if (srcLanguage && menu.includes(srcLanguage)) return srcLanguage
    return (
      (activeFile &&
        resolveCodingLanguageForFile(activeFile.path, activeFile.language, menu)) ||
      menu[0] ||
      null
    )
  }, [activeFile, allowedLanguages, languageMenuIds, srcLanguage])

  const explorerFiles = useMemo(
    () =>
      explorerLanguage
        ? visibleCodingExplorerFiles(workspace.files, explorerLanguage)
        : workspace.files,
    [explorerLanguage, workspace.files],
  )

  const explorerFolders = useMemo(
    () =>
      explorerLanguage
        ? visibleCodingExplorerFolders(workspace.folders, workspace.files, explorerLanguage)
        : workspace.folders,
    [explorerLanguage, workspace.files, workspace.folders],
  )

  const lockedCodingExt = useMemo(() => {
    const lang = explorerLanguage || allowedLanguages?.[0] || null
    return (lang && codingLanguageExtension(lang)) || 'js'
  }, [allowedLanguages, explorerLanguage])

  const isInterviewSeedPath = useCallback(
    (path: string) => sectionChrome && seedPathsRef.current.has(normalizePath(path)),
    [sectionChrome],
  )

  const canDeleteFileId = useCallback(
    (id: string) => {
      if (!sectionChrome) return true
      const file = (workspaceRef.current?.files ?? []).find((f) => f.id === id)
      if (!file) return false
      return !seedPathsRef.current.has(normalizePath(file.path))
    },
    [sectionChrome],
  )

  const canDeleteFolderPath = useCallback(
    (folderPath: string) => {
      if (!sectionChrome) return true
      const n = normalizePath(folderPath)
      if (!n || n === 'src') return false
      const files = workspaceRef.current?.files ?? []
      return !files.some(
        (f) =>
          (f.path === n || f.path.startsWith(`${n}/`)) &&
          seedPathsRef.current.has(normalizePath(f.path)),
      )
    },
    [sectionChrome],
  )

  const canCreateInFolderPath = useCallback(
    (folderPath: string) => (sectionChrome ? isSrcTreePath(folderPath) : true),
    [sectionChrome],
  )

  const hasDirty = useMemo(() => workspace.files.some(isDirty), [workspace.files])

  const runtimeHandle = useMemo<EditorRuntimeHandle>(
    () => ({
      getContext: () => serializeCodeWorkspace(workspace, title),
      loadContext: (payload) => {
        const next = payload as CodeEditorPayload
        if (next.title) setTitle(next.title)
        editStacksRef.current = emptyWorkspaceEditStacks()
        setWorkspace(deserializeCodeWorkspace(next))
      },
    }),
    [title, workspace],
  )

  const onPayloadChangeRef = useRef(onPayloadChange)
  onPayloadChangeRef.current = onPayloadChange

  useEffect(() => {
    if (!onPayloadChange) return
    const id = window.setInterval(() => {
      onPayloadChangeRef.current?.(serializeCodeWorkspace(workspace, title))
    }, 600)
    return () => window.clearInterval(id)
  }, [onPayloadChange, workspace, title])

  const handleSave = useCallback(() => {
    downloadExportedContext('code', runtimeHandle, 'envelope-json', title)
  }, [runtimeHandle, title])

  const handleExport = useCallback(
    (formatId: string) => {
      downloadExportedContext('code', runtimeHandle, formatId as 'zip', title)
    },
    [runtimeHandle, title],
  )

  const alternateFileKind = useMemo(
    () => (activeFile ? alternateFileKindFromPath(activeFile.path) : null),
    [activeFile],
  )

  const altView = useMemo(() => {
    if (!activeFile) return 'code' as const
    return resolveAltViewForFile(activeFile.path, altViewsByFile[activeFile.id])
  }, [activeFile, altViewsByFile])

  const searchAdapter = useMemo(
    () => resolveSearchAdapter(alternateFileKind, altView),
    [alternateFileKind, altView],
  )
  const searchAdapterLabel = searchAdapterScopeLabel(searchAdapter)

  const openFiles = useMemo(
    () =>
      workspace.openIds
        .map((id) => fileById(workspace.files, id))
        .filter((file): file is CodeFile => Boolean(file))
        .filter((file) =>
          explorerLanguage ? isCodingExplorerVisiblePath(file.path, explorerLanguage) : true,
        ),
    [explorerLanguage, workspace.openIds, workspace.files],
  )

  activeIdRef.current = workspace.activeId

  useEffect(() => {
    if (!sectionChrome || !explorerLanguage) return
    const ids = workspace.files
      .filter(
        (f) =>
          f.path.startsWith('src/') &&
          isCodingExplorerVisiblePath(f.path, explorerLanguage),
      )
      .map((f) => f.id)
    if (!ids.length) return
    setWorkspace((prev) => {
      const have = new Set(prev.openIds)
      const missing = ids.filter((id) => !have.has(id))
      if (!missing.length) return prev
      return { ...prev, openIds: [...prev.openIds, ...missing] }
    })
  }, [explorerLanguage, sectionChrome, workspace.files])

  useEffect(() => {
    const monaco = monacoApiRef.current
    if (!monaco) return
    const sliceFiles = explorerLanguage
      ? visibleCodingExplorerFiles(workspace.files, explorerLanguage)
          .filter((f) => f.path.startsWith('src/'))
          .map((f) => ({ path: f.path, content: f.buffer }))
      : workspace.files
          .filter((f) => f.path.startsWith('src/'))
          .map((f) => ({ path: f.path, content: f.buffer }))
    const lang =
      explorerLanguage ||
      (activeFile &&
        resolveCodingLanguageForFile(
          activeFile.path,
          activeFile.language,
          allowedLanguages?.length ? [...allowedLanguages] : ['typescript', 'javascript', 'python'],
        )) ||
      allowedLanguages?.[0] ||
      'typescript'
    const markers = workspaceImportMarkers(sliceFiles, lang)
    const byPath = new Map<string, typeof markers>()
    for (const m of markers) {
      const list = byPath.get(m.path) ?? []
      list.push(m)
      byPath.set(m.path, list)
    }
    for (const file of workspace.files) {
      const uri = monaco.Uri.parse(monacoPathForWorkspace(file.path))
      const model = monaco.editor.getModel(uri)
      if (!model) continue
      const rows = byPath.get(file.path) ?? []
      monaco.editor.setModelMarkers(
        model,
        'vurify-imports',
        rows.map((m) => ({
          startLineNumber: m.line,
          startColumn: m.column,
          endLineNumber: m.line,
          endColumn: m.column + 8,
          message: m.message,
          severity: monaco.MarkerSeverity.Error,
        })),
      )
    }
  }, [activeFile, allowedLanguages, workspace.files])

  useEffect(() => {
    const openSet = new Set(workspace.openIds)
    for (const id of editorsRef.current.keys()) {
      if (!openSet.has(id)) editorsRef.current.delete(id)
    }
  }, [workspace.openIds])

  const handleAltViewChange = useCallback(
    (view: CodeEditorAltView) => {
      if (!activeFile || !alternateFileKind) return
      if (!isAltViewAllowed(alternateFileKind, view)) return
      setAltViewsByFile((prev) => ({ ...prev, [activeFile.id]: view }))
    },
    [activeFile, alternateFileKind],
  )

  const updateFile = useCallback((id: string, patch: Partial<CodeFile>) => {
    setWorkspace((prev) => ({
      ...prev,
      files: prev.files.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    }))
  }, [])

  const openFile = useCallback((id: string) => {
    setWorkspace((prev) => ({
      ...prev,
      activeId: id,
      openIds: prev.openIds.includes(id) ? prev.openIds : [...prev.openIds, id],
    }))
  }, [])

  useEffect(() => {
    if (!explorerLanguage || !workspace.activeId) return
    const active = fileById(workspace.files, workspace.activeId)
    if (!active || isCodingExplorerVisiblePath(active.path, explorerLanguage)) return
    const solvePath = codingSolvePath(explorerLanguage)
    const next =
      (solvePath && workspace.files.find((f) => f.path === solvePath)) ||
      explorerFiles.find((f) => f.path.startsWith('src/')) ||
      explorerFiles[0]
    if (next) openFile(next.id)
  }, [explorerFiles, explorerLanguage, openFile, workspace.activeId, workspace.files])

  const openSearchHit = useCallback((fileId: string, line: number, column: number) => {
    setPendingJump({ fileId, line, column })
    openFile(fileId)
  }, [openFile])

  const getEditor = useCallback(() => editorRef.current, [])

  const openEditorSearch = useCallback(() => {
    setExplorerOpen(true)
    setSidebarView('search')
    setSearchScope('editor')
    setExplorerWidth((w) => Math.max(w, EDITOR_FIND_MIN_WIDTH))
  }, [])
  openEditorSearchRef.current = openEditorSearch

  const selectSidebarView = useCallback((view: CodeEditorSidebarView) => {
    if (explorerOpen && sidebarView === view) {
      setExplorerOpen(false)
      return
    }
    setExplorerOpen(true)
    setSidebarView(view)
    if (view === 'search') {
      setExplorerWidth((w) => Math.max(w, EDITOR_FIND_MIN_WIDTH))
      if (searchAdapter !== 'monaco') {
        setSearchScope('editor')
      }
    }
  }, [explorerOpen, searchAdapter, sidebarView])

  useEffect(() => {
    if (searchAdapter === 'pdf') {
      setSearchScope('editor')
    }
  }, [searchAdapter, workspace.activeId])

  const handleSearchScopeChange = useCallback((scope: CodeEditorSearchScope) => {
    setSearchScope(scope)
    if (scope === 'editor') {
      setExplorerOpen(true)
      setSidebarView('search')
      setExplorerWidth((w) => Math.max(w, EDITOR_FIND_MIN_WIDTH))
    }
  }, [])

  useEffect(() => {
    if (!pendingJump || workspace.activeId !== pendingJump.fileId) return
    const editor = editorsRef.current.get(pendingJump.fileId)
    if (!editor) return
    jumpEditorToLine(editor, pendingJump.line, pendingJump.column)
    setPendingJump(null)
  }, [pendingJump, workspace.activeId])

  const closeTab = useCallback((id: string) => {
    setWorkspace((prev) => {
      const openIds = prev.openIds.filter((x) => x !== id)
      const activeId =
        prev.activeId === id ? (openIds[openIds.length - 1] ?? null) : prev.activeId
      return { ...prev, openIds, activeId }
    })
  }, [])

  const handleEditorMount = useCallback(
    (fileId: string): OnMount =>
      (editor, monaco) => {
        editorsRef.current.set(fileId, editor)
        if (activeIdRef.current === fileId) {
          editorRef.current = editor
        }
        // Keep JS/TS IntelliSense on — not disabled; ensure defaults are eager.
        try {
          monacoApiRef.current = monaco
          monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true)
          monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true)
          monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
            ...monaco.languages.typescript.typescriptDefaults.getCompilerOptions(),
            allowNonTsExtensions: true,
            target: monaco.languages.typescript.ScriptTarget.ESNext,
            module: monaco.languages.typescript.ModuleKind.ESNext,
            moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
            allowJs: true,
            checkJs: false,
          })
          monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
            ...monaco.languages.typescript.javascriptDefaults.getCompilerOptions(),
            allowNonTsExtensions: true,
            target: monaco.languages.typescript.ScriptTarget.ESNext,
            allowJs: true,
            checkJs: false,
          })
          installMdnHover(monaco as Parameters<typeof installMdnHover>[0], {
            blockAllHttps: chrome === 'section',
          })
          installWorkspaceCompletions(monaco as Parameters<typeof installWorkspaceCompletions>[0], () =>
            (workspaceRef.current?.files ?? []).map((f) => ({
              path: f.path,
              language: resolveEditorLanguage(f.path, f.language),
              content: f.buffer,
            })),
          )
          const mounted = (workspaceRef.current?.files ?? []).find((f) => f.id === fileId)
          if (mounted) {
            const lang = resolveEditorLanguage(mounted.path, mounted.language)
            const model = editor.getModel()
            if (model && model.getLanguageId() !== lang) monaco.editor.setModelLanguage(model, lang)
          }
        } catch {
          /* workers optional */
        }
        editor.addAction({
          id: 'code-editor-sidebar-find',
          label: 'Find in sidebar',
          keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF],
          run: () => {
            openEditorSearchRef.current()
          },
        })
        editor.onDidChangeCursorPosition((e) => {
          if (activeIdRef.current !== fileId) return
          setCursor({ line: e.position.lineNumber, column: e.position.column })
        })
        const jump = pendingJumpRef.current
        if (jump && jump.fileId === fileId) {
          jumpEditorToLine(editor, jump.line, jump.column)
          setPendingJump(null)
        }
      },
    [chrome],
  )

  const handleBufferChange = useCallback(
    (fileId: string) => (value: string | undefined) => {
      const next = value ?? ''
      setWorkspace((prev) => {
        const file = fileById(prev.files, fileId)
        if (file) {
          editStacksRef.current = coalesceEdit(
            editStacksRef.current,
            file.path,
            file.buffer,
            next,
          )
        }
        return {
          ...prev,
          files: prev.files.map((f) => (f.id === fileId ? { ...f, buffer: next } : f)),
        }
      })
    },
    [],
  )

  const saveActive = useCallback(() => {
    if (!activeFile) return
    updateFile(activeFile.id, { content: activeFile.buffer })
  }, [activeFile, updateFile])

  const saveAll = useCallback(() => {
    setWorkspace((prev) => ({
      ...prev,
      files: prev.files.map((f) =>
        isDirty(f) ? { ...f, content: f.buffer } : f,
      ),
    }))
  }, [])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey)) return
      const key = e.key.toLowerCase()
      if (key === 's') {
        e.preventDefault()
        if (e.shiftKey) saveAll()
        else saveActive()
        return
      }
      if (key === 'f' && altView !== 'code') {
        e.preventDefault()
        openEditorSearchRef.current()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [altView, saveActive, saveAll])

  const appendTerminal = useCallback((lines: string[] | CodeTerminalItem[]) => {
    setTerminalItems((prev) => appendTerminalPayload(prev, lines))
  }, [])

  const clearTerminal = useCallback(() => {
    setTerminalItems([])
  }, [])

  const beginRunTerminalBatch = useCallback(() => {
    setTerminalItems((prev) => {
      const hasSubstance = prev.some(
        (item) => item.kind !== 'divider' && !(item.kind === 'text' && !item.text.trim()),
      )
      if (!hasSubstance) return prev
      const last = prev[prev.length - 1]
      if (last?.kind === 'divider') return prev
      return [...prev, { kind: 'divider' }]
    })
  }, [])

  const openWorkspacePath = useCallback(
    (path: string, loc?: { line?: number; column?: number }) => {
      const resolved = resolveTerminalWorkspacePath(path, workspace.files)
      const file = resolved
        ? workspace.files.find((f) => f.path === resolved)
        : undefined
      if (!file) return false
      if (loc?.line) {
        openSearchHit(file.id, loc.line, loc.column ?? 1)
      } else {
        openFile(file.id)
      }
      return true
    },
    [openFile, openSearchHit, workspace.files],
  )

  const highlightWorkspaceRange = useCallback(
    (path: string, startLine?: number, endLine?: number) => {
      const opened = openWorkspacePath(path, startLine ? { line: startLine } : undefined)
      if (!opened) return false
      const resolved = resolveTerminalWorkspacePath(path, workspace.files)
      const file = resolved
        ? workspace.files.find((f) => f.path === resolved)
        : undefined
      window.requestAnimationFrame(() => {
        const editor = (file ? editorsRef.current.get(file.id) : null) ?? editorRef.current
        if (!editor) return
        try {
          highlightEditorLineRange(editor, startLine ?? 1, endLine)
        } catch {
          /* DiffEditor / model already disposed */
        }
      })
      return true
    },
    [openWorkspacePath, workspace.files],
  )

  const publishPending = useCallback(() => {
    onPendingDiffChangeRef.current?.(pendingQueueRef.current.map((f) => ({ path: f.path })))
  }, [])

  const showPendingFile = useCallback(
    (file: { id?: string; path: string; original: string; next: string; language: string }) => {
      const path = String(file.path ?? '').trim()
      if (path) openWorkspacePath(path)
      setDiffProposal(file)
    },
    [openWorkspacePath],
  )

  const finishPendingSession = useCallback(
    (v: 'accepted' | 'rejected' | 'miss') => {
      proposalSettleRef.current?.(v)
      proposalSettleRef.current = null
      pendingFileDecisionRef.current = undefined
      pendingQueueRef.current = []
      pendingAcceptedRef.current = false
      setDiffProposal(null)
      publishPending()
    },
    [publishPending],
  )

    const settlePendingFile = useCallback(
    (path: string, accept: boolean) => {
      const needle = path.trim()
      const hit = pendingQueueRef.current.find(
        (f) =>
          f.id === needle ||
          f.path === needle ||
          f.path.endsWith(`/${needle}`),
      )
      if (!hit || !proposalSettleRef.current) return
      const decision = accept ? 'accepted' : 'rejected'
      if (accept) pendingAcceptedRef.current = true
      pendingQueueRef.current = pendingQueueRef.current.filter((f) => f !== hit)
      publishPending()
      void Promise.resolve(pendingFileDecisionRef.current?.(hit.id || hit.path, decision)).finally(() => {
        if (!proposalSettleRef.current) return
        const next = pendingQueueRef.current[0]
        if (!next) {
          finishPendingSession(pendingAcceptedRef.current ? 'accepted' : 'rejected')
          return
        }
        showPendingFile(next)
      })
    },
    [finishPendingSession, publishPending, showPendingFile],
  )

  const focusPendingFile = useCallback(
    (path: string) => {
      const needle = path.trim()
      const hit = pendingQueueRef.current.find(
        (f) =>
          f.id === needle ||
          f.path === needle ||
          f.path.endsWith(`/${needle}`),
      )
      if (!hit) return false
      showPendingFile(hit)
      return true
    },
    [showPendingFile],
  )

  const proposeDiff = useCallback(
    (input: {
      path?: string
      original?: string
      next?: string
        files?: readonly { id?: string; path: string; original: string; next: string }[]
      signal?: AbortSignal
      onFileDecision?: (path: string, decision: 'accepted' | 'rejected') => void | Promise<void>
    }) => {
      return new Promise<'accepted' | 'rejected' | 'miss' | 'replaced'>((resolve) => {
        const prev = proposalSettleRef.current
        proposalSettleRef.current = resolve
        prev?.('replaced')
        pendingAcceptedRef.current = false
        pendingFileDecisionRef.current = input.onFileDecision
        const raw =
          input.files && input.files.length
            ? input.files
            : input.path
              ? [{ path: input.path, original: input.original ?? '', next: input.next ?? '' }]
              : []
        const files = raw
          .map((f) => {
            const path = String(f.path ?? '').trim()
            const file = path
              ? workspaceRef.current?.files.find((row) => row.path === path || row.path.endsWith(`/${path}`))
              : null
            return {
              id: 'id' in f && typeof f.id === 'string' ? f.id : undefined,
              path: path || 'file',
              original: f.original,
              next: f.next,
              language: resolveEditorLanguage(path || 'file.txt', file?.language),
            }
          })
          .filter((f) => f.path)
        pendingQueueRef.current = files
        const onAbort = () => finishPendingSession('miss')
        input.signal?.addEventListener('abort', onAbort, { once: true })
        if (!files.length) {
          finishPendingSession('miss')
          return
        }
        publishPending()
        showPendingFile(files[0])
      })
    },
    [finishPendingSession, publishPending, showPendingFile],
  )

  useEffect(
    () => () => {
      proposalSettleRef.current?.('miss')
      proposalSettleRef.current = null
      pendingQueueRef.current = []
      onPendingDiffChangeRef.current?.([])
    },
    [],
  )

  useImperativeHandle(
    ref,
    () => ({
      ...runtimeHandle,
      openWorkspacePath,
      highlightWorkspaceRange,
      proposeDiff,
      settlePendingFile,
      focusPendingFile,
    }),
    [openWorkspacePath, highlightWorkspaceRange, proposeDiff, settlePendingFile, focusPendingFile, runtimeHandle],
  )

  const applyEditToWorkspace = useCallback((path: string, content: string) => {
    setWorkspace((prev) => {
      const file = prev.files.find((f) => f.path === path)
      if (!file) return prev
      return {
        ...prev,
        activeId: file.id,
        openIds: prev.openIds.includes(file.id) ? prev.openIds : [...prev.openIds, file.id],
        files: prev.files.map((f) =>
          f.id === file.id ? { ...f, buffer: content } : f,
        ),
      }
    })
  }, [])

  const handleWorkspaceUndo = useCallback(() => {
    const popped = popUndo(editStacksRef.current)
    if (!popped) {
      editorRef.current?.trigger('toolbar', 'undo', null)
      return
    }
    editStacksRef.current = popped.stacks
    const entry = popped.entry
    if (entry.kind === 'edit') {
      applyEditToWorkspace(entry.path, entry.before)
      return
    }
    if (entry.kind === 'create') {
      setWorkspace((prev) => {
        const file = prev.files.find((f) => f.path === entry.path)
        if (!file) return prev
        const files = prev.files.filter((f) => f.id !== file.id)
        const openIds = prev.openIds.filter((id) => id !== file.id)
        return {
          ...prev,
          files,
          openIds,
          activeId: openIds[openIds.length - 1] ?? files[0]?.id ?? null,
        }
      })
      return
    }
    if (entry.kind === 'delete') {
      const file = createFile(entry.path, entry.before)
      setWorkspace((prev) => ({
        ...prev,
        files: [...prev.files, file],
        openIds: [...prev.openIds, file.id],
        activeId: file.id,
      }))
      return
    }
    openWorkspacePath(entryPath(entry))
  }, [applyEditToWorkspace, openWorkspacePath])

  const handleWorkspaceRedo = useCallback(() => {
    const popped = popRedo(editStacksRef.current)
    if (!popped) {
      editorRef.current?.trigger('toolbar', 'redo', null)
      return
    }
    editStacksRef.current = popped.stacks
    const entry = popped.entry
    if (entry.kind === 'edit') {
      applyEditToWorkspace(entry.path, entry.after)
      return
    }
    if (entry.kind === 'create') {
      const file = createFile(entry.path, entry.after)
      setWorkspace((prev) => ({
        ...prev,
        files: [...prev.files, file],
        openIds: [...prev.openIds, file.id],
        activeId: file.id,
      }))
      return
    }
    if (entry.kind === 'delete') {
      setWorkspace((prev) => {
        const file = prev.files.find((f) => f.path === entry.path)
        if (!file) return prev
        const files = prev.files.filter((f) => f.id !== file.id)
        const openIds = prev.openIds.filter((id) => id !== file.id)
        return {
          ...prev,
          files,
          openIds,
          activeId: openIds[openIds.length - 1] ?? files[0]?.id ?? null,
        }
      })
      return
    }
    openWorkspacePath(entry.to)
  }, [applyEditToWorkspace, openWorkspacePath])

  const revealTerminalLocation = useCallback(
    (path: string, line: number, column: number, kind?: 'error' | 'pass') => {
      const resolved = resolveTerminalWorkspacePath(path, workspace.files)
      const file = resolved
        ? workspace.files.find((f) => f.path === resolved)
        : undefined
      if (!file) return
      const maxLine = Math.max(1, file.buffer.split(/\r?\n/).length)
      const nextLine = Math.min(Math.max(1, line), maxLine)
      setAltViewsByFile((prev) =>
        prev[file.id] && prev[file.id] !== 'code'
          ? { ...prev, [file.id]: 'code' }
          : prev,
      )
      setTerminalOpen(true)
      openSearchHit(file.id, nextLine, column)
      window.setTimeout(() => {
        const editor = editorsRef.current.get(file.id)
        highlightEditorLine(editor ?? null, nextLine, 2200, kind ?? 'default')
      }, 60)
    },
    [openSearchHit, workspace.files],
  )

  const handleRunClick = useCallback(async () => {
    setTerminalOpen(true)
    if (!onRun) {
      beginRunTerminalBatch()
      appendTerminal(['Run is not connected for this workspace.'])
      return
    }
    if (runBusy) return
    setRunBusy(true)
    beginRunTerminalBatch()
    try {
      const files = workspace.files.map((file) => {
        const editor = editorsRef.current.get(file.id)
        if (!editor) return file
        const next = editor.getValue()
        return next === file.buffer ? file : { ...file, buffer: next }
      })
      const flushed = { ...workspace, files }
      await onRun({
        appendTerminal,
        getPayload: () => serializeCodeWorkspace(flushed, title),
        activeLanguage: explorerLanguage,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      appendTerminal([`Run failed: ${msg}`])
    } finally {
      setRunBusy(false)
    }
  }, [appendTerminal, beginRunTerminalBatch, explorerLanguage, onRun, runBusy, title, workspace])

  const handleTerminalSubmit = useCallback(
    (line: string) => {
      const out = runStubTerminalCommand(line)
      if (out[0] === '__CLEAR__') {
        setTerminalItems([])
        return
      }
      appendTerminal(out)
    },
    [appendTerminal],
  )

  const uploadDefaultFolder = useMemo(() => {
    if (!activeFile) return null
    return dirname(activeFile.path) || null
  }, [activeFile])

  const uploadFolderOptions = useMemo(
    () => [
      { value: '', label: 'Workspace root' },
      ...allFolderPaths(explorerFiles, explorerFolders)
        .sort((a, b) => a.localeCompare(b))
        .map((path) => ({ value: path, label: path })),
    ],
    [explorerFiles, explorerFolders],
  )

  const openUploadModal = useCallback(() => {
    if (readOnly) return
    setUploadError(null)
    setModal('upload')
  }, [readOnly])

  const openNewFileModal = useCallback(
    (folderPath: string | null = null) => {
      if (readOnly) return
      const parent = sectionChrome
        ? constrainToSrcFolder(
            folderPath ?? (activeFile && isSrcTreePath(dirname(activeFile.path)) ? dirname(activeFile.path) : 'src'),
          )
        : (folderPath ?? (activeFile ? dirname(activeFile.path) || null : null))
      const lang = explorerLanguage || allowedLanguages?.[0] || null
      const ext = (lang && codingLanguageExtension(lang)) || 'js'
      if (sectionChrome) {
        setNewFileFolder(parent || 'src')
        setNewFileStem('untitled')
        setPathDraft('')
      } else {
        const base = parent ? `${parent}/` : 'src/'
        setPathDraft(`${base}untitled.${ext}`)
      }
      setPathError(null)
      setModal('new')
    },
    [activeFile, allowedLanguages, explorerLanguage, readOnly, sectionChrome],
  )

  const openNewFolderModal = useCallback(
    (folderPath: string | null = null) => {
      if (readOnly) return
      if (sectionChrome) {
        const parent = constrainToSrcFolder(
          folderPath ?? (activeFile && isSrcTreePath(dirname(activeFile.path)) ? dirname(activeFile.path) : 'src'),
        )
        setNewFileFolder(parent)
        setNewFileStem('untitled')
        setPathDraft('')
      } else {
        const parent =
          folderPath ?? (activeFile ? dirname(activeFile.path) || null : null)
        setPathDraft(defaultPathInFolder(parent, 'folder'))
      }
      setPathError(null)
      setModal('new-folder')
    },
    [activeFile, readOnly, sectionChrome],
  )

  const deleteFolder = useCallback(
    (folderPath: string) => {
      if (readOnly) return
      if (!canDeleteFolderPath(folderPath)) return
      setWorkspace((prev) => {
        const { files, folders } = removeFolderSubtree(prev.files, prev.folders, folderPath)
        const removedIds = new Set(
          prev.files.filter((f) => !files.some((x) => x.id === f.id)).map((f) => f.id),
        )
        const openIds = prev.openIds.filter((id) => !removedIds.has(id))
        const activeId =
          prev.activeId && removedIds.has(prev.activeId)
            ? (openIds[openIds.length - 1] ?? files[0]?.id ?? null)
            : prev.activeId
        return { files, folders, openIds, activeId }
      })
    },
    [canDeleteFolderPath, readOnly],
  )

  const deleteFile = useCallback(
    (id: string) => {
      if (readOnly) return
      if (!canDeleteFileId(id)) return
      setWorkspace((prev) => {
        const doomed = prev.files.find((f) => f.id === id)
        if (doomed) {
          editStacksRef.current = pushWorkspaceEdit(editStacksRef.current, {
            kind: 'delete',
            path: doomed.path,
            before: doomed.buffer,
          })
        }
        const files = prev.files.filter((f) => f.id !== id)
        const openIds = prev.openIds.filter((x) => x !== id)
        const activeId =
          prev.activeId === id
            ? (openIds[openIds.length - 1] ?? files[0]?.id ?? null)
            : prev.activeId
        return { ...prev, files, openIds, activeId }
      })
    },
    [canDeleteFileId, readOnly],
  )

  const handleFileAction = useCallback(
    (action: CodeEditorFileAction) => {
      const mutateActions: CodeEditorFileAction[] = [
        'new',
        'new-folder',
        'upload',
        'rename',
        'delete',
      ]
      if (readOnly && mutateActions.includes(action)) return
      switch (action) {
        case 'new':
          openNewFileModal(null)
          break
        case 'new-folder':
          openNewFolderModal(null)
          break
        case 'upload':
          openUploadModal()
          break
        case 'rename':
          if (!activeFile) return
          if (isInterviewSeedPath(activeFile.path)) return
          if (sectionChrome) {
            setNewFileFolder(constrainToSrcFolder(dirname(activeFile.path) || 'src'))
            setNewFileStem(stemWithoutExtension(basename(activeFile.path), lockedCodingExt))
            setPathDraft('')
          } else {
            setPathDraft(activeFile.path)
          }
          setPathError(null)
          setModal('rename')
          break
        case 'delete':
          if (!activeFile) return
          deleteFile(activeFile.id)
          break
        case 'save':
          saveActive()
          break
        case 'save-all':
          saveAll()
          break
        case 'download':
          if (!activeFile) return
          downloadText(basename(activeFile.path), activeFile.buffer)
          break
        case 'copy':
          if (!activeFile) return
          void navigator.clipboard.writeText(activeFile.buffer)
          break
        case 'help':
          setModal('help')
          break
      }
    },
    [activeFile, deleteFile, isInterviewSeedPath, lockedCodingExt, openNewFileModal, openNewFolderModal, openUploadModal, readOnly, saveActive, saveAll, sectionChrome],
  )

  const handleUploadConfirm = useCallback(
    async (files: File[], folder: string) => {
      if (files.length === 0) return
      setUploadBusy(true)
      setUploadError(null)
      try {
        const dest = sectionChrome ? constrainToSrcFolder(folder) : folder
        const imported = await importUploadedFiles(
          files,
          dest,
          workspace.files,
          workspace.folders,
        )
        const parent = sectionChrome ? dest : normalizePath(folder)
        setWorkspace((prev) => ({
          ...prev,
          files: [...prev.files, ...imported],
          folders: parent ? addFolder(prev.folders, parent) : prev.folders,
          openIds: [...prev.openIds, ...imported.map((file) => file.id)],
          activeId: imported[imported.length - 1]?.id ?? prev.activeId,
        }))
        setAltViewsByFile((prev) => {
          const next = { ...prev }
          for (const file of imported) {
            const kind = alternateFileKindFromPath(file.path)
            if (kind === 'pdf' || kind === 'markdown') {
              next[file.id] = 'preview'
            }
          }
          return next
        })
        setModal(null)
      } catch (error) {
        setUploadError(error instanceof Error ? error.message : 'Upload failed.')
      } finally {
        setUploadBusy(false)
      }
    },
    [sectionChrome, workspace.files, workspace.folders],
  )

  const confirmPathModal = useCallback(() => {
    const resolveSectionFilePath = (): string | null => {
      const stem = stemWithoutExtension(newFileStem, lockedCodingExt)
      const folder = constrainToSrcFolder(newFileFolder)
      if (!stem) {
        setPathError('Enter a file name')
        return null
      }
      return `${folder}/${stem}.${lockedCodingExt}`
    }
    const resolveSectionFolderPath = (): string | null => {
      const name = sanitizeFileStem(newFileStem)
      const folder = constrainToSrcFolder(newFileFolder)
      if (!name) {
        setPathError('Enter a folder name')
        return null
      }
      return `${folder}/${name}`
    }

    let path = normalizePath(pathDraft)
    if (sectionChrome && (modal === 'new' || modal === 'rename')) {
      const next = resolveSectionFilePath()
      if (!next) return
      path = normalizePath(next)
    } else if (sectionChrome && modal === 'new-folder') {
      const next = resolveSectionFolderPath()
      if (!next) return
      path = normalizePath(next)
    }

    if (!path) {
      setPathError(sectionChrome ? 'Enter a name' : 'Enter a path')
      return
    }
    if (sectionChrome && !isSrcTreePath(path) && path !== 'src') {
      setPathError('Files can only be created under src/')
      return
    }
    if (modal === 'new') {
      if (pathExists(workspace.files, workspace.folders, path)) {
        setPathError('A file or folder already uses this path')
        return
      }
      const file = createFile(path, '')
      const parent = dirname(path)
      editStacksRef.current = pushWorkspaceEdit(editStacksRef.current, {
        kind: 'create',
        path,
        after: '',
      })
      setWorkspace((prev) => ({
        ...prev,
        files: [...prev.files, file],
        folders: parent ? addFolder(prev.folders, parent) : prev.folders,
        openIds: [...prev.openIds, file.id],
        activeId: file.id,
      }))
      setModal(null)
      return
    }
    if (modal === 'new-folder') {
      if (pathExists(workspace.files, workspace.folders, path)) {
        setPathError('A file or folder already uses this path')
        return
      }
      setWorkspace((prev) => ({
        ...prev,
        folders: addFolder(prev.folders, path),
      }))
      setModal(null)
      return
    }
    if (modal === 'rename' && activeFile) {
      if (isInterviewSeedPath(activeFile.path)) {
        setPathError('Starter files cannot be renamed')
        return
      }
      const oldPath = normalizePath(activeFile.path)
      if (
        path !== oldPath &&
        pathExists(workspace.files, workspace.folders, path)
      ) {
        setPathError('A file or folder already uses this path')
        return
      }
      const language = languageFromPath(path)
      if (path !== oldPath) {
        renameMonacoModelPath(oldPath, path, language)
      }
      const parent = dirname(path)
      setWorkspace((prev) => ({
        ...prev,
        files: prev.files.map((f) =>
          f.id === activeFile.id
            ? { ...f, path, language }
            : f,
        ),
        folders: parent ? addFolder(prev.folders, parent) : prev.folders,
      }))
      setModal(null)
    }
  }, [
    activeFile,
    isInterviewSeedPath,
    lockedCodingExt,
    modal,
    newFileFolder,
    newFileStem,
    pathDraft,
    sectionChrome,
    workspace.files,
    workspace.folders,
  ])

  const startExplorerResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    const startX = event.clientX
    const startW = explorerWidth
    const onMove = (e: PointerEvent) => {
      const next = Math.min(EXPLORER_MAX, Math.max(EXPLORER_MIN, startW + (e.clientX - startX)))
      setExplorerWidth(next)
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const startTerminalResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    const startY = event.clientY
    const startH = terminalHeight
    const onMove = (e: PointerEvent) => {
      const next = Math.min(TERMINAL_MAX, Math.max(TERMINAL_MIN, startH - (e.clientY - startY)))
      setTerminalHeight(next)
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const editorFindActive =
    explorerOpen && sidebarView === 'search' && searchScope === 'editor'
  const shellExplorerWidth = editorFindActive
    ? Math.max(explorerWidth, EDITOR_FIND_MIN_WIDTH)
    : explorerWidth

  const shellStyle = {
    '--theme-code-explorer-width': `${shellExplorerWidth}px`,
    '--theme-code-terminal-height': `${terminalHeight}px`,
  } as CSSProperties

  const pathModalTitle =
    modal === 'new' ? 'New file' : modal === 'new-folder' ? 'New folder' : 'Rename file'
  const pathModalConfirm =
    modal === 'new' ? 'Create' : modal === 'new-folder' ? 'Create folder' : 'Rename'
  const pathModalLabel = sectionChrome
    ? modal === 'new-folder'
      ? 'Folder name'
      : 'File name'
    : modal === 'new-folder'
      ? 'Folder path'
      : 'Path'
  const sittingFieldProps = sectionChrome ? { 'data-sitting-copy-ok': '' as const } : {}

  return (
    <div
      className={[
        'theme-code-editor',
        embed ? 'theme-code-editor--embed' : '',
        sectionChrome ? 'theme-code-editor--section' : '',
        editorFindActive ? 'theme-code-editor--editor-find' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={shellStyle}
    >
      <CodeEditorToolbar
        title={title}
        onTitleChange={setTitle}
        hasActiveFile={Boolean(activeFile)}
        hasDirty={hasDirty}
        language={explorerLanguage ?? (activeFile ? resolveEditorLanguage(activeFile.path, activeFile.language) : 'plaintext')}
        onLanguageChange={(id) => {
          if (readOnly) return
          if (sectionChrome) {
            setSrcLanguage(id)
            const next = pickVisibleCodingFile(workspace.files, id, activeFile?.path)
            if (next) openFile(next.id)
            return
          }
          if (!activeFile) return
          updateFile(activeFile.id, { language: id })
        }}
        activeFilePath={activeFile?.path}
        allowedLanguages={languageMenuIds ?? allowedLanguages}
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        wordWrap={wordWrap}
        onToggleWordWrap={() => setWordWrap((v) => !v)}
        minimap={minimap}
        onToggleMinimap={() => setMinimap((v) => !v)}
        sidebarOpen={explorerOpen}
        sidebarView={sidebarView}
        onSelectSidebarView={selectSidebarView}
        terminalOpen={terminalOpen}
        onToggleTerminal={() => setTerminalOpen((v) => !v)}
        onUndo={handleWorkspaceUndo}
        onRedo={handleWorkspaceRedo}
        onRun={() => {
          void handleRunClick()
        }}
        runBusy={runBusy}
        onFileAction={handleFileAction}
        onSave={handleSave}
        onExport={handleExport}
        alternateFileKind={alternateFileKind}
        altView={altView}
        onAltViewChange={handleAltViewChange}
        chrome={chrome}
        readOnly={readOnly}
      />

      <div className="theme-code-editor__body">
        <CodeEditorSearchHostProvider activeFileId={workspace.activeId}>
        <div
          className={[
            'theme-code-editor__explorer',
            explorerOpen ? '' : 'theme-code-editor__explorer--closed',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-hidden={!explorerOpen}
        >
          <div className="theme-code-editor__explorer-inner">
            <CodeEditorSidebar
              view={sidebarView}
              searchScope={searchScope}
              searchAdapter={searchAdapter}
              searchAdapterLabel={searchAdapterLabel}
              onSearchScopeChange={handleSearchScopeChange}
              files={explorerFiles}
              folders={explorerFolders}
              activeId={workspace.activeId}
              getEditor={getEditor}
              onOpen={openFile}
              onDeleteFile={readOnly ? undefined : deleteFile}
              onNewFileInFolder={readOnly ? undefined : openNewFileModal}
              onNewFolderInFolder={readOnly ? undefined : openNewFolderModal}
              onDeleteFolder={readOnly ? undefined : deleteFolder}
              canDeleteFile={sectionChrome ? canDeleteFileId : undefined}
              canDeleteFolder={sectionChrome ? canDeleteFolderPath : undefined}
              canCreateInFolder={sectionChrome ? canCreateInFolderPath : undefined}
              onOpenSearchHit={openSearchHit}
            />
          </div>
        </div>
        <div
          className={[
            'theme-code-editor__split theme-code-editor__split--v',
            explorerOpen ? '' : 'theme-code-editor__split--v-closed',
          ]
            .filter(Boolean)
            .join(' ')}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize explorer"
          aria-hidden={!explorerOpen}
          onPointerDown={explorerOpen ? startExplorerResize : undefined}
        />
        <div className="theme-code-editor__main">
          <CodeEditorTabBar
            files={explorerFiles}
            openIds={workspace.openIds.filter((id) => explorerFiles.some((f) => f.id === id))}
            activeId={workspace.activeId}
            onSelect={openFile}
            onClose={closeTab}
          />
          <div
            className="theme-code-editor__stage"
            {...(sectionChrome
              ? { 'data-sitting-copy-ok': '', 'data-copy-surface': 'editor' }
              : {})}
          >
            {openFiles.length > 0 ? (
              openFiles.map((file) => (
                <CodeEditorStageFile
                  key={file.id}
                  file={file}
                  isActiveFile={workspace.activeId === file.id}
                  fileAltView={resolveAltViewForFile(file.path, altViewsByFile[file.id])}
                  monacoTheme={monacoTheme}
                  fontSize={fontSize}
                  wordWrap={wordWrap}
                  minimap={minimap}
                  onBufferChange={handleBufferChange}
                  onEditorMount={handleEditorMount}
                  onSourceChange={(fileId, next) => updateFile(fileId, { buffer: next })}
                  readOnly={readOnly}
                />
              ))
            ) : (
              <div className="theme-code-editor__empty">
                <p className="type-body-sm type-muted">Open a file or create one from File.</p>
              </div>
            )}
            {diffProposal ? (
              <WorkbenchDiffProposal
                key={`${diffProposal.id || diffProposal.path}:${diffProposal.next.length}:${diffProposal.next.slice(0, 48)}`}
                original={diffProposal.original}
                next={diffProposal.next}
                language={diffProposal.language}
                monacoTheme={monacoTheme}
                fontSize={fontSize}
                pathLabel={diffProposal.path}
                onAccept={() => settlePendingFile(diffProposal.id || diffProposal.path, true)}
                onReject={() => settlePendingFile(diffProposal.id || diffProposal.path, false)}
              />
            ) : null}
          </div>
          <div
            className={[
              'theme-code-editor__split theme-code-editor__split--h',
              terminalOpen ? '' : 'theme-code-editor__split--h-closed',
            ]
              .filter(Boolean)
              .join(' ')}
            role="separator"
            aria-orientation="horizontal"
            aria-label="Resize terminal"
            aria-hidden={!terminalOpen}
            onPointerDown={terminalOpen ? startTerminalResize : undefined}
          />
          <div
            className={[
              'theme-code-editor__terminal-host',
              terminalOpen ? '' : 'theme-code-editor__terminal-host--closed',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-hidden={!terminalOpen}
            {...(sectionChrome
              ? { 'data-sitting-copy-ok': '', 'data-copy-surface': 'terminal' }
              : {})}
          >
            <div className="theme-code-editor__terminal-inner">
              <CodeEditorTerminal
                open={terminalOpen}
                items={terminalItems}
                onSubmit={handleTerminalSubmit}
                onAppend={(line) => appendTerminal([line])}
                onClear={clearTerminal}
                onRevealLocation={revealTerminalLocation}
              />
            </div>
          </div>
        </div>
        </CodeEditorSearchHostProvider>
      </div>

      <CodeEditorStatusBar
        line={cursor.line}
        column={cursor.column}
        language={
          altView === 'table'
            ? 'csv-table'
            : altView === 'preview' && alternateFileKind === 'pdf'
              ? 'pdf-preview'
              : altView === 'preview'
                ? 'markdown-preview'
                : activeFile
                  ? resolveEditorLanguage(activeFile.path, activeFile.language)
                  : 'plaintext'
        }
        dirty={activeFile ? isDirty(activeFile) : false}
        hasFile={Boolean(activeFile)}
      />

      <Modal
        open={modal === 'new' || modal === 'new-folder' || modal === 'rename'}
        title={pathModalTitle}
        onClose={() => setModal(null)}
        placement="container"
        size="sm"
        confirmLabel={pathModalConfirm}
        onConfirm={confirmPathModal}
      >
        {sectionChrome && (modal === 'new' || modal === 'rename' || modal === 'new-folder') ? (
          <div className="theme-code-editor__path-form" data-sitting-copy-ok="">
            <Input
              label={pathModalLabel}
              size="sm"
              shadowless
              value={newFileStem}
              suffix={modal === 'new-folder' ? undefined : `.${lockedCodingExt}`}
              onChange={(e) => {
                setNewFileStem(e.target.value)
                setPathError(null)
              }}
              {...sittingFieldProps}
            />
            {pathError ? (
              <p className="theme-code-editor__path-error type-caption">{pathError}</p>
            ) : (
              <p className="theme-code-editor__path-hint type-caption type-muted">
                Creates in <code className="type-code">{newFileFolder}/</code>
                {modal === 'new' || modal === 'rename'
                  ? ` as .${lockedCodingExt}`
                  : ''}
                . Helper files stay under src/.
              </p>
            )}
          </div>
        ) : (
          <>
            <Input
              label={pathModalLabel}
              size="sm"
              shadowless
              value={pathDraft}
              onChange={(e) => {
                setPathDraft(e.target.value)
                setPathError(null)
              }}
              {...sittingFieldProps}
            />
            {pathError ? (
              <p className="theme-code-editor__path-error type-caption">{pathError}</p>
            ) : (
              <p className="theme-code-editor__path-hint type-caption type-muted">
                Use paths like <code className="type-code">src/lib/util.js</code>
                {modal === 'new-folder' ? ' or src/components' : ''}
                {modal === 'rename' ? ' — change the folder to move the file' : ''}.
              </p>
            )}
          </>
        )}
      </Modal>

      <Modal
        open={modal === 'help'}
        title="Keyboard shortcuts"
        onClose={() => setModal(null)}
        placement="container"
        size="sm"
        confirmLabel="Close"
        onConfirm={() => setModal(null)}
      >
        <ul className="theme-code-editor__help type-body-sm">
          <li>
            <kbd>Ctrl</kbd>/<kbd>Cmd</kbd>+<kbd>S</kbd> — Save
          </li>
          <li>
            <kbd>Ctrl</kbd>/<kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>S</kbd> — Save all
          </li>
          <li>
            <kbd>Ctrl</kbd>/<kbd>Cmd</kbd>+<kbd>F</kbd> — Document find in sidebar (Monaco, PDF, preview, or sheet)
          </li>
          <li>
            Search panel — File (workspace) or active view (Editor / PDF / Preview / Sheet
            {searchAdapter === 'grid' ? '; replace when the sheet is editable' : ''})
          </li>
          <li>
            <kbd>Ctrl</kbd>/<kbd>Cmd</kbd>+<kbd>Z</kbd> — Undo
          </li>
          <li>Terminal: <code className="type-code">help</code>, <code className="type-code">clear</code>, <code className="type-code">echo</code></li>
          <li>Run is not connected yet</li>
        </ul>
      </Modal>

      <CodeEditorUploadModal
        open={modal === 'upload'}
        defaultFolder={uploadDefaultFolder}
        folderOptions={uploadFolderOptions}
        busy={uploadBusy}
        error={uploadError}
        onClose={() => {
          if (uploadBusy) return
          setModal(null)
          setUploadError(null)
        }}
        onConfirm={handleUploadConfirm}
      />
    </div>
  )
})

import {
  FolderPlus,
  Pencil,
  RefreshCw,
  Star,
  Trash2,
  Upload,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import {
  createCopyEntries,
  createFolder,
  createHistory,
  createSeedLibrary,
  deleteEntries,
  downloadDriveEntries,
  entryById,
  formatFileExplorerError,
  importBrowserFiles,
  mapNodeToDriveEntry,
  mergeDriveEntries,
  moveEntries,
  pasteClipboard,
  pathLabels,
  pushHistory,
  queryEntries,
  redoHistory,
  renameEntry,
  setClipboard,
  siblingNameTaken,
  toggleStarred,
  undoHistory,
  type DriveClipboard,
  type DriveCommandId,
  type DriveEntry,
  type DriveLocation,
  type DriveMimeGroup,
  type DriveSortDir,
  type DriveSortKey,
  type DriveViewMode,
  type FileExplorerSource,
} from '../lib/fileExplorer'
import * as fileApi from '../lib/fileApi'
import type { FilesShareRow } from '../lib/fileApi'
import type { CascadeMenuItem } from '../lib/menus/cascadeMenu'
import { Input } from './Input'
import { Modal } from './Modal'
import { FileExplorerBreadcrumbs } from './fileExplorerParts/FileExplorerBreadcrumbs'
import { FileExplorerBrowser } from './fileExplorerParts/FileExplorerBrowser'
import { FileExplorerBulkBar } from './fileExplorerParts/FileExplorerBulkBar'
import { FileExplorerCommandPalette } from './fileExplorerParts/FileExplorerCommandPalette'
import {
  FileExplorerContextMenu,
  type FileExplorerContextAction,
} from './fileExplorerParts/FileExplorerContextMenu'
import { FileExplorerMoveDialog } from './fileExplorerParts/FileExplorerMoveDialog'
import { FileExplorerPreviewPane } from './fileExplorerParts/FileExplorerPreviewPane'
import { FileExplorerSidebar } from './fileExplorerParts/FileExplorerSidebar'
import { FileExplorerToolbar } from './fileExplorerParts/FileExplorerToolbar'
import type { FileExplorerEntryActionId } from './fileExplorerParts/FileExplorerEntryActions'
import { FileExplorerUploadModal } from './fileExplorerParts/FileExplorerUploadModal'

type FileExplorerProps = {
  className?: string
  variant?: 'workbench' | 'showcase' | 'embed'
  initialTitle?: string
  debug?: boolean
  /** Default fixture seed. Live mode uses fileApi + accountId. */
  source?: FileExplorerSource
  onError?: (err: unknown) => void
  onSelectionMeta?: (entry: DriveEntry | null) => void
}

type ModalKind = 'new-folder' | 'rename' | 'delete' | 'share' | null

const BUDDY_USER_ID = 'a0000000-0000-4000-8000-000000000002'

export function FileExplorer({
  className = '',
  variant = 'workbench',
  initialTitle = 'My library',
  debug = false,
  source = { mode: 'fixture' },
  onError,
  onSelectionMeta,
}: FileExplorerProps) {
  const isLive = source.mode === 'live'
  const liveAccountId = source.mode === 'live' ? source.accountId : null
  const rootRef = useRef<HTMLDivElement>(null)
  const [title, setTitle] = useState(initialTitle)
  const [history, setHistory] = useState(() =>
    createHistory(isLive ? { entries: [] } : createSeedLibrary()),
  )
  const library = history.present
  const [, setLiveBusy] = useState(false)

  const [location, setLocation] = useState<DriveLocation>({ type: 'folder', folderId: null })
  const [mimeFilters, setMimeFilters] = useState<DriveMimeGroup[]>([])
  const [starredOnly, setStarredOnly] = useState(false)
  const [sortKey, setSortKey] = useState<DriveSortKey>('name')
  const [sortDir, setSortDir] = useState<DriveSortDir>('asc')
  const [viewMode, setViewMode] = useState<DriveViewMode>('list')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarView, setSidebarView] = useState<'files' | 'search'>('files')
  const [searchFocusToken, setSearchFocusToken] = useState(0)
  const [previewOpen, setPreviewOpen] = useState(true)
  const [selection, setSelection] = useState<string[]>([])
  const [focusIndex, setFocusIndex] = useState(0)
  const [clipboard, setClipboardState] = useState<DriveClipboard | null>(null)
  const [dropActive, setDropActive] = useState(false)
  const [dropTargetId, setDropTargetId] = useState<string | null | undefined>(undefined)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [modal, setModal] = useState<ModalKind>(null)
  const [modalName, setModalName] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [renameError, setRenameError] = useState<string | null>(null)
  const [moveError, setMoveError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [shareGranteeId, setShareGranteeId] = useState(BUDDY_USER_ID)
  const [shares, setShares] = useState<FilesShareRow[] | null>(null)
  const [sharesLoading, setSharesLoading] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadBusy, setUploadBusy] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [moveOpen, setMoveOpen] = useState(false)
  const [moveMode, setMoveMode] = useState<'move' | 'copy'>('move')
  const [ctx, setCtx] = useState<{
    open: boolean
    x: number
    y: number
    mode: 'entry' | 'empty'
  }>({ open: false, x: 0, y: 0, mode: 'empty' })

  const entries = library.entries

  const visible = useMemo(
    () =>
      queryEntries(entries, {
        location,
        search: '',
        mimeFilters,
        starredOnly,
        sortKey,
        sortDir,
      }),
    [entries, location, mimeFilters, starredOnly, sortKey, sortDir],
  )

  const selectedIds = useMemo(() => new Set(selection), [selection])
  const cutIds = useMemo(
    () => new Set(clipboard?.mode === 'cut' ? clipboard.entryIds : []),
    [clipboard],
  )

  const previewEntry = useMemo(() => {
    const id = selection[selection.length - 1]
    return entryById(entries, id) ?? null
  }, [entries, selection])

  const currentFolderId =
    location.type === 'folder' ? location.folderId : null

  const canGoUp = location.type === 'folder' && location.folderId != null

  const applyLibrary = useCallback(
    (next: typeof library) => {
      if (isLive) {
        setHistory(createHistory(next))
        return
      }
      setHistory((h) => pushHistory(h, next))
    },
    [isLive],
  )

  const reportError = useCallback(
    (err: unknown) => {
      onError?.(err)
      return formatFileExplorerError(err)
    },
    [onError],
  )

  const openModal = useCallback((kind: ModalKind, name = '') => {
    setFormError(null)
    setModalName(name)
    setModal(kind)
  }, [])

  const refreshLive = useCallback(
    async (folderId: string | null = currentFolderId) => {
      if (!liveAccountId) return
      setLiveBusy(true)
      try {
        if (location.type === 'shared') {
          const rows = await fileApi.listShared()
          applyLibrary({
            entries: rows.map((n) => {
              const e = mapNodeToDriveEntry(n)
              return { ...e, tags: [...(e.tags ?? []), '__shared'] }
            }),
          })
          return
        }
        if (location.type === 'trash') {
          const rows = await fileApi.listTrash(liveAccountId)
          applyLibrary({
            entries: rows.map((n) => {
              const e = mapNodeToDriveEntry(n)
              return { ...e, tags: [...(e.tags ?? []), '__trash'] }
            }),
          })
          return
        }
        if (location.type === 'starred') {
          const rows = await fileApi.listStarred(liveAccountId)
          applyLibrary({ entries: rows.map(mapNodeToDriveEntry) })
          return
        }
        if (location.type === 'recent') {
          const rows = await fileApi.listRecent(liveAccountId)
          applyLibrary({ entries: rows.map(mapNodeToDriveEntry) })
          return
        }
        const { children, tree } = await fileApi.refresh(liveAccountId, folderId)
        const mapped = [...tree, ...children].map(mapNodeToDriveEntry)
        applyLibrary(mergeDriveEntries([], mapped))
      } catch (err) {
        reportError(err)
      } finally {
        setLiveBusy(false)
      }
    },
    [applyLibrary, currentFolderId, liveAccountId, location.type, reportError],
  )

  // Remount library when account switches
  useEffect(() => {
    if (!isLive || !liveAccountId) return
    setHistory(createHistory({ entries: [] }))
    setSelection([])
    setLocation({ type: 'folder', folderId: null })
    void refreshLive(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- remount on account only
  }, [liveAccountId])

  useEffect(() => {
    if (!isLive || !liveAccountId) return
    void refreshLive(location.type === 'folder' ? location.folderId : null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.type, location.type === 'folder' ? location.folderId : null, liveAccountId])

  useEffect(() => {
    onSelectionMeta?.(previewEntry)
  }, [onSelectionMeta, previewEntry])

  // Hydrate preview content / objectUrl for live selection
  useEffect(() => {
    if (!isLive || !previewEntry || previewEntry.kind === 'folder') return
    let cancelled = false
    ;(async () => {
      try {
        const node = await fileApi.getFile(previewEntry.id)
        if (node.nodeKind === 'document') {
          const doc = await fileApi.documentGet(previewEntry.id)
          if (cancelled) return
          const mapped = mapNodeToDriveEntry(doc)
          applyLibrary(
            mergeDriveEntries(library.entries, [
              { ...mapped, content: mapped.content ?? previewEntry.content },
            ]),
          )
        } else if (node.storagePath) {
          const url = await fileApi.getDownloadUrl(previewEntry.id)
          if (cancelled) return
          applyLibrary(
            mergeDriveEntries(library.entries, [{ ...previewEntry, objectUrl: url }]),
          )
        }
      } catch (err) {
        reportError(err)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLive, previewEntry?.id])

  // Live: load share grantees for inspector
  useEffect(() => {
    if (!isLive || !previewEntry) {
      setShares(null)
      setSharesLoading(false)
      return
    }
    let cancelled = false
    setSharesLoading(true)
    void (async () => {
      try {
        const rows = await fileApi.shareList(previewEntry.id)
        if (!cancelled) setShares(rows)
      } catch {
        // Non-managers (e.g. Shared location) cannot list — hide quietly
        if (!cancelled) setShares(null)
      } finally {
        if (!cancelled) setSharesLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isLive, previewEntry?.id])

  const resetLibrary = useCallback(() => {
    if (isLive) {
      void refreshLive(null)
      setSelection([])
      setClipboardState(null)
      setLocation({ type: 'folder', folderId: null })
      return
    }
    setHistory(createHistory(createSeedLibrary()))
    setSelection([])
    setClipboardState(null)
    setLocation({ type: 'folder', folderId: null })
  }, [isLive, refreshLive])

  const selectSidebarView = useCallback(
    (view: 'files' | 'search') => {
      if (sidebarOpen && sidebarView === view) {
        setSidebarOpen(false)
        return
      }
      setSidebarView(view)
      setSidebarOpen(true)
      if (view === 'search') setSearchFocusToken((t) => t + 1)
    },
    [sidebarOpen, sidebarView],
  )

  const relocateEntries = useCallback(
    (ids: string[], targetFolderId: string | null) => {
      if (isLive && liveAccountId) {
        void (async () => {
          try {
            for (const id of ids) {
              await fileApi.moveFile(id, targetFolderId)
            }
            await refreshLive(currentFolderId)
          } catch (err) {
            reportError(err)
          }
        })()
        return
      }
      applyLibrary(moveEntries(library, ids, targetFolderId))
    },
    [
      applyLibrary,
      currentFolderId,
      isLive,
      library,
      liveAccountId,
      refreshLive,
      reportError,
    ],
  )

  const getDragIds = useCallback(
    (entry: DriveEntry) => {
      if (selection.includes(entry.id) && selection.length > 1) return selection
      return [entry.id]
    },
    [selection],
  )

  const openFolder = useCallback((folderId: string | null) => {
    setLocation({ type: 'folder', folderId })
    setSelection([])
    setFocusIndex(0)
  }, [])

  const openEntry = useCallback(
    (entry: DriveEntry) => {
      if (entry.kind === 'folder') {
        openFolder(entry.id)
        return
      }
      setSelection([entry.id])
      setPreviewOpen(true)
    },
    [openFolder],
  )

  const selectEntry = useCallback(
    (entry: DriveEntry, e: ReactMouseEvent) => {
      setFocusIndex(Math.max(0, visible.findIndex((v) => v.id === entry.id)))
      if (e.shiftKey && selection.length > 0) {
        const anchor = selection[0]
        const a = visible.findIndex((v) => v.id === anchor)
        const b = visible.findIndex((v) => v.id === entry.id)
        if (a >= 0 && b >= 0) {
          const [lo, hi] = a < b ? [a, b] : [b, a]
          setSelection(visible.slice(lo, hi + 1).map((v) => v.id))
          return
        }
      }
      if (e.ctrlKey || e.metaKey) {
        setSelection((prev) =>
          prev.includes(entry.id) ? prev.filter((id) => id !== entry.id) : [...prev, entry.id],
        )
        return
      }
      setSelection([entry.id])
    },
    [selection, visible],
  )

  const commitRename = useCallback(() => {
    if (!renamingId) return
    const name = renameValue.trim()
    if (!name) {
      setRenameError('Enter a name.')
      return
    }
    const entry = entryById(library.entries, renamingId)
    if (
      entry &&
      siblingNameTaken(library.entries, entry.parentId, name, renamingId)
    ) {
      setRenameError('A file or folder with this name already exists here.')
      return
    }
    if (isLive && liveAccountId) {
      void (async () => {
        try {
          await fileApi.renameFile(renamingId, name)
          setRenameError(null)
          setRenamingId(null)
          await refreshLive(currentFolderId)
        } catch (err) {
          setRenameError(reportError(err))
        }
      })()
      return
    }
    applyLibrary(renameEntry(library, renamingId, name))
    setRenameError(null)
    setRenamingId(null)
  }, [
    applyLibrary,
    currentFolderId,
    isLive,
    library,
    liveAccountId,
    renameValue,
    renamingId,
    refreshLive,
    reportError,
  ])

  const startRename = useCallback(
    (id?: string) => {
      const target = id ?? selection[0]
      const entry = entryById(entries, target)
      if (!entry) return
      setRenamingId(entry.id)
      setRenameValue(entry.name)
      setRenameError(null)
      setSelection([entry.id])
    },
    [entries, selection],
  )

  const doDelete = useCallback(() => {
    if (selection.length === 0) return
    if (isLive && liveAccountId) {
      void (async () => {
        try {
          for (const id of selection) {
            await fileApi.deleteFile(id)
          }
          setSelection([])
          setFormError(null)
          setModal(null)
          await refreshLive(currentFolderId)
        } catch (err) {
          setFormError(reportError(err))
        }
      })()
      return
    }
    applyLibrary(deleteEntries(library, selection))
    setSelection([])
    setFormError(null)
    setModal(null)
  }, [
    applyLibrary,
    currentFolderId,
    isLive,
    library,
    liveAccountId,
    refreshLive,
    reportError,
    selection,
  ])

  const refreshShares = useCallback(async (nodeId: string) => {
    try {
      setSharesLoading(true)
      setShares(await fileApi.shareList(nodeId))
    } catch {
      setShares(null)
    } finally {
      setSharesLoading(false)
    }
  }, [])

  const doShare = useCallback(() => {
    const nodeId = selection[0]
    const grantee = shareGranteeId.trim()
    if (!isLive || !nodeId) return
    if (!grantee) {
      setFormError('Enter a user id to share with.')
      return
    }
    void (async () => {
      try {
        await fileApi.shareCreate(nodeId, { granteeUserId: grantee, role: 'viewer' })
        setFormError(null)
        setModal(null)
        await refreshLive(currentFolderId)
        await refreshShares(nodeId)
      } catch (err) {
        setFormError(reportError(err))
      }
    })()
  }, [
    currentFolderId,
    isLive,
    refreshLive,
    refreshShares,
    reportError,
    selection,
    shareGranteeId,
  ])

  const doRevokeShare = useCallback(
    (shareId: string) => {
      if (!isLive || !previewEntry) return
      void (async () => {
        try {
          await fileApi.shareRevoke(shareId)
          await refreshLive(currentFolderId)
          await refreshShares(previewEntry.id)
        } catch (err) {
          reportError(err)
        }
      })()
    },
    [currentFolderId, isLive, previewEntry, refreshLive, refreshShares, reportError],
  )

  const doStar = useCallback(() => {
    if (selection.length === 0) return
    if (isLive && liveAccountId) {
      void (async () => {
        try {
          for (const id of selection) {
            const entry = entryById(library.entries, id)
            await fileApi.setStarred(id, !entry?.starred)
          }
          await refreshLive(currentFolderId)
        } catch (err) {
          reportError(err)
        }
      })()
      return
    }
    applyLibrary(toggleStarred(library, selection))
  }, [
    applyLibrary,
    currentFolderId,
    isLive,
    library,
    liveAccountId,
    refreshLive,
    reportError,
    selection,
  ])

  const doDownload = useCallback(async () => {
    const files = selection
      .map((id) => entryById(entries, id))
      .filter((e): e is DriveEntry => Boolean(e && e.kind === 'file'))
    if (isLive) {
      for (const f of files) {
        try {
          const url = f.objectUrl ?? (await fileApi.getDownloadUrl(f.id))
          const a = document.createElement('a')
          a.href = url
          a.download = f.name
          a.click()
        } catch (err) {
          reportError(err)
        }
      }
      return
    }
    await downloadDriveEntries(files)
  }, [entries, isLive, reportError, selection])

  const doCut = useCallback(() => {
    if (selection.length === 0) return
    setClipboardState(setClipboard('cut', selection))
  }, [selection])

  const doCopy = useCallback(() => {
    if (selection.length === 0) return
    setClipboardState(setClipboard('copy', selection))
  }, [selection])

  const doCreateCopy = useCallback(() => {
    if (selection.length === 0) return
    if (isLive && liveAccountId) {
      void (async () => {
        try {
          setActionError(null)
          for (const id of selection) {
            await fileApi.copyFile(id, currentFolderId)
          }
          await refreshLive(currentFolderId)
        } catch (err) {
          setActionError(reportError(err))
        }
      })()
      return
    }
    setActionError(null)
    applyLibrary(createCopyEntries(library, selection))
  }, [
    applyLibrary,
    currentFolderId,
    isLive,
    library,
    liveAccountId,
    refreshLive,
    reportError,
    selection,
  ])

  const pasteTarget = useCallback((): string | null => {
    if (location.type === 'folder') return location.folderId
    const selected = entryById(entries, selection[0])
    if (selected?.kind === 'folder') return selected.id
    return selected?.parentId ?? null
  }, [entries, location, selection])

  const doPaste = useCallback(() => {
    if (!clipboard || clipboard.entryIds.length === 0) return
    const target = pasteTarget()
    if (isLive && liveAccountId) {
      void (async () => {
        try {
          setActionError(null)
          for (const id of clipboard.entryIds) {
            if (clipboard.mode === 'cut') {
              await fileApi.moveFile(id, target)
            } else {
              await fileApi.copyFile(id, target)
            }
          }
          if (clipboard.mode === 'cut') setClipboardState(null)
          await refreshLive(currentFolderId)
        } catch (err) {
          setActionError(reportError(err))
        }
      })()
      return
    }
    const result = pasteClipboard(library, clipboard, target)
    if (!result) return
    setActionError(null)
    applyLibrary(result.library)
    setClipboardState(result.clipboard)
  }, [
    applyLibrary,
    clipboard,
    currentFolderId,
    isLive,
    library,
    liveAccountId,
    pasteTarget,
    refreshLive,
    reportError,
  ])

  const importFiles = useCallback(
    async (files: File[], folderId: string | null = currentFolderId) => {
      setUploadBusy(true)
      setUploadError(null)
      try {
        if (isLive && liveAccountId) {
          for (const file of files) {
            if (siblingNameTaken(library.entries, folderId, file.name)) {
              throw new Error(
                `A file named “${file.name}” already exists in this folder.`,
              )
            }
            await fileApi.uploadBrowserFile(liveAccountId, file, folderId)
          }
          await refreshLive(folderId)
          setUploadOpen(false)
          return
        }
        for (const file of files) {
          if (siblingNameTaken(library.entries, folderId, file.name)) {
            throw new Error(
              `A file named “${file.name}” already exists in this folder.`,
            )
          }
        }
        const next = await importBrowserFiles(library, files, folderId)
        applyLibrary(next)
        setUploadOpen(false)
      } catch (err) {
        setUploadError(formatFileExplorerError(err))
        reportError(err)
      } finally {
        setUploadBusy(false)
      }
    },
    [
      applyLibrary,
      currentFolderId,
      isLive,
      library,
      liveAccountId,
      refreshLive,
      reportError,
    ],
  )

  const confirmMoveCopy = useCallback(
    (folderId: string | null) => {
      if (selection.length === 0) {
        setMoveOpen(false)
        return
      }
      if (isLive && liveAccountId) {
        void (async () => {
          try {
            setMoveError(null)
            if (moveMode === 'move') {
              for (const id of selection) {
                await fileApi.moveFile(id, folderId)
              }
            } else {
              for (const id of selection) {
                await fileApi.copyFile(id, folderId)
              }
            }
            setMoveOpen(false)
            await refreshLive(currentFolderId)
          } catch (err) {
            setMoveError(reportError(err))
          }
        })()
        return
      }
      for (const id of selection) {
        const entry = entryById(library.entries, id)
        if (!entry) continue
        if (siblingNameTaken(library.entries, folderId, entry.name, id)) {
          setMoveError('A file or folder with this name already exists in the destination.')
          return
        }
      }
      setMoveError(null)
      if (moveMode === 'move') {
        applyLibrary(moveEntries(library, selection, folderId))
      } else {
        const clip = setClipboard('copy', selection)
        const result = pasteClipboard(library, clip, folderId)
        if (result) applyLibrary(result.library)
      }
      setMoveOpen(false)
    },
    [
      applyLibrary,
      currentFolderId,
      isLive,
      library,
      liveAccountId,
      moveMode,
      refreshLive,
      reportError,
      selection,
    ],
  )

  const fileItems = useMemo<CascadeMenuItem[]>(
    () => [
      { id: 'new-folder', label: 'New folder', icon: FolderPlus },
      { id: 'upload', label: 'Upload files…', icon: Upload },
      { id: 'rename', label: 'Rename', icon: Pencil, disabled: selection.length !== 1 },
      { id: 'star', label: 'Star / Unstar', icon: Star, disabled: selection.length === 0 },
      { id: 'delete', label: 'Delete', icon: Trash2, disabled: selection.length === 0 },
      { id: 'sep-1', label: '—', disabled: true },
      {
        id: 'reset-library',
        label: isLive ? 'Refresh' : 'Reset library',
        icon: RefreshCw,
      },
    ],
    [isLive, selection.length],
  )

  const onFileSelect = useCallback(
    (id: string) => {
      if (id === 'new-folder') {
        openModal('new-folder', 'Untitled folder')
      } else if (id === 'upload') {
        setUploadError(null)
        setUploadOpen(true)
      } else if (id === 'rename') startRename()
      else if (id === 'star') doStar()
      else if (id === 'delete') openModal('delete')
      else if (id === 'reset-library') resetLibrary()
    },
    [doStar, openModal, resetLibrary, startRename],
  )

  const runCommand = useCallback(
    (id: DriveCommandId) => {
      switch (id) {
        case 'new-folder':
          openModal('new-folder', 'Untitled folder')
          break
        case 'upload':
          setUploadOpen(true)
          break
        case 'toggle-preview':
          setPreviewOpen((v) => !v)
          break
        case 'view-list':
          setViewMode('list')
          break
        case 'view-grid':
          setViewMode('grid')
          break
        case 'view-details':
          setViewMode('details')
          break
        case 'sort-name':
          setSortKey('name')
          setSortDir('asc')
          break
        case 'sort-modified':
          setSortKey('modified')
          setSortDir('desc')
          break
        case 'star':
          doStar()
          break
        case 'download':
          void doDownload()
          break
        case 'move-to':
          setMoveError(null)
          setMoveMode('move')
          setMoveOpen(true)
          break
        case 'copy-to':
          setMoveError(null)
          setMoveMode('copy')
          setMoveOpen(true)
          break
        case 'create-copy':
          doCreateCopy()
          break
        case 'focus-search': {
          selectSidebarView('search')
          setSearchFocusToken((t) => t + 1)
          break
        }
        case 'reset-library':
          resetLibrary()
          break
        case 'go-root':
          openFolder(null)
          break
        case 'go-starred':
          setLocation({ type: 'starred' })
          break
        case 'go-recent':
          setLocation({ type: 'recent' })
          break
      }
    },
    [doCreateCopy, doDownload, doStar, openFolder, resetLibrary, selectSidebarView],
  )

  const onEntryAction = useCallback(
    (id: FileExplorerEntryActionId, entry: DriveEntry) => {
      setSelection([entry.id])
      switch (id) {
        case 'open':
          openEntry(entry)
          break
        case 'preview':
          setPreviewOpen(true)
          break
        case 'cut':
          setClipboardState(setClipboard('cut', [entry.id]))
          break
        case 'create-copy':
          if (isLive && liveAccountId) {
            void (async () => {
              try {
                await fileApi.copyFile(entry.id, currentFolderId)
                await refreshLive(currentFolderId)
              } catch (err) {
                reportError(err)
              }
            })()
          } else {
            applyLibrary(createCopyEntries(library, [entry.id]))
          }
          break
        case 'move-to':
          setMoveError(null)
          setMoveMode('move')
          setMoveOpen(true)
          break
        case 'copy-to':
          setMoveError(null)
          setMoveMode('copy')
          setMoveOpen(true)
          break
        case 'star':
          if (isLive && liveAccountId) {
            void (async () => {
              try {
                await fileApi.setStarred(entry.id, !entry.starred)
                await refreshLive(currentFolderId)
              } catch (err) {
                reportError(err)
              }
            })()
          } else {
            applyLibrary(toggleStarred(library, [entry.id]))
          }
          break
        case 'share':
          if (isLive) {
            setShareGranteeId(BUDDY_USER_ID)
            openModal('share')
          }
          break
        case 'download':
          if (isLive) {
            void (async () => {
              try {
                const url = entry.objectUrl ?? (await fileApi.getDownloadUrl(entry.id))
                const a = document.createElement('a')
                a.href = url
                a.download = entry.name
                a.click()
              } catch (err) {
                reportError(err)
              }
            })()
          } else {
            void downloadDriveEntries([entry])
          }
          break
        case 'rename':
          startRename(entry.id)
          break
        case 'delete':
          openModal('delete')
          break
        case 'new-folder':
          openFolder(entry.id)
          openModal('new-folder', 'Untitled folder')
          break
        case 'upload':
          openFolder(entry.id)
          setUploadOpen(true)
          break
      }
    },
    [
      applyLibrary,
      currentFolderId,
      isLive,
      library,
      liveAccountId,
      openEntry,
      openFolder,
      refreshLive,
      reportError,
      startRename,
    ],
  )

  const onContextAction = useCallback(
    (id: FileExplorerContextAction) => {
      switch (id) {
        case 'open':
          if (previewEntry) openEntry(previewEntry)
          break
        case 'preview':
          setPreviewOpen(true)
          break
        case 'download':
          void doDownload()
          break
        case 'cut':
          doCut()
          break
        case 'create-copy':
          doCreateCopy()
          break
        case 'paste':
          doPaste()
          break
        case 'rename':
          startRename()
          break
        case 'star':
          doStar()
          break
        case 'share':
          if (isLive) {
            setShareGranteeId(BUDDY_USER_ID)
            openModal('share')
          }
          break
        case 'move-to':
          setMoveError(null)
          setMoveMode('move')
          setMoveOpen(true)
          break
        case 'copy-to':
          setMoveError(null)
          setMoveMode('copy')
          setMoveOpen(true)
          break
        case 'delete':
          openModal('delete')
          break
        case 'new-folder':
          openModal('new-folder', 'Untitled folder')
          break
        case 'upload':
          setUploadOpen(true)
          break
        case 'sort-name':
          setSortKey('name')
          setSortDir('asc')
          break
        case 'sort-modified':
          setSortKey('modified')
          setSortDir('desc')
          break
      }
    },
    [doCreateCopy, doCut, doDownload, doPaste, doStar, isLive, openEntry, previewEntry, startRename],
  )

  const onKeyDown = useCallback(
    (e: ReactKeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey
      const target = e.target as HTMLElement
      const typing =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable

      if (meta && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(true)
        return
      }
      if (meta && e.key.toLowerCase() === 'f' && !typing) {
        e.preventDefault()
        runCommand('focus-search')
        return
      }
      if (typing && renamingId == null) return

      if (meta && e.key.toLowerCase() === 'a') {
        e.preventDefault()
        setSelection(visible.map((v) => v.id))
        return
      }
      if (meta && e.key.toLowerCase() === 'x') {
        e.preventDefault()
        doCut()
        return
      }
      if (meta && e.key.toLowerCase() === 'c') {
        e.preventDefault()
        doCopy()
        return
      }
      if (meta && e.key.toLowerCase() === 'v') {
        e.preventDefault()
        doPaste()
        return
      }
      if (meta && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) setHistory((h) => redoHistory(h))
        else setHistory((h) => undoHistory(h))
        return
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (e.key === 'Backspace' && selection.length === 0 && canGoUp) {
          e.preventDefault()
          const crumbs = pathLabels(entries, currentFolderId)
          const parent = crumbs[crumbs.length - 2]
          openFolder(parent?.id ?? null)
          return
        }
        if (selection.length > 0 && e.key === 'Delete') {
          e.preventDefault()
          openModal('delete')
        }
        return
      }
      if (e.key === 'F2') {
        e.preventDefault()
        startRename()
        return
      }
      if (e.key === 'Escape') {
        setSelection([])
        setCtx((c) => ({ ...c, open: false }))
        setPaletteOpen(false)
        return
      }
      if (e.key === 'Enter' && visible[focusIndex]) {
        e.preventDefault()
        openEntry(visible[focusIndex])
        return
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Home' || e.key === 'End') {
        e.preventDefault()
        if (visible.length === 0) return
        let next = focusIndex
        if (e.key === 'ArrowDown') next = Math.min(focusIndex + 1, visible.length - 1)
        if (e.key === 'ArrowUp') next = Math.max(focusIndex - 1, 0)
        if (e.key === 'Home') next = 0
        if (e.key === 'End') next = visible.length - 1
        setFocusIndex(next)
        setSelection([visible[next].id])
      }
    },
    [
      canGoUp,
      currentFolderId,
      doCopy,
      doCut,
      doPaste,
      entries,
      focusIndex,
      openEntry,
      openFolder,
      renamingId,
      runCommand,
      selection.length,
      startRename,
      visible,
    ],
  )

  useEffect(() => {
    if (debug) console.debug('[FileExplorer]', { selection, location, viewMode })
  }, [debug, location, selection, viewMode])

  const sortLabel = `${sortKey} ${sortDir === 'asc' ? '↑' : '↓'}`
  const pathLabel =
    location.type === 'starred'
      ? 'Starred'
      : location.type === 'recent'
        ? 'Recent'
        : (() => {
            const crumbs = pathLabels(entries, currentFolderId)
            return crumbs[crumbs.length - 1]?.name ?? 'My files'
          })()
  const statusCount =
    selection.length > 0 ? `${selection.length} selected` : `${visible.length} items`

  const shellClass = [
    'theme-file-explorer',
    variant === 'showcase' ? 'theme-file-explorer--showcase' : '',
    variant === 'embed' ? 'theme-file-explorer--embed' : '',
    sidebarOpen ? '' : 'theme-file-explorer--sidebar-closed',
    sidebarOpen && sidebarView === 'search' ? 'theme-file-explorer--search-wide' : '',
    previewOpen ? '' : 'theme-file-explorer--preview-closed',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      ref={rootRef}
      className={shellClass}
      tabIndex={0}
      onKeyDown={onKeyDown}
      aria-label="File explorer"
    >
      <FileExplorerToolbar
        title={title}
        onTitleChange={setTitle}
        canUndo={!isLive && history.past.length > 0}
        canRedo={!isLive && history.future.length > 0}
        onUndo={() => {
          if (isLive) return
          setHistory((h) => undoHistory(h))
        }}
        onRedo={() => {
          if (isLive) return
          setHistory((h) => redoHistory(h))
        }}
        fileItems={fileItems}
        onFileSelect={onFileSelect}
        viewMode={viewMode}
        onViewMode={setViewMode}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={(key, dir) => {
          setSortKey(key)
          if (dir) setSortDir(dir)
        }}
        mimeFilters={mimeFilters}
        starredOnly={starredOnly}
        onToggleMime={(group) =>
          setMimeFilters((prev) =>
            prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group],
          )
        }
        onToggleStarredOnly={() => setStarredOnly((v) => !v)}
        onClearFilters={() => {
          setMimeFilters([])
          setStarredOnly(false)
        }}
        sidebarOpen={sidebarOpen}
        sidebarView={sidebarView}
        onSelectSidebarView={selectSidebarView}
        previewOpen={previewOpen}
        onTogglePreview={() => setPreviewOpen((v) => !v)}
        onUpload={() => setUploadOpen(true)}
      />

      <div className="theme-file-explorer__body">
        <FileExplorerSidebar
          entries={entries}
          location={location}
          view={sidebarView}
          searchFocusToken={searchFocusToken}
          dropTargetId={dropTargetId}
          showLiveLocations={isLive}
          liveAccountId={liveAccountId}
          onLocationChange={(loc) => {
            setLocation(loc)
            setSelection([])
            setSidebarView('files')
          }}
          onOpenSearchEntry={(entry) => {
            if (entry.kind === 'folder') {
              openFolder(entry.id)
            } else {
              setLocation({ type: 'folder', folderId: entry.parentId })
              setSelection([entry.id])
              setPreviewOpen(true)
            }
            setSidebarView('files')
          }}
          onRelocateEntries={relocateEntries}
          onDropTargetChange={setDropTargetId}
          onEntryAction={onEntryAction}
        />

        <div className="theme-file-explorer__main">
          {location.type === 'folder' ? (
            <FileExplorerBreadcrumbs
              entries={entries}
              folderId={currentFolderId}
              canGoUp={canGoUp}
              dropTargetId={dropTargetId}
              onGoUp={() => {
                const crumbs = pathLabels(entries, currentFolderId)
                const parent = crumbs[crumbs.length - 2]
                openFolder(parent?.id ?? null)
              }}
              onNavigate={openFolder}
              onRelocateEntries={relocateEntries}
              onDropTargetChange={setDropTargetId}
            />
          ) : (
            <div className="theme-file-explorer__breadcrumbs">
              <span className="type-caption">{pathLabel}</span>
            </div>
          )}

          <FileExplorerBulkBar
            count={selection.length}
            onDownload={() => void doDownload()}
            onStar={doStar}
            onMove={() => {
              setMoveError(null)
          setMoveMode('move')
          setMoveOpen(true)
            }}
            onDelete={() => openModal('delete')}
          />

          <FileExplorerBrowser
            entries={visible}
            allEntries={entries}
            viewMode={viewMode}
            selectedIds={selectedIds}
            cutIds={cutIds}
            dropTargetId={dropTargetId}
            currentFolderId={currentFolderId}
            sortKey={sortKey}
            sortDir={sortDir}
            searching={mimeFilters.length > 0 || starredOnly}
            renamingId={renamingId}
            renameValue={renameValue}
            renameError={renameError}
            dropActive={dropActive}
            onRenameValueChange={(value) => {
              setRenameValue(value)
              if (renameError) setRenameError(null)
            }}
            onRenameCommit={commitRename}
            onRenameCancel={() => {
              setRenamingId(null)
              setRenameError(null)
            }}
            onSort={(key) => {
              if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
              else {
                setSortKey(key)
                setSortDir('asc')
              }
            }}
            onSelect={selectEntry}
            onOpen={openEntry}
            onContextMenu={(entry, e) => {
              e.preventDefault()
              if (entry && !selectedIds.has(entry.id)) setSelection([entry.id])
              setCtx({ open: true, x: e.clientX, y: e.clientY, mode: 'entry' })
            }}
            onEmptyContextMenu={(e) => {
              e.preventDefault()
              setCtx({ open: true, x: e.clientX, y: e.clientY, mode: 'empty' })
            }}
            onDropFiles={(files) => void importFiles(files)}
            onDropActiveChange={setDropActive}
            onEntryAction={onEntryAction}
            onRelocateEntries={relocateEntries}
            onDropTargetChange={setDropTargetId}
            getDragIds={getDragIds}
            onUpload={() => setUploadOpen(true)}
            onNewFolder={() => {
              openModal('new-folder', 'Untitled folder')
            }}
          />
        </div>

        <FileExplorerPreviewPane
          entry={previewEntry}
          allEntries={entries}
          onToggleStar={(id) => {
            if (isLive && liveAccountId) {
              const entry = entryById(library.entries, id)
              void (async () => {
                try {
                  await fileApi.setStarred(id, !entry?.starred)
                  await refreshLive(currentFolderId)
                } catch (err) {
                  reportError(err)
                }
              })()
              return
            }
            applyLibrary(toggleStarred(library, [id]))
          }}
          shares={isLive ? shares : null}
          sharesLoading={isLive ? sharesLoading : false}
          onRevokeShare={isLive ? doRevokeShare : undefined}
          onOpenShare={
            isLive
              ? () => {
                  setShareGranteeId(BUDDY_USER_ID)
            openModal('share')
                }
              : undefined
          }
        />
      </div>

      <div className="theme-file-explorer__status" role="status">
        <span className="type-caption">{statusCount}</span>
        <span className="type-caption type-muted">{pathLabel}</span>
        <span className="theme-file-explorer__status-spacer" />
        {actionError ? (
          <span className="type-caption theme-field__message--error" role="alert">
            {actionError}
          </span>
        ) : (
          <span className="type-caption type-muted">{sortLabel}</span>
        )}
        <span className="type-caption type-muted">{isLive ? 'live' : 'fixture'}</span>
      </div>

      <FileExplorerContextMenu
        open={ctx.open}
        x={ctx.x}
        y={ctx.y}
        mode={ctx.mode}
        canPaste={Boolean(clipboard?.entryIds.length)}
        hasSelection={selection.length > 0}
        onClose={() => setCtx((c) => ({ ...c, open: false }))}
        onAction={onContextAction}
      />

      <FileExplorerCommandPalette
        open={paletteOpen}
        entries={entries}
        hostRef={rootRef}
        onClose={() => setPaletteOpen(false)}
        onCommand={runCommand}
        onJumpTo={(entry) => {
          if (entry.parentId != null || entry.kind === 'file') {
            setLocation({ type: 'folder', folderId: entry.parentId })
          }
          setSelection([entry.id])
          setPreviewOpen(true)
        }}
      />

      <FileExplorerUploadModal
        open={uploadOpen}
        entries={entries}
        defaultFolderId={currentFolderId}
        busy={uploadBusy}
        error={uploadError}
        onClose={() => setUploadOpen(false)}
        onConfirm={(files, folderId) => void importFiles(files, folderId)}
      />

      <FileExplorerMoveDialog
        open={moveOpen}
        mode={moveMode}
        entries={entries}
        error={moveError}
        onClose={() => {
          setMoveError(null)
          setMoveOpen(false)
        }}
        onConfirm={confirmMoveCopy}
      />

      <Modal
        open={modal === 'new-folder'}
        title="New folder"
        onClose={() => {
          setFormError(null)
          setModal(null)
        }}
        placement="container"
        size="sm"
        confirmLabel="Create"
        onConfirm={() => {
          const name = modalName.trim() || 'Untitled folder'
          if (siblingNameTaken(library.entries, currentFolderId, name)) {
            setFormError('A file or folder with this name already exists here.')
            return
          }
          if (isLive && liveAccountId) {
            void (async () => {
              try {
                await fileApi.mkdir(liveAccountId, name, currentFolderId)
                setFormError(null)
                setModal(null)
                await refreshLive(currentFolderId)
              } catch (err) {
                setFormError(reportError(err))
              }
            })()
            return
          }
          applyLibrary(createFolder(library, currentFolderId, name))
          setFormError(null)
          setModal(null)
        }}
      >
        <Input
          label="Folder name"
          size="sm"
          shadowless
          value={modalName}
          error={formError ?? undefined}
          onChange={(e) => {
            setModalName(e.target.value)
            if (formError) setFormError(null)
          }}
          autoFocus
        />
      </Modal>

      <Modal
        open={modal === 'rename'}
        title="Rename"
        onClose={() => {
          setFormError(null)
          setModal(null)
        }}
        placement="container"
        size="sm"
        confirmLabel="Rename"
        onConfirm={() => {
          if (!selection[0]) return
          const name = modalName.trim()
          if (!name) {
            setFormError('Enter a name.')
            return
          }
          const entry = entryById(library.entries, selection[0])
          if (
            entry &&
            siblingNameTaken(library.entries, entry.parentId, name, selection[0])
          ) {
            setFormError('A file or folder with this name already exists here.')
            return
          }
          if (isLive && liveAccountId) {
            void (async () => {
              try {
                await fileApi.renameFile(selection[0], name)
                setFormError(null)
                setModal(null)
                await refreshLive(currentFolderId)
              } catch (err) {
                setFormError(reportError(err))
              }
            })()
            return
          }
          applyLibrary(renameEntry(library, selection[0], name))
          setFormError(null)
          setModal(null)
        }}
      >
        <Input
          label="Name"
          size="sm"
          shadowless
          value={modalName}
          error={formError ?? undefined}
          onChange={(e) => {
            setModalName(e.target.value)
            if (formError) setFormError(null)
          }}
          autoFocus
        />
      </Modal>

      <Modal
        open={modal === 'delete'}
        title="Delete"
        onClose={() => {
          setFormError(null)
          setModal(null)
        }}
        placement="container"
        size="sm"
        confirmLabel="Delete"
        onConfirm={doDelete}
      >
        <p className="type-body-sm">
          Delete {selection.length} item{selection.length === 1 ? '' : 's'}? This is undoable
          locally.
        </p>
        {formError ? (
          <p className="theme-field__message theme-field__message--error type-caption mt-2" role="alert">
            {formError}
          </p>
        ) : null}
      </Modal>

      <Modal
        open={modal === 'share'}
        title="Share"
        onClose={() => {
          setFormError(null)
          setModal(null)
        }}
        placement="container"
        size="sm"
        confirmLabel="Share"
        confirmDisabled={!shareGranteeId.trim() || selection.length === 0}
        onConfirm={doShare}
      >
        <p className="type-caption type-muted mb-2">
          Share “{previewEntry?.name ?? 'selection'}” with a user by id (demo buddy prefilled).
        </p>
        <Input
          label="Grantee user id"
          size="sm"
          shadowless
          value={shareGranteeId}
          error={formError ?? undefined}
          onChange={(e) => {
            setShareGranteeId(e.target.value)
            if (formError) setFormError(null)
          }}
          autoFocus
        />
      </Modal>
    </div>
  )
}

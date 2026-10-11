import { ChevronDown, ChevronRight, FileCode2, Folder, FolderOpen, X } from 'lucide-react'
import {
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  forwardRef,
  type ReactNode,
} from 'react'
import {
  fileIconForPath,
  setiSvgWithCurrentColor,
} from '../../lib/codeEditor/fileIcon'
import {
  allFolderPaths,
  basename,
  buildFileTree,
  isDirty,
  type CodeFile,
  type TreeNode,
} from '../../lib/codeEditor/workspace'
import { ThemeScroll } from '../ThemeScroll'

type CodeEditorFileTreeProps = {
  files: readonly CodeFile[]
  folders: readonly string[]
  activeId: string | null
  onOpen: (id: string) => void
  onDeleteFile?: (id: string) => void
  onNewFileInFolder?: (folderPath: string | null) => void
  onNewFolderInFolder?: (folderPath: string | null) => void
  onDeleteFolder?: (folderPath: string) => void
  /** When false, hide the file delete control (seed files in interview take). */
  canDeleteFile?: (id: string) => boolean
  canDeleteFolder?: (folderPath: string) => boolean
  canCreateInFolder?: (folderPath: string) => boolean
  hideHeader?: boolean
}

export type CodeEditorFileTreeHandle = {
  expandAll: () => void
  collapseAll: () => void
}

const FOLD_MS = 240

function collectExpandablePaths(nodes: readonly TreeNode[]): string[] {
  const out: string[] = []
  for (const node of nodes) {
    if (node.kind === 'folder') {
      out.push(node.path)
      out.push(...collectExpandablePaths(node.children))
    }
  }
  return out
}

function FileRowIcon({ path }: { path: string }) {
  const { svg, color } = fileIconForPath(path)
  return (
    <span
      aria-hidden
      className="theme-code-editor__file-icon theme-code-editor__file-icon--seti"
      style={{ color }}
      dangerouslySetInnerHTML={{ __html: setiSvgWithCurrentColor(svg) }}
    />
  )
}

/** Measured-height fold so expand/collapse always animates (grid 0fr/1fr is flaky). */
function TreeFold({ open, children }: { open: boolean; children: ReactNode }) {
  const innerRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(open ? 'auto' : 0)
  const [visible, setVisible] = useState(open)
  const first = useRef(true)

  useLayoutEffect(() => {
    const el = innerRef.current
    if (!el) return

    if (first.current) {
      first.current = false
      setHeight(open ? 'auto' : 0)
      setVisible(open)
      return
    }

    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduce) {
      setHeight(open ? 'auto' : 0)
      setVisible(open)
      return
    }

    if (open) {
      setVisible(true)
      const target = el.scrollHeight
      setHeight(0)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setHeight(target))
      })
      const done = window.setTimeout(() => setHeight('auto'), FOLD_MS)
      return () => window.clearTimeout(done)
    }

    const current = el.scrollHeight
    setHeight(current)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setHeight(0))
    })
    const done = window.setTimeout(() => setVisible(false), FOLD_MS)
    return () => window.clearTimeout(done)
  }, [open])

  return (
    <div
      className={[
        'theme-code-editor__tree-fold',
        open || visible ? 'theme-code-editor__tree-fold--open' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
      aria-hidden={!open}
    >
      <div ref={innerRef} className="theme-code-editor__tree-fold-inner">
        {children}
      </div>
    </div>
  )
}

function TreeRows({
  nodes,
  depth,
  activeId,
  collapsed,
  onToggle,
  onOpen,
  onDeleteFile,
  onNewFileInFolder,
  onNewFolderInFolder,
  onDeleteFolder,
  canDeleteFile,
  canDeleteFolder,
  canCreateInFolder,
}: {
  nodes: readonly TreeNode[]
  depth: number
  activeId: string | null
  collapsed: ReadonlySet<string>
  onToggle: (path: string) => void
  onOpen: (id: string) => void
  onDeleteFile?: (id: string) => void
  onNewFileInFolder?: (folderPath: string | null) => void
  onNewFolderInFolder?: (folderPath: string | null) => void
  onDeleteFolder?: (folderPath: string) => void
  canDeleteFile?: (id: string) => boolean
  canDeleteFolder?: (folderPath: string) => boolean
  canCreateInFolder?: (folderPath: string) => boolean
}) {
  return (
    <>
      {nodes.map((node) => {
        if (node.kind === 'folder') {
          const open = !collapsed.has(node.path)
          const FolderIcon = open ? FolderOpen : Folder
          return (
            <li key={`folder:${node.path}`} role="treeitem" aria-expanded={open}>
              <div
                className="theme-code-editor__tree-row"
                style={{ ['--theme-code-tree-depth' as string]: String(depth) }}
              >
                <button
                  type="button"
                  className="theme-code-editor__file-item theme-code-editor__file-item--folder"
                  onClick={() => onToggle(node.path)}
                  onDoubleClick={() => onNewFileInFolder?.(node.path)}
                  title="Click to expand · double-click for new file"
                >
                  <ChevronRight
                    aria-hidden
                    className={[
                      'theme-code-editor__tree-chevron',
                      open ? 'theme-code-editor__tree-chevron--open' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    strokeWidth={2.25}
                  />
                  <FolderIcon
                    aria-hidden
                    className="theme-code-editor__file-icon theme-code-editor__file-icon--folder"
                    strokeWidth={2}
                  />
                  <span className="theme-code-editor__file-name type-caption">{node.name}</span>
                </button>
                <div className="theme-code-editor__tree-actions">
                  {onNewFileInFolder && (canCreateInFolder?.(node.path) ?? true) ? (
                    <button
                      type="button"
                      className="theme-code-editor__tree-action"
                      aria-label={`New file in ${node.name}`}
                      title="New file"
                      onClick={() => onNewFileInFolder(node.path)}
                    >
                      <FileCode2 aria-hidden strokeWidth={2} />
                    </button>
                  ) : null}
                  {onNewFolderInFolder && (canCreateInFolder?.(node.path) ?? true) ? (
                    <button
                      type="button"
                      className="theme-code-editor__tree-action"
                      aria-label={`New folder in ${node.name}`}
                      title="New folder"
                      onClick={() => onNewFolderInFolder(node.path)}
                    >
                      <Folder aria-hidden strokeWidth={2} />
                    </button>
                  ) : null}
                  {onDeleteFolder && (canDeleteFolder?.(node.path) ?? true) ? (
                    <button
                      type="button"
                      className="theme-code-editor__tree-action"
                      aria-label={`Delete folder ${node.name}`}
                      title="Delete folder"
                      onClick={() => onDeleteFolder(node.path)}
                    >
                      <X aria-hidden strokeWidth={2} />
                    </button>
                  ) : null}
                </div>
              </div>
              <TreeFold open={open}>
                <ul className="theme-code-editor__tree-children" role="group">
                  <TreeRows
                    nodes={node.children}
                    depth={depth + 1}
                    activeId={activeId}
                    collapsed={collapsed}
                    onToggle={onToggle}
                    onOpen={onOpen}
                    onDeleteFile={onDeleteFile}
                    onNewFileInFolder={onNewFileInFolder}
                    onNewFolderInFolder={onNewFolderInFolder}
                    onDeleteFolder={onDeleteFolder}
                    canDeleteFile={canDeleteFile}
                    canDeleteFolder={canDeleteFolder}
                    canCreateInFolder={canCreateInFolder}
                  />
                </ul>
              </TreeFold>
            </li>
          )
        }

        const dirty = isDirty(node.file)
        const active = node.file.id === activeId
        const name = basename(node.file.path)
        return (
          <li key={node.file.id} role="treeitem" aria-selected={active}>
            <div
              className="theme-code-editor__tree-row"
              style={{ ['--theme-code-tree-depth' as string]: String(depth) }}
            >
              <button
                type="button"
                className={[
                  'theme-code-editor__file-item',
                  active ? 'theme-code-editor__file-item--active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                data-code-path={node.file.path}
                onClick={() => onOpen(node.file.id)}
              >
                <span className="theme-code-editor__tree-chevron theme-code-editor__tree-chevron--spacer" />
                <FileRowIcon path={node.file.path} />
                <span className="theme-code-editor__file-name type-caption">
                  {name}
                  {dirty ? (
                    <span className="theme-code-editor__dirty" aria-label="Unsaved">
                      ●
                    </span>
                  ) : null}
                </span>
              </button>
              {onDeleteFile && (canDeleteFile?.(node.file.id) ?? true) ? (
                <div className="theme-code-editor__tree-actions theme-code-editor__tree-actions--file">
                  <button
                    type="button"
                    className="theme-code-editor__tree-action"
                    aria-label={`Delete ${name}`}
                    title="Delete file"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteFile(node.file.id)
                    }}
                  >
                    <X aria-hidden strokeWidth={2} />
                  </button>
                </div>
              ) : null}
            </div>
          </li>
        )
      })}
    </>
  )
}

export const CodeEditorFileTree = forwardRef<CodeEditorFileTreeHandle, CodeEditorFileTreeProps>(
  function CodeEditorFileTree(
    {
      files,
      folders,
      activeId,
      onOpen,
      onDeleteFile,
      onNewFileInFolder,
      onNewFolderInFolder,
      onDeleteFolder,
      canDeleteFile,
      canDeleteFolder,
      canCreateInFolder,
      hideHeader = false,
    },
    ref,
  ) {
  const tree = useMemo(() => buildFileTree(files, folders), [files, folders])
  const allPaths = useMemo(
    () => allFolderPaths(files, folders),
    [files, folders],
  )
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    setCollapsed((prev) => {
      const next = new Set<string>()
      for (const path of prev) {
        if (allPaths.includes(path)) next.add(path)
      }
      return next
    })
  }, [allPaths])

  const toggle = (path: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const expandAll = () => setCollapsed(new Set())
  const collapseAll = () => setCollapsed(new Set(collectExpandablePaths(tree)))

  useImperativeHandle(ref, () => ({ expandAll, collapseAll }), [tree])

  return (
    <div className="theme-code-editor__files">
      {hideHeader ? null : (
        <div className="theme-code-editor__files-header">
          <div className="theme-code-editor__files-label type-caption">Explorer</div>
          <div className="theme-code-editor__files-header-actions">
            {onNewFileInFolder ? (
              <button
                type="button"
                className="theme-code-editor__tree-action"
                aria-label="New file"
                title="New file"
                onClick={() => onNewFileInFolder(null)}
              >
                <FileCode2 aria-hidden strokeWidth={2} />
              </button>
            ) : null}
            {onNewFolderInFolder ? (
              <button
                type="button"
                className="theme-code-editor__tree-action"
                aria-label="New folder"
                title="New folder"
                onClick={() => onNewFolderInFolder(null)}
              >
                <Folder aria-hidden strokeWidth={2} />
              </button>
            ) : null}
            <button
              type="button"
              className="theme-code-editor__tree-action"
              aria-label="Expand all folders"
              title="Expand all"
              onClick={expandAll}
            >
              <ChevronDown aria-hidden strokeWidth={2} />
            </button>
            <button
              type="button"
              className="theme-code-editor__tree-action"
              aria-label="Collapse all folders"
              title="Collapse all"
              onClick={collapseAll}
            >
              <ChevronRight aria-hidden strokeWidth={2} />
            </button>
          </div>
        </div>
      )}
      <div className="theme-code-editor__files-drop-host">
        <ThemeScroll axis="vertical" rail="nano" className="theme-code-editor__files-scroll">
          {tree.length === 0 ? (
            <p className="theme-code-editor__files-empty type-caption type-muted">
              No files yet — create one from File.
            </p>
          ) : (
            <ul className="theme-code-editor__file-list" role="tree" aria-label="Workspace files">
              <TreeRows
                nodes={tree}
                depth={0}
                activeId={activeId}
                collapsed={collapsed}
                onToggle={toggle}
                onOpen={onOpen}
                onDeleteFile={onDeleteFile}
                onNewFileInFolder={onNewFileInFolder}
                onNewFolderInFolder={onNewFolderInFolder}
                onDeleteFolder={onDeleteFolder}
                canDeleteFile={canDeleteFile}
                canDeleteFolder={canDeleteFolder}
                canCreateInFolder={canCreateInFolder}
              />
            </ul>
          )}
        </ThemeScroll>
      </div>
    </div>
  )
  },
)

import { ChevronDown, ChevronRight, FileCode2, FileSearch, Folder, Search } from 'lucide-react'
import type { editor as MonacoEditor } from 'monaco-editor'
import { useRef } from 'react'
import { Button } from '../Button'
import { ToolbarModeGroup } from '../ToolbarModeGroup'
import {
  CodeEditorFileTree,
  type CodeEditorFileTreeHandle,
} from './CodeEditorFileTree'
import { CodeEditorSearch } from './CodeEditorSearch'
import type { CodeEditorSearchAdapterKind } from '../../lib/codeEditor/searchHotwire'
import type { CodeFile } from '../../lib/codeEditor/workspace'

export type CodeEditorSidebarView = 'files' | 'search'
export type CodeEditorSearchScope = 'workspace' | 'editor'

type CodeEditorSidebarProps = {
  view: CodeEditorSidebarView
  searchScope: CodeEditorSearchScope
  searchAdapter: CodeEditorSearchAdapterKind
  searchAdapterLabel: string
  onSearchScopeChange: (scope: CodeEditorSearchScope) => void
  files: readonly CodeFile[]
  folders: readonly string[]
  activeId: string | null
  getEditor: () => MonacoEditor.IStandaloneCodeEditor | null
  onOpen: (id: string) => void
  onDeleteFile?: (id: string) => void
  onNewFileInFolder?: (folderPath: string | null) => void
  onNewFolderInFolder?: (folderPath: string | null) => void
  onDeleteFolder?: (folderPath: string) => void
  canDeleteFile?: (id: string) => boolean
  canDeleteFolder?: (folderPath: string) => boolean
  canCreateInFolder?: (folderPath: string) => boolean
  onOpenSearchHit: (fileId: string, line: number, column: number) => void
}

export function CodeEditorSidebar({
  view,
  searchScope,
  searchAdapter,
  searchAdapterLabel,
  onSearchScopeChange,
  files,
  folders,
  activeId,
  getEditor,
  onOpen,
  onDeleteFile,
  onNewFileInFolder,
  onNewFolderInFolder,
  onDeleteFolder,
  canDeleteFile,
  canDeleteFolder,
  canCreateInFolder,
  onOpenSearchHit,
}: CodeEditorSidebarProps) {
  const treeRef = useRef<CodeEditorFileTreeHandle>(null)

  return (
    <div className="theme-code-editor__sidebar">
      {view === 'files' ? (
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
              onClick={() => treeRef.current?.expandAll()}
            >
              <ChevronDown aria-hidden strokeWidth={2} />
            </button>
            <button
              type="button"
              className="theme-code-editor__tree-action"
              aria-label="Collapse all folders"
              title="Collapse all"
              onClick={() => treeRef.current?.collapseAll()}
            >
              <ChevronRight aria-hidden strokeWidth={2} />
            </button>
          </div>
        </div>
      ) : (
        <div className="theme-code-editor__search-header">
          <ToolbarModeGroup aria-label="Search scope">
            <Button
              icon={FileSearch}
              size="xs"
              variant="tray"
              labelAnim={false}
              active={searchScope === 'workspace'}
              aria-pressed={searchScope === 'workspace'}
              className="theme-code-editor__search-scope-btn"
              onClick={() => onSearchScopeChange('workspace')}
            >
              File
            </Button>
            <Button
              icon={Search}
              size="xs"
              variant="tray"
              labelAnim={false}
              active={searchScope === 'editor'}
              aria-pressed={searchScope === 'editor'}
              className="theme-code-editor__search-scope-btn"
              onClick={() => onSearchScopeChange('editor')}
            >
              {searchAdapterLabel}
            </Button>
          </ToolbarModeGroup>
        </div>
      )}
      <div className="theme-code-editor__sidebar-body">
        {view === 'files' ? (
          <CodeEditorFileTree
            ref={treeRef}
            hideHeader
            files={files}
            folders={folders}
            activeId={activeId}
            onOpen={onOpen}
            onDeleteFile={onDeleteFile}
            onNewFileInFolder={onNewFileInFolder}
            onNewFolderInFolder={onNewFolderInFolder}
            onDeleteFolder={onDeleteFolder}
            canDeleteFile={canDeleteFile}
            canDeleteFolder={canDeleteFolder}
            canCreateInFolder={canCreateInFolder}
          />
        ) : (
          <CodeEditorSearch
            files={files}
            activeFileId={activeId}
            scope={searchScope}
            searchAdapter={searchAdapter}
            getEditor={getEditor}
            onOpenHit={onOpenSearchHit}
          />
        )}
      </div>
    </div>
  )
}

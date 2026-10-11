import { useEffect, useMemo, useRef, useState } from 'react'
import { fileById } from '../../lib/codeEditor/workspace'
import {
  groupWorkspaceHits,
  searchWorkspace,
} from '../../lib/codeEditor/workspaceSearch'
import { searchEditorModel, useEditorFindHighlights, useEditorModelRevision } from '../../lib/codeEditor/editorFind'
import { useCodeEditorSearchHostContext } from '../../lib/codeEditor/CodeEditorSearchHostContext'
import type { CodeEditorSearchAdapterKind } from '../../lib/codeEditor/searchHotwire'
import type { CodeFile } from '../../lib/codeEditor/workspace'
import type { editor as MonacoEditor } from 'monaco-editor'
import { Input } from '../Input'
import type { CodeEditorSearchScope } from './CodeEditorSidebar'
import { CodeEditorEditorFind } from './CodeEditorEditorFind'
import { CodeEditorGridFind } from './CodeEditorGridFind'
import { CodeEditorMarkdownFind } from './CodeEditorMarkdownFind'
import { CodeEditorPdfFind } from './CodeEditorPdfFind'
import type { CodeEditorSearchResultGroup } from './CodeEditorSearchResults'
import { CodeEditorSearchResults } from './CodeEditorSearchResults'

type CodeEditorSearchProps = {
  files: readonly CodeFile[]
  activeFileId: string | null
  scope: CodeEditorSearchScope
  searchAdapter: CodeEditorSearchAdapterKind
  getEditor: () => MonacoEditor.IStandaloneCodeEditor | null
  onOpenHit: (fileId: string, line: number, column: number) => void
}

export function CodeEditorSearch({
  files,
  activeFileId,
  scope,
  searchAdapter,
  getEditor,
  onOpenHit,
}: CodeEditorSearchProps) {
  const hostContext = useCodeEditorSearchHostContext()
  const formRef = useRef<HTMLFormElement>(null)
  const [query, setQuery] = useState('')
  const [selectedHit, setSelectedHit] = useState<{ line: number; column: number } | null>(null)
  const modelRevision = useEditorModelRevision(getEditor, activeFileId)
  const activeFile = useMemo(
    () => (activeFileId ? fileById(files, activeFileId) : undefined),
    [activeFileId, files],
  )

  useEffect(() => {
    if (scope === 'workspace') {
      formRef.current?.querySelector('input')?.focus()
    }
  }, [scope])

  useEffect(() => {
    setSelectedHit(null)
  }, [query, activeFileId])

  const workspaceHits = useMemo(
    () => (scope === 'workspace' ? searchWorkspace(files, query) : []),
    [files, query, scope],
  )
  const workspaceGroups = useMemo(() => groupWorkspaceHits(workspaceHits), [workspaceHits])

  const activeFileEditorHits = useMemo(() => {
    if (scope !== 'workspace' || !activeFileId || !query.trim()) return []
    const editor = getEditor()
    return searchEditorModel(editor?.getModel() ?? null, query, { matchCase: false })
  }, [activeFileId, getEditor, modelRevision, query, scope])

  const activeFileHighlightIndex = useMemo(() => {
    if (!selectedHit || activeFileEditorHits.length === 0) return 0
    const index = activeFileEditorHits.findIndex(
      (hit) => hit.line === selectedHit.line && hit.column === selectedHit.column,
    )
    return index >= 0 ? index : 0
  }, [activeFileEditorHits, selectedHit])

  useEditorFindHighlights(
    getEditor,
    activeFileEditorHits,
    activeFileHighlightIndex,
    scope === 'workspace' && Boolean(activeFileId && query.trim()),
  )

  const workspaceResultGroups = useMemo((): CodeEditorSearchResultGroup[] => {
    return workspaceGroups.map((group) => ({
      key: group.fileId,
      path: group.path,
      hits: group.hits.map((hit) => ({
        line: hit.line,
        column: hit.column,
        preview: hit.preview,
        active:
          activeFileId === group.fileId &&
          selectedHit?.line === hit.line &&
          selectedHit?.column === hit.column,
      })),
      onHitClick: (hit) => {
        setSelectedHit({ line: hit.line, column: hit.column })
        onOpenHit(group.fileId, hit.line, hit.column)
      },
    }))
  }, [activeFileId, onOpenHit, selectedHit, workspaceGroups])

  if (scope === 'editor') {
    const host = hostContext?.activeHost

    if (searchAdapter === 'pdf') {
      if (host?.kind === 'pdf') return <CodeEditorPdfFind host={host} />
      return (
        <p className="theme-code-editor__search-empty type-caption type-muted" role="status">
          Open PDF preview to search this document.
        </p>
      )
    }

    if (searchAdapter === 'markdown') {
      if (host?.kind === 'markdown') return <CodeEditorMarkdownFind host={host} />
      return (
        <p className="theme-code-editor__search-empty type-caption type-muted" role="status">
          Open Markdown preview to search this file.
        </p>
      )
    }

    if (searchAdapter === 'grid') {
      if (host?.kind === 'grid') return <CodeEditorGridFind host={host} />
      return (
        <p className="theme-code-editor__search-empty type-caption type-muted" role="status">
          Open the table view to search this sheet.
        </p>
      )
    }

    return (
      <CodeEditorEditorFind
        activeFile={activeFile ?? null}
        getEditor={getEditor}
        replaceEnabled
      />
    )
  }

  const emptyMessage = query.trim() ? 'No matches in workspace.' : 'Type to search all files.'

  return (
    <div className="theme-code-editor__search">
      <form
        ref={formRef}
        className="theme-code-editor__search-form"
        onSubmit={(e) => e.preventDefault()}
      >
        <Input
          size="xs"
          shadowless
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search files…"
          aria-label="Search query"
        />
      </form>
      <CodeEditorSearchResults groups={workspaceResultGroups} emptyMessage={emptyMessage} />
    </div>
  )
}

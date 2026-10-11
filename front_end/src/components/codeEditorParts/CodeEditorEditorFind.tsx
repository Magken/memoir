import { useCallback, useEffect, useMemo, useState } from 'react'
import type { editor as MonacoEditor } from 'monaco-editor'
import type { CodeFile } from '../../lib/codeEditor/workspace'
import { closeMonacoFind } from '../../lib/codeEditor/monacoFindDock'
import {
  replaceAllEditorHits,
  replaceEditorHit,
  revealEditorHit,
  searchEditorModel,
  useEditorFindHighlights,
  useEditorModelRevision,
} from '../../lib/codeEditor/editorFind'
import { clampMatchIndex } from '../../lib/search/textSearch'
import { FindReplaceBar } from '../FindReplaceBar'
import type { CodeEditorSearchResultGroup } from './CodeEditorSearchResults'
import { CodeEditorSearchResults } from './CodeEditorSearchResults'

type CodeEditorEditorFindProps = {
  activeFile: CodeFile | null
  getEditor: () => MonacoEditor.IStandaloneCodeEditor | null
  replaceEnabled?: boolean
}

export function CodeEditorEditorFind({
  activeFile,
  getEditor,
  replaceEnabled = true,
}: CodeEditorEditorFindProps) {
  const activeFileId = activeFile?.id ?? null
  const [findQuery, setFindQuery] = useState('')
  const [replaceQuery, setReplaceQuery] = useState('')
  const [replaceOpen, setReplaceOpen] = useState(replaceEnabled)
  const [matchCase, setMatchCase] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)
  const [useRegex, setUseRegex] = useState(false)
  const [preserveCase, setPreserveCase] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const modelRevision = useEditorModelRevision(getEditor, activeFileId)

  const searchOptions = useMemo(
    () => ({ matchCase, wholeWord, useRegex }),
    [matchCase, useRegex, wholeWord],
  )

  const hits = useMemo(() => {
    if (!activeFileId) return []
    const editor = getEditor()
    return searchEditorModel(editor?.getModel() ?? null, findQuery, searchOptions)
  }, [activeFileId, findQuery, getEditor, modelRevision, searchOptions])

  const safeIndex = clampMatchIndex(activeIndex, hits.length)

  useEffect(() => {
    setActiveIndex(0)
  }, [findQuery, matchCase, wholeWord, useRegex, activeFileId])

  useEffect(() => {
    const editor = getEditor()
    closeMonacoFind(editor)
  }, [activeFileId, getEditor])

  useEditorFindHighlights(getEditor, hits, safeIndex, Boolean(activeFileId && findQuery.trim()))

  const revealMatch = useCallback(
    (index: number, focus = false) => {
      const hit = hits[clampMatchIndex(index, hits.length)]
      if (!hit) return
      revealEditorHit(getEditor(), hit, { focus })
    },
    [getEditor, hits],
  )

  const stepMatch = useCallback(
    (delta: number) => {
      setActiveIndex((index) => {
        const next = clampMatchIndex(index + delta, hits.length)
        const hit = hits[next]
        if (hit) revealEditorHit(getEditor(), hit, { focus: false })
        return next
      })
    },
    [getEditor, hits],
  )

  const selectMatch = useCallback(
    (index: number) => {
      setActiveIndex(index)
      revealMatch(index, true)
    },
    [revealMatch],
  )

  const handleReplace = useCallback(() => {
    const editor = getEditor()
    const hit = hits[safeIndex]
    if (!editor || !hit) return
    replaceEditorHit(editor, hit, replaceQuery, preserveCase)
  }, [getEditor, hits, preserveCase, replaceQuery, safeIndex])

  const handleReplaceAll = useCallback(() => {
    replaceAllEditorHits(getEditor(), hits, replaceQuery, preserveCase)
  }, [getEditor, hits, preserveCase, replaceQuery])

  const resultGroups = useMemo((): CodeEditorSearchResultGroup[] => {
    if (!activeFile || hits.length === 0) return []
    return [
      {
        key: activeFile.id,
        path: activeFile.path,
        hits: hits.map((hit, index) => ({
          line: hit.line,
          column: hit.column,
          preview: hit.preview,
          active: index === safeIndex,
        })),
        onHitClick: (_hit, index) => selectMatch(index),
      },
    ]
  }, [activeFile, hits, safeIndex, selectMatch])

  const emptyMessage = !findQuery.trim()
    ? 'Type to find in the active file.'
    : 'No matches in this file.'

  if (!activeFileId) {
    return (
      <p className="theme-code-editor__search-empty type-caption type-muted" role="status">
        Open a file to use editor find and replace.
      </p>
    )
  }

  return (
    <div className="theme-code-editor__search theme-code-editor__search--editor">
      <div className="theme-code-editor__search-form">
        <FindReplaceBar
          findQuery={findQuery}
          onFindQueryChange={setFindQuery}
          replaceQuery={replaceQuery}
          onReplaceQueryChange={setReplaceQuery}
          replaceOpen={replaceEnabled ? replaceOpen : false}
          onReplaceOpenChange={replaceEnabled ? setReplaceOpen : undefined}
          matchCase={matchCase}
          onMatchCaseChange={setMatchCase}
          wholeWord={wholeWord}
          onWholeWordChange={setWholeWord}
          useRegex={useRegex}
          onUseRegexChange={setUseRegex}
          preserveCase={preserveCase}
          onPreserveCaseChange={setPreserveCase}
          matchCount={hits.length}
          activeMatchIndex={safeIndex}
          onPrevMatch={() => stepMatch(-1)}
          onNextMatch={() => stepMatch(1)}
          onReplace={replaceEnabled ? handleReplace : undefined}
          onReplaceAll={replaceEnabled ? handleReplaceAll : undefined}
          size="xs"
          shadowless
          autoFocus
        />
      </div>
      <CodeEditorSearchResults groups={resultGroups} emptyMessage={emptyMessage} />
    </div>
  )
}

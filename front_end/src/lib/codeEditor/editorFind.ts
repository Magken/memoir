import type { editor as MonacoEditor } from 'monaco-editor'
import { editor as monacoEditor } from 'monaco-editor'
import { useEffect, useRef, useState } from 'react'

const MATCH_CLASS = 'theme-code-editor__editor-match'
const MATCH_CURRENT_CLASS = 'theme-code-editor__editor-match--current'

export type EditorFindHit = {
  line: number
  column: number
  preview: string
  range: {
    startLineNumber: number
    startColumn: number
    endLineNumber: number
    endColumn: number
  }
}

export function searchEditorModel(
  model: MonacoEditor.ITextModel | null,
  query: string,
  options: {
    matchCase?: boolean
    wholeWord?: boolean
    useRegex?: boolean
  } = {},
  limit = 200,
): EditorFindHit[] {
  const term = query.trim()
  if (!model || !term) return []

  let isRegex = Boolean(options.useRegex)
  let searchString = term

  if (isRegex) {
    try {
      // eslint-disable-next-line no-new
      new RegExp(term)
    } catch {
      isRegex = false
    }
  }

  const matches = model.findMatches(
    searchString,
    false,
    isRegex,
    Boolean(options.matchCase),
    null,
    false,
    limit,
  )

  return matches
    .filter((match) => {
      if (!options.wholeWord || isRegex) return true
      const line = model.getLineContent(match.range.startLineNumber)
      const before = line[match.range.startColumn - 2] ?? ' '
      const after = line[match.range.endColumn - 1] ?? ' '
      const isWord = (ch: string) => /[\w$]/.test(ch)
      return !isWord(before) && !isWord(after)
    })
    .map((match) => {
      const line = match.range.startLineNumber
      const lineText = model.getLineContent(line)
      return {
        line,
        column: match.range.startColumn,
        preview: lineText.trim() || lineText,
        range: match.range,
      }
    })
}

/** Bump when the active Monaco model content or model changes — keeps find hits in sync after edits. */
export function useEditorModelRevision(
  getEditor: () => MonacoEditor.IStandaloneCodeEditor | null,
  activeFileId: string | null,
) {
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    const editor = getEditor()
    if (!editor || !activeFileId) return

    const bump = () => setRevision((value) => value + 1)
    const contentDisposable = editor.onDidChangeModelContent(bump)
    const modelDisposable = editor.onDidChangeModel(bump)

    return () => {
      contentDisposable.dispose()
      modelDisposable.dispose()
    }
  }, [activeFileId, getEditor])

  return revision
}

export function setEditorFindDecorations(
  editor: MonacoEditor.IStandaloneCodeEditor | null,
  hits: readonly EditorFindHit[],
  activeIndex: number,
  decorationIds: string[],
): string[] {
  if (!editor) return decorationIds
  if (hits.length === 0) return editor.deltaDecorations(decorationIds, [])

  return editor.deltaDecorations(
    decorationIds,
    hits.map((hit, index) => ({
      range: hit.range,
      options: {
        className: index === activeIndex ? MATCH_CURRENT_CLASS : MATCH_CLASS,
        inlineClassName: index === activeIndex ? MATCH_CURRENT_CLASS : MATCH_CLASS,
        stickiness: monacoEditor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
      },
    })),
  )
}

export function useEditorFindHighlights(
  getEditor: () => MonacoEditor.IStandaloneCodeEditor | null,
  hits: readonly EditorFindHit[],
  activeIndex: number,
  enabled: boolean,
) {
  const decorationIdsRef = useRef<string[]>([])

  useEffect(() => {
    const editor = getEditor()
    if (!enabled) {
      if (editor) {
        decorationIdsRef.current = editor.deltaDecorations(decorationIdsRef.current, [])
      }
      return
    }

    decorationIdsRef.current = setEditorFindDecorations(
      editor,
      hits,
      activeIndex,
      decorationIdsRef.current,
    )

    return () => {
      const currentEditor = getEditor()
      if (!currentEditor) return
      decorationIdsRef.current = currentEditor.deltaDecorations(decorationIdsRef.current, [])
    }
  }, [activeIndex, enabled, getEditor, hits])
}

export function revealEditorHit(
  editor: MonacoEditor.IStandaloneCodeEditor | null,
  hit: EditorFindHit,
  options: { focus?: boolean } = {},
) {
  if (!editor) return
  editor.revealRangeInCenter(hit.range)
  if (options.focus) {
    editor.setPosition({ lineNumber: hit.line, column: hit.column })
    editor.focus()
  }
}

export function jumpEditorToLine(
  editor: MonacoEditor.IStandaloneCodeEditor | null,
  line: number,
  column = 1,
  options: { focus?: boolean } = { focus: true },
) {
  if (!editor) return
  const model = editor.getModel()
  const lineNumber = Math.min(
    Math.max(1, line),
    model?.getLineCount() ?? Math.max(1, line),
  )
  const position = { lineNumber, column: Math.max(1, column) }
  editor.revealPositionInCenter(position)
  if (options.focus !== false) {
    editor.setPosition(position)
    editor.focus()
  }
}

export type EditorGotoKind = 'default' | 'error' | 'pass'

function gotoLineClass(kind: EditorGotoKind): string {
  if (kind === 'error') return 'theme-code-editor__goto-line theme-code-editor__goto-line--error'
  if (kind === 'pass') return 'theme-code-editor__goto-line theme-code-editor__goto-line--pass'
  return 'theme-code-editor__goto-line'
}

function gotoRulerColor(kind: EditorGotoKind): string {
  if (kind === 'error') return 'var(--theme-error)'
  if (kind === 'pass') return 'var(--theme-success)'
  return 'var(--theme-accent)'
}

/** Brief whole-line flash used when jumping from terminal stack frames. */
export function highlightEditorLine(
  editor: MonacoEditor.IStandaloneCodeEditor | null,
  line: number,
  durationMs = 2200,
  kind: EditorGotoKind = 'default',
) {
  highlightEditorLineRange(editor, line, line, durationMs, kind)
}

/** Flash a line range (start through end, inclusive). */
export function highlightEditorLineRange(
  editor: MonacoEditor.IStandaloneCodeEditor | null,
  startLine: number,
  endLine?: number,
  durationMs = 2200,
  kind: EditorGotoKind = 'default',
) {
  if (!editor) return
  const model = editor.getModel()
  if (!model) return
  const start = Math.min(Math.max(1, startLine), model.getLineCount())
  const endRaw = endLine != null ? endLine : start
  const end = Math.min(Math.max(start, endRaw), model.getLineCount())
  const endColumn = model.getLineMaxColumn(end)
  const ids = editor.deltaDecorations([], [
    {
      range: {
        startLineNumber: start,
        startColumn: 1,
        endLineNumber: end,
        endColumn,
      },
      options: {
        isWholeLine: true,
        className: gotoLineClass(kind),
        overviewRuler: {
          color: gotoRulerColor(kind),
          position: monacoEditor.OverviewRulerLane.Center,
        },
      },
    },
  ])
  window.setTimeout(() => {
    try {
      editor.deltaDecorations(ids, [])
    } catch {
      /* editor disposed */
    }
  }, durationMs)
}

export function jumpEditorToHit(
  editor: MonacoEditor.IStandaloneCodeEditor | null,
  hit: EditorFindHit,
  options: { focus?: boolean } = { focus: true },
) {
  revealEditorHit(editor, hit, options)
}

function applyPreserveCase(found: string, replacement: string) {
  if (!found) return replacement
  if (found === found.toUpperCase()) return replacement.toUpperCase()
  if (found === found.toLowerCase()) return replacement.toLowerCase()
  if (found[0] === found[0]?.toUpperCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1).toLowerCase()
  }
  return replacement
}

export function replaceEditorHit(
  editor: MonacoEditor.IStandaloneCodeEditor | null,
  hit: EditorFindHit,
  replacement: string,
  preserveCase = false,
) {
  const model = editor?.getModel()
  if (!editor || !model) return false

  const found = model.getValueInRange(hit.range)
  const text = preserveCase ? applyPreserveCase(found, replacement) : replacement
  editor.executeEdits('find-replace', [{ range: hit.range, text, forceMoveMarkers: true }])
  return true
}

export function replaceAllEditorHits(
  editor: MonacoEditor.IStandaloneCodeEditor | null,
  hits: readonly EditorFindHit[],
  replacement: string,
  preserveCase = false,
) {
  const model = editor?.getModel()
  if (!editor || !model || hits.length === 0) return 0

  const edits = [...hits]
    .sort((a, b) => {
      if (a.range.startLineNumber !== b.range.startLineNumber) {
        return b.range.startLineNumber - a.range.startLineNumber
      }
      return b.range.startColumn - a.range.startColumn
    })
    .map((hit) => {
      const found = model.getValueInRange(hit.range)
      const text = preserveCase ? applyPreserveCase(found, replacement) : replacement
      return { range: hit.range, text, forceMoveMarkers: true as const }
    })

  editor.executeEdits('find-replace-all', edits)
  return edits.length
}

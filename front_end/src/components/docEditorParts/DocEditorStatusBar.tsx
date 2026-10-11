import { useEffect, useState } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getRoot } from 'lexical'

type DocEditorStatusBarProps = {
  /** Soft floor from the writing stage (shown when set). */
  minWords?: number | null
  /** Soft ceiling from the writing stage (shown when set). */
  maxWords?: number | null
}

function countWords(text: string): number {
  const trimmed = text.replace(/\u00a0/g, ' ').trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).filter(Boolean).length
}

/**
 * Footer status — word / char counts (mirrors CodeEditor status bar rhythm).
 */
export function DocEditorStatusBar({
  minWords = null,
  maxWords = null,
}: DocEditorStatusBarProps) {
  const [editor] = useLexicalComposerContext()
  const [words, setWords] = useState(0)
  const [chars, setChars] = useState(0)

  useEffect(() => {
    const sync = () => {
      editor.getEditorState().read(() => {
        const text = $getRoot().getTextContent()
        setWords(countWords(text))
        setChars(text.length)
      })
    }
    sync()
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const text = $getRoot().getTextContent()
        setWords(countWords(text))
        setChars(text.length)
      })
    })
  }, [editor])

  const underMin = minWords != null && words < minWords
  const overMax = maxWords != null && words > maxWords
  const warn = underMin || overMax

  return (
    <div className="theme-doc-editor__status" role="status">
      <span
        className={[
          'type-caption',
          warn ? 'theme-doc-editor__status-warn' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {words} {words === 1 ? 'word' : 'words'}
      </span>
      <span className="theme-doc-editor__status-spacer" />
      {minWords != null ? (
        <span
          className={[
            'type-caption',
            underMin ? 'theme-doc-editor__status-warn' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          Min {minWords}
        </span>
      ) : null}
      {maxWords != null ? (
        <span
          className={[
            'type-caption',
            overMax ? 'theme-doc-editor__status-warn' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          Max {maxWords}
        </span>
      ) : null}
      <span className="type-caption">{chars} chars</span>
    </div>
  )
}

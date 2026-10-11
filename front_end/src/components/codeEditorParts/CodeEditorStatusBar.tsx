type CodeEditorStatusBarProps = {
  line: number
  column: number
  language: string
  dirty: boolean
  hasFile: boolean
}

export function CodeEditorStatusBar({
  line,
  column,
  language,
  dirty,
  hasFile,
}: CodeEditorStatusBarProps) {
  return (
    <div className="theme-code-editor__status" role="status">
      <span className="type-caption">
        {hasFile ? `Ln ${line}, Col ${column}` : 'No file'}
      </span>
      <span className="theme-code-editor__status-spacer" />
      {hasFile ? (
        <>
          <span className="type-caption">{dirty ? 'Unsaved' : 'Saved'}</span>
          <span className="type-caption">{language}</span>
          <span className="type-caption">UTF-8</span>
        </>
      ) : null}
    </div>
  )
}

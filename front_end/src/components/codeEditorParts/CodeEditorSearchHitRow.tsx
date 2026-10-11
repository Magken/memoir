function compactPreview(text: string, max = 72) {
  const trimmed = text.trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max - 1)}…`
}

type CodeEditorSearchHitRowProps = {
  preview: string
  line: number
  column: number
  active?: boolean
  onClick: () => void
}

export function CodeEditorSearchHitRow({
  preview,
  line,
  column,
  active = false,
  onClick,
}: CodeEditorSearchHitRowProps) {
  return (
    <li role="listitem">
      <button
        type="button"
        className={[
          'theme-code-editor__search-hit-item type-label',
          active ? 'theme-code-editor__search-hit-item--active' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={onClick}
      >
        <span className="theme-code-editor__search-hit-text" title={preview}>
          {compactPreview(preview)}
        </span>
        <span className="theme-code-editor__search-hit-line type-caption tabular-nums">
          {line}:{column}
        </span>
      </button>
    </li>
  )
}

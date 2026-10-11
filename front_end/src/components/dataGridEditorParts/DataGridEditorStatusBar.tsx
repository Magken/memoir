type DataGridEditorStatusBarProps = {
  rows: number
  columns: number
  selectionLabel: string
  dirty: boolean
  editable: boolean
}

export function DataGridEditorStatusBar({
  rows,
  columns,
  selectionLabel,
  dirty,
  editable,
}: DataGridEditorStatusBarProps) {
  return (
    <div className="theme-data-grid-editor__status" role="status">
      <span className="type-caption">{selectionLabel}</span>
      <span className="theme-data-grid-editor__status-spacer" />
      <span className="type-caption">
        {rows} {rows === 1 ? 'row' : 'rows'} · {columns} {columns === 1 ? 'column' : 'columns'}
      </span>
      {editable ? (
        <span className="type-caption">{dirty ? 'Unsaved' : 'Saved'}</span>
      ) : (
        <span className="type-caption">View only</span>
      )}
    </div>
  )
}

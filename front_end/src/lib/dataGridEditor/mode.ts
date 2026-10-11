export type DataGridEditorMode = 'edit' | 'view'

export function isDataGridEditable(mode: DataGridEditorMode): boolean {
  return mode === 'edit'
}

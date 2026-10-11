export type DocEditorLayoutTemplate = {
  id: string
  label: string
  templateColumns: string
}

export const DOC_EDITOR_LAYOUT_TEMPLATES: DocEditorLayoutTemplate[] = [
  { id: '2-equal', label: '2 columns (equal width)', templateColumns: '1fr 1fr' },
  { id: '2-25-75', label: '2 columns (25% – 75%)', templateColumns: '1fr 3fr' },
  { id: '3-equal', label: '3 columns (equal width)', templateColumns: '1fr 1fr 1fr' },
  { id: '3-25-50-25', label: '3 columns (25% – 50% – 25%)', templateColumns: '1fr 2fr 1fr' },
  { id: '4-equal', label: '4 columns (equal width)', templateColumns: '1fr 1fr 1fr 1fr' },
]

export function layoutItemCount(templateColumns: string): number {
  return templateColumns.trim().split(/\s+/).length
}

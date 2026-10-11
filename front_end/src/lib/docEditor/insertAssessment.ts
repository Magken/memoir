/**
 * Interview writing (`chrome="section"`): no photos/video and no page-break control.
 * Filter only — do not reorder remaining Insert rows.
 */
export const DOC_EDITOR_ASSESSMENT_INSERT_EXCLUDE = new Set([
  'image',
  'gif',
  'video',
  'youtube',
  'page-break',
])

export function isDocEditorAssessmentInsertExcluded(id: string): boolean {
  const stem = id.startsWith('columns:') ? 'columns' : id
  return DOC_EDITOR_ASSESSMENT_INSERT_EXCLUDE.has(stem)
}

/** Keep relative order of ids that are still allowed. */
export function filterAssessmentInsertItems<T extends { id: string }>(items: readonly T[]): T[] {
  return items.filter((item) => !isDocEditorAssessmentInsertExcluded(item.id))
}

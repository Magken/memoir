export type CodeEditorAltView = 'code' | 'table' | 'preview'

export type CodeEditorAlternateFileKind = 'csv' | 'markdown' | 'pdf' | null

export function alternateFileKindFromPath(path: string): CodeEditorAlternateFileKind {
  const base = path.split('/').pop() ?? path
  const dot = base.lastIndexOf('.')
  if (dot < 0) return null
  const ext = base.slice(dot + 1).toLowerCase()
  if (ext === 'csv') return 'csv'
  if (ext === 'md' || ext === 'markdown') return 'markdown'
  if (ext === 'pdf') return 'pdf'
  return null
}

export function defaultAltViewForKind(kind: CodeEditorAlternateFileKind): CodeEditorAltView {
  if (kind === 'pdf' || kind === 'markdown') return 'preview'
  return 'code'
}

export function altViewsForKind(kind: CodeEditorAlternateFileKind): CodeEditorAltView[] {
  if (kind === 'csv') return ['code', 'table']
  if (kind === 'markdown') return ['code', 'preview']
  if (kind === 'pdf') return ['code', 'preview']
  return ['code']
}

export function isAltViewAllowed(kind: CodeEditorAlternateFileKind, view: CodeEditorAltView): boolean {
  return altViewsForKind(kind).includes(view)
}

export function resolveAltViewForFile(
  path: string,
  stored: CodeEditorAltView | undefined,
): CodeEditorAltView {
  const kind = alternateFileKindFromPath(path)
  if (!kind) return 'code'
  if (stored && isAltViewAllowed(kind, stored)) return stored
  return defaultAltViewForKind(kind)
}

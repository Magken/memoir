/** Code-block languages that render live diagram previews in DocEditor. */
export const DOC_DIAGRAM_CODE_LANGUAGES = ['mermaid', 'excalidraw'] as const

/** Fixed viewport height shared by diagram source + preview in DocEditor (resizable per block). */
export const DOC_DIAGRAM_BLOCK_HEIGHT_DEFAULT = 'min(28rem, 56vh)'

export type DocDiagramCodeLanguage = (typeof DOC_DIAGRAM_CODE_LANGUAGES)[number]

export function isDocDiagramCodeLanguage(language: string): language is DocDiagramCodeLanguage {
  const normalized = language.trim().toLowerCase()
  return normalized === 'mermaid' || normalized === 'excalidraw'
}

export function docDiagramCodeLanguageLabel(language: string): string {
  const normalized = language.trim().toLowerCase()
  if (normalized === 'mermaid') return 'Mermaid'
  if (normalized === 'excalidraw') return 'Excalidraw'
  return language
}

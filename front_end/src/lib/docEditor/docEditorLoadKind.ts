/** Live Lexical wins on reopen. Markdown-only payloads (Copilot Check, Length & time) still import markdown. */
export function docEditorLoadKind(payload: {
  lexical?: unknown
  markdown?: string
}): 'lexical' | 'markdown' | 'none' {
  if (payload.lexical != null) return 'lexical'
  if (payload.markdown) return 'markdown'
  return 'none'
}

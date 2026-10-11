/**
 * Capture chat send times once — never re-stamp on React render.
 */
import { nowIso } from '../chat/utils'

export function stampChatSendAt(existing?: string): string {
  const trimmed = existing?.trim()
  if (trimmed) {
    const ms = Date.parse(trimmed)
    if (Number.isFinite(ms) && ms > 0) return new Date(ms).toISOString()
  }
  return nowIso()
}

/** Preserve an existing stream row timestamp; stamp only on first insert. */
export function preserveAssistRowAt<T extends { at?: string }>(
  row: T,
  prev?: { at?: string } | null,
): T & { at?: string } {
  const at = prev?.at?.trim() || row.at?.trim()
  return at ? { ...row, at } : row
}

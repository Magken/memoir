/**
 * Copilot workbench proposal helpers — chunked stream + original/next extract.
 * Visual only until the editor Check (or form fill) commits.
 */

export type CopilotEditMemoryStatus = 'accepted' | 'rejected' | 'applied'

export type CopilotEditMemoryEntry = {
  status: CopilotEditMemoryStatus
  kind: 'form' | 'coding' | 'doc'
  locus: string
  summary: string
  at: number
}

export const COPILOT_EDIT_MEMORY_CAP = 8

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Growing prefixes so the modified side types out. Reduced motion → one frame. */
export function streamPrefixes(next: string, reduced?: boolean): string[] {
  const text = String(next ?? '')
  if (reduced || text.length <= 24) return [text]
  const size = 56
  const out: string[] = []
  for (let i = size; i < text.length; i += size) out.push(text.slice(0, i))
  out.push(text)
  return out
}

export function capEditMemory(
  rows: readonly CopilotEditMemoryEntry[],
  next: CopilotEditMemoryEntry,
): CopilotEditMemoryEntry[] {
  return [...rows, next].slice(-COPILOT_EDIT_MEMORY_CAP)
}

export function formatEditMemoryLine(row: CopilotEditMemoryEntry): string {
  return `${row.status} · ${row.locus} · ${row.summary}`
}

export function createId(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`
}

export function nowIso(): string {
  return new Date().toISOString()
}

export function attachmentKindFromMime(mime?: string, name = ''): import('./types').ChatAttachmentKind {
  const lower = `${mime ?? ''} ${name}`.toLowerCase()
  if (lower.includes('image/') || /\.(png|jpe?g|gif|webp|svg)$/i.test(name)) return 'image'
  if (lower.includes('video/') || /\.(mp4|webm|mov)$/i.test(name)) return 'video'
  if (lower.includes('pdf') || /\.pdf$/i.test(name)) return 'pdf'
  if (lower.includes('text/') || /\.(txt|md|json|csv)$/i.test(name)) return 'text'
  return 'unknown'
}

export function planningDeadlinePassed(
  part: { deadlineAt?: string },
  now = Date.now(),
): boolean {
  if (!part.deadlineAt) return false
  const end = Date.parse(part.deadlineAt)
  return Number.isFinite(end) && end <= now
}

/** Answered or past deadline — not valid to reopen / retake. */
export function planningIsClosed(
  part: { answered?: boolean; deadlineAt?: string },
  now = Date.now(),
): boolean {
  return Boolean(part.answered) || planningDeadlinePassed(part, now)
}

/** Newest unanswered, unexpired questionnaire in the thread (the only live one). */
export function findLivePlanningRef(
  messages: ReadonlyArray<{ id: string; parts: import('./types').MessagePart[] }>,
  now = Date.now(),
): { messageId: string; partIndex: number } | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i]
    if (!msg) continue
    for (let p = msg.parts.length - 1; p >= 0; p -= 1) {
      const part = msg.parts[p]
      if (!part || part.type !== 'planning') continue
      if (planningIsClosed(part, now)) continue
      return { messageId: msg.id, partIndex: p }
    }
  }
  return null
}

export function formatBytes(bytes?: number): string {
  if (bytes == null || Number.isNaN(bytes)) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function messagePlainText(parts: import('./types').MessagePart[]): string {
  return parts
    .map((part) => {
      switch (part.type) {
        case 'text':
        case 'system':
        case 'thinking':
          return part.text
        case 'status':
          return part.label
        case 'planning':
          return part.title ?? part.summary ?? 'Planning'
        case 'markdown':
          return part.markdown
        case 'html':
          return part.title ?? 'HTML block'
        case 'gallery':
          return `Gallery (${part.items.length})`
        case 'card':
          return part.title
        case 'divider':
          return part.label ?? ''
        case 'attachment':
          return part.attachment.name
        case 'tool':
          return `Tool: ${part.name}`
        default:
          return ''
      }
    })
    .filter(Boolean)
    .join('\n')
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

export function formatChatTime(iso: string, now = Date.now()): string {
  const date = new Date(iso)
  const diff = now - date.getTime()
  if (diff < MINUTE) return 'Just now'
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m`
  if (diff < DAY && date.getDate() === new Date(now).getDate()) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }
  if (diff < 7 * DAY) {
    return date.toLocaleDateString([], { weekday: 'short' })
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export function formatMessageClock(iso: string): string {
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms) || ms <= 0) return ''
  return new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

/** Epoch ms → ISO for chat bubbles; empty when invalid. */
export function epochMsToIso(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return ''
  return new Date(ms).toISOString()
}

/** Normalize stored send time for ChatMessage.createdAt — never invent on render. */
export function messageCreatedAtIso(at?: string | number | null): string {
  if (typeof at === 'string') {
    const trimmed = at.trim()
    if (!trimmed) return ''
    const ms = Date.parse(trimmed)
    if (Number.isFinite(ms) && ms > 0) return new Date(ms).toISOString()
  }
  if (typeof at === 'number') return epochMsToIso(at)
  return ''
}

export function sameDay(a: string, b: string): boolean {
  const da = new Date(a)
  const db = new Date(b)
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  )
}

export function daySeparatorLabel(iso: string, now = Date.now()): string {
  const date = new Date(iso)
  const today = new Date(now)
  const yesterday = new Date(now - DAY)
  if (sameDay(iso, today.toISOString())) return 'Today'
  if (sameDay(iso, yesterday.toISOString())) return 'Yesterday'
  return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
}

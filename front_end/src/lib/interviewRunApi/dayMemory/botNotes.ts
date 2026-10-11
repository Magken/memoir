/**
 * Standing interviewer notes — durable prefs this interview must not lose
 * (preferred name, language, working style, explicit "remember that…").
 */
export type BotNoteKind =
  | 'preferred_name'
  | 'language'
  | 'working_style'
  | 'fact'
  | 'constraint'
  | 'other'

export type InterviewerBotNote = {
  id: string
  kind: BotNoteKind
  /** Upsert key — preferred_name / language / working_style use stable keys. */
  key: string
  text: string
  at: string
  phaseId?: string
  source: 'talk' | 'assist'
}

export type PersistNoteDraft = {
  kind: BotNoteKind
  key?: string
  text: string
  /** Default set/upsert. `remove` deletes by key (or kind default key). */
  op?: 'set' | 'remove'
}

const KIND_SET = new Set<BotNoteKind>([
  'preferred_name',
  'language',
  'working_style',
  'fact',
  'constraint',
  'other',
])

const MAX_NOTES = 12
const MAX_NOTE_CHARS = 160
const MAX_STANDING_CHARS = 420

function clip(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1).trim()}…`
}

function defaultKey(kind: BotNoteKind, text: string): string {
  if (kind === 'preferred_name') return 'preferred_name'
  if (kind === 'language') return 'language'
  if (kind === 'working_style') return 'working_style'
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40)
  return `${kind}:${slug || 'note'}`
}

function newNoteId(): string {
  return `note_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`
}

export function normalizeBotNotes(raw: unknown): InterviewerBotNote[] {
  if (!Array.isArray(raw)) return []
  const out: InterviewerBotNote[] = []
  const seen = new Set<string>()
  for (const row of raw) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) continue
    const o = row as Record<string, unknown>
    const kind = String(o.kind ?? '') as BotNoteKind
    if (!KIND_SET.has(kind)) continue
    const text = clip(String(o.text ?? ''), MAX_NOTE_CHARS)
    if (!text) continue
    const key = String(o.key ?? '').trim() || defaultKey(kind, text)
    if (seen.has(key)) continue
    seen.add(key)
    out.push({
      id: String(o.id ?? '').trim() || newNoteId(),
      kind,
      key,
      text,
      at: typeof o.at === 'string' && o.at.trim() ? o.at : new Date().toISOString(),
      phaseId: typeof o.phaseId === 'string' && o.phaseId.trim() ? o.phaseId.trim() : undefined,
      source: o.source === 'assist' ? 'assist' : 'talk',
    })
    if (out.length >= MAX_NOTES) break
  }
  return out
}

/** Compact always-on pack for compose (name / language / style first). */
export function formatStandingNotes(notes: readonly InterviewerBotNote[]): string | null {
  if (!notes.length) return null
  const order: BotNoteKind[] = [
    'preferred_name',
    'language',
    'working_style',
    'constraint',
    'fact',
    'other',
  ]
  const ranked = [...notes].sort(
    (a, b) => order.indexOf(a.kind) - order.indexOf(b.kind),
  )
  const lines = ranked.map((n) => `- (${n.kind}) ${n.text}`)
  return clip(lines.join('\n'), MAX_STANDING_CHARS) || null
}

export function upsertBotNotes(
  existing: readonly InterviewerBotNote[],
  drafts: readonly PersistNoteDraft[],
  meta: { phaseId?: string; source: 'talk' | 'assist' },
): InterviewerBotNote[] {
  const map = new Map<string, InterviewerBotNote>()
  for (const n of normalizeBotNotes(existing)) {
    map.set(n.key, n)
  }
  const at = new Date().toISOString()
  for (const d of drafts) {
    if (!KIND_SET.has(d.kind)) continue
    const op = d.op === 'remove' ? 'remove' : 'set'
    if (op === 'remove') {
      const key =
        (d.key?.trim() ||
          (d.kind === 'preferred_name' || d.kind === 'language' || d.kind === 'working_style'
            ? defaultKey(d.kind, '')
            : d.key?.trim())) || ''
      if (key) {
        map.delete(key)
        continue
      }
      // Remove all of that kind when no key (fact/constraint/other batch clear by kind).
      for (const [k, n] of [...map.entries()]) {
        if (n.kind === d.kind) map.delete(k)
      }
      continue
    }
    const text = clip(d.text, MAX_NOTE_CHARS)
    if (!text) continue
    const key = (d.key?.trim() || defaultKey(d.kind, text)).slice(0, 64)
    const prev = map.get(key)
    map.set(key, {
      id: prev?.id ?? newNoteId(),
      kind: d.kind,
      key,
      text,
      at,
      phaseId: meta.phaseId,
      source: meta.source,
    })
  }
  const order: BotNoteKind[] = [
    'preferred_name',
    'language',
    'working_style',
    'constraint',
    'fact',
    'other',
  ]
  return [...map.values()]
    .sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind))
    .slice(0, MAX_NOTES)
}

export function coercePersistNotes(raw: unknown): PersistNoteDraft[] {
  if (!raw || typeof raw !== 'object') return []
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as { notes?: unknown }).notes)
      ? ((raw as { notes: unknown[] }).notes)
      : Array.isArray((raw as { persistNotes?: unknown }).persistNotes)
        ? ((raw as { persistNotes: unknown[] }).persistNotes)
        : []
  const out: PersistNoteDraft[] = []
  for (const row of list.slice(0, 4)) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) continue
    const o = row as Record<string, unknown>
    const kind = String(o.kind ?? '') as BotNoteKind
    if (!KIND_SET.has(kind)) continue
    const opRaw = String(o.op ?? o.action ?? 'set').toLowerCase()
    const op: 'set' | 'remove' =
      opRaw === 'remove' || opRaw === 'delete' || opRaw === 'clear' ? 'remove' : 'set'
    const text = clip(String(o.text ?? ''), MAX_NOTE_CHARS)
    if (op === 'set' && !text) continue
    out.push({
      kind,
      key: typeof o.key === 'string' ? o.key.trim() || undefined : undefined,
      text: text || (op === 'remove' ? '' : text),
      op,
    })
  }
  return out
}

/** Format retrieved bot_notes pack for Edge. */
export function formatBotNotesForRetrieve(
  notes: readonly InterviewerBotNote[],
): string[] {
  return notes.map((n) => `(${n.kind}) ${n.text}`).slice(0, MAX_NOTES)
}

export type SittingReadTagSignal = 'good' | 'watch' | 'bad'

export const SITTING_READ_TAG_RE = /\[\[tag:(good|watch|bad)\|([^\]]+?)\]\]/g

export type SittingReadTag = {
  signal: SittingReadTagSignal
  label: string
  /** Short name for the chip (Tests, Method, Time). FE tooltips this. */
  hint?: string
}

export type SittingReadBrief = {
  /** One sentence: what this section is and what it expects. */
  intro: string
  /** Max 2. Overview bullets after the colon. */
  strengths: string[]
  /** Max 2. Overview bullets after the colon. */
  weaknesses: string[]
  /** One sentence under the score chip, tying it to the mix. */
  scoreWhy: string
}

export type SittingReadSection = {
  /** Live spine phase id. FE adds the title and mini-link. Bot never emits hrefs. */
  sectionId: string
  /** Per-template leftover markdown for Aid. Collapsed Results uses `brief`. */
  body: string
  /** Full leftover / boardSummaryDetail under See more. */
  detail?: string
  /** Quoted receipts from evidenceRefs. */
  quotes?: readonly string[]
  /** Quick chips for the finding. Optional when the body still has [[tag:]]. */
  tags?: readonly SittingReadTag[]
  /** Overview Summary shape: intro, strength/weakness bullets, score why. */
  brief?: SittingReadBrief
}

export type SittingReadPiece =
  | { kind: 'text'; text: string }
  | { kind: 'tag'; signal: SittingReadTagSignal; label: string }

export type SittingReadReport = {
  prose: string
  tags: SittingReadTag[]
}

function asTag(signal: string, label: string, hint?: string): SittingReadTag | null {
  const trimmed = label.trim()
  if (!trimmed) return null
  if (signal !== 'good' && signal !== 'watch' && signal !== 'bad') return null
  const named = typeof hint === 'string' ? hint.trim() : ''
  return named
    ? { signal, label: trimmed, hint: named }
    : { signal, label: trimmed }
}

function extractTags(body: string): SittingReadTag[] {
  const tags: SittingReadTag[] = []
  const re = new RegExp(SITTING_READ_TAG_RE.source, 'g')
  let match: RegExpExecArray | null
  while ((match = re.exec(body)) !== null) {
    const tag = asTag(match[1], match[2])
    if (tag) tags.push(tag)
  }
  return tags
}

function stripTags(body: string): string {
  const re = new RegExp(SITTING_READ_TAG_RE.source, 'g')
  return body
    .replace(re, ' ')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ +\n/g, '\n')
    .replace(/\n +/g, '\n')
    .replace(/[^\S\n]+([,.;:!?])/g, '$1')
    .trim()
}

function cleanTags(raw: readonly SittingReadTag[] | undefined): SittingReadTag[] {
  if (!raw?.length) return []
  const out: SittingReadTag[] = []
  for (const row of raw) {
    const tag = asTag(row.signal, row.label, row.hint)
    if (tag) out.push(tag)
  }
  return out
}

/** Two findings a side — the report summarises a stage, it does not enumerate it. */
function cleanLines(raw: unknown, max = 2): string[] {
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  for (const row of raw) {
    const line = String(row ?? '').trim()
    if (!line) continue
    if (out.some((x) => x.toLowerCase() === line.toLowerCase())) continue
    out.push(line)
    if (out.length >= max) break
  }
  return out
}

export function cleanSittingReadBrief(raw: unknown): SittingReadBrief | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const row = raw as Record<string, unknown>
  const intro = String(row.intro ?? '').trim()
  const scoreWhy = String(row.scoreWhy ?? '').trim()
  const strengths = cleanLines(row.strengths)
  const weaknesses = cleanLines(row.weaknesses)
  if (!intro && !scoreWhy && !strengths.length && !weaknesses.length) return undefined
  return { intro, strengths, weaknesses, scoreWhy }
}

/**
 * Overview finding + collapsed section body. Intro, then at most two strength /
 * two weakness bullets. Leftover grain dumps stay off this string.
 */
export function sittingReadFindingMarkdown(
  brief?: SittingReadBrief | null,
  leftoverFallback = '',
): string {
  const intro =
    brief?.intro?.trim() ||
    leftoverFallback.split('\n').find((line) => line.trim())?.trim() ||
    ''
  const bullets = [
    ...(brief?.strengths ?? []).map((line) => `- **Strength:** ${line}`),
    ...(brief?.weaknesses ?? []).map((line) => `- **Weakness:** ${line}`),
  ]
  if (!bullets.length) return intro
  const lead = intro.replace(/[.!?]+$/, '')
  return lead ? `${lead}:\n\n${bullets.join('\n')}` : bullets.join('\n')
}

/** Score chips for the sidebar: n/n, %, Pass/Fail. Time chips stay on findings only. */
export function isSittingReadScoreLabel(label: string, hint?: string): boolean {
  if (hint && /session mix/i.test(hint)) return false
  const text = label.trim()
  if (!text) return false
  if (/\bmin\b/i.test(text)) return false
  if (/%/.test(text)) return true
  if (/^\d+\s*\/\s*\d+$/.test(text)) return true
  if (/^(pass|fail)$/i.test(text)) return true
  return false
}

export function sittingReadScoreReading(tags: readonly SittingReadTag[]): string {
  return tags
    .filter((tag) => isSittingReadScoreLabel(tag.label, tag.hint))
    .map((tag) => tag.label)
    .join(' · ')
}

/** Lift chips off the finding body. Prefers sibling `tags` when present. */
export function sittingReadReport(input: string | SittingReadSection): SittingReadReport {
  const body = typeof input === 'string' ? input : input.body
  const explicit = typeof input === 'string' ? [] : cleanTags(input.tags)
  return {
    prose: stripTags(body),
    tags: explicit.length ? explicit : extractTags(body),
  }
}

export function parseSittingReadBody(body: string): SittingReadPiece[] {
  const pieces: SittingReadPiece[] = []
  const re = new RegExp(SITTING_READ_TAG_RE.source, 'g')
  let last = 0
  let match: RegExpExecArray | null
  while ((match = re.exec(body)) !== null) {
    if (match.index > last) {
      pieces.push({ kind: 'text', text: body.slice(last, match.index) })
    }
    const signal = match[1]
    if (signal === 'good' || signal === 'watch' || signal === 'bad') {
      pieces.push({ kind: 'tag', signal, label: match[2].trim() })
    }
    last = match.index + match[0].length
  }
  if (last < body.length) pieces.push({ kind: 'text', text: body.slice(last) })
  return pieces.filter((p) => (p.kind === 'text' ? p.text.length > 0 : true))
}

export function normalizeSittingRead(
  raw: string | readonly SittingReadSection[] | undefined,
): SittingReadSection[] {
  if (typeof raw === 'string') {
    if (!raw.trim()) return []
    return raw
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((body) => ({ sectionId: '', body }))
  }
  if (!Array.isArray(raw)) return []
  return raw
    .map((row) => {
      const brief = cleanSittingReadBrief(row.brief) ?? cleanSittingReadBrief(row)
      return {
        sectionId: String(row.sectionId ?? '').trim(),
        body: String(row.body ?? '').trim(),
        ...(row.detail?.trim() ? { detail: String(row.detail).trim() } : {}),
        ...(row.quotes?.length
          ? { quotes: row.quotes.map((q: string) => String(q).trim()).filter(Boolean) }
          : {}),
        tags: cleanTags(row.tags),
        ...(brief ? { brief } : {}),
      }
    })
    .filter((row) => row.body.length > 0 || Boolean(row.brief))
}

/**
 * Compact candidate CV note for Talk compose (prompt sheet, not full resume dump).
 */
import sampleCandidateCv from './examples/sampleCandidateCv.json' with { type: 'json' }

export type CandidateCvNote = {
  hasCv: boolean
  source: 'live' | 'sample' | 'none'
  displayName: string
  preferredName: string
  /** One short role/org or headline for opener rapport (not a resume dump). */
  rapportHook: string
  /** ~700–1000 char pack for Edge. */
  note: string
}

type CvLike = {
  schema_version?: number
  version?: number
  basics?: {
    display_name?: string
    preferred_name?: string
    headline?: string
    summary?: string
    [key: string]: unknown
  }
  sections?: Array<{
    kind?: string
    title?: string
    sort_order?: number
    items?: Array<Record<string, unknown>>
  }>
}

const MAX_NOTE = 1000
const MAX_BULLETS = 8
const MAX_BULLET_LEN = 140

function clip(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1).trim()}…`
}

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

function isUsableCv(cv: CvLike | null | undefined): boolean {
  if (!cv || typeof cv !== 'object') return false
  const name = str(cv.basics?.display_name) || str(cv.basics?.preferred_name)
  const sections = Array.isArray(cv.sections) ? cv.sections : []
  const hasItems = sections.some((s) => Array.isArray(s.items) && s.items.length > 0)
  return Boolean(name || hasItems || str(cv.basics?.headline) || str(cv.basics?.summary))
}

function collectBullets(cv: CvLike): string[] {
  const out: string[] = []
  const sections = [...(cv.sections ?? [])].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
  )
  for (const sec of sections) {
    const kind = str(sec.kind) || 'section'
    for (const item of sec.items ?? []) {
      if (out.length >= MAX_BULLETS) return out
      const org = str(item.org)
      const title = str(item.title)
      const name = str(item.name)
      const summary = str(item.summary)
      if (kind === 'experience' || kind === 'education') {
        const head = [title, org].filter(Boolean).join(' @ ')
        if (head) out.push(clip(`${kind}: ${head}`, MAX_BULLET_LEN))
      } else if (kind === 'projects' && (name || summary)) {
        out.push(clip(`project: ${name || summary}`, MAX_BULLET_LEN))
      } else if (kind === 'skills') {
        const tax = Array.isArray(item.taxonomy)
          ? item.taxonomy.map((t) => str(t)).filter(Boolean).slice(0, 6)
          : []
        if (tax.length) out.push(clip(`skills: ${tax.join(', ')}`, MAX_BULLET_LEN))
      }
      const bullets = Array.isArray(item.bullets) ? item.bullets : []
      for (const b of bullets) {
        if (out.length >= MAX_BULLETS) return out
        const line = str(b)
        if (line) out.push(clip(line, MAX_BULLET_LEN))
      }
    }
  }
  return out
}

function pickRapportHook(cv: CvLike): string {
  const sections = [...(cv.sections ?? [])].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
  )
  for (const sec of sections) {
    if (str(sec.kind) !== 'experience') continue
    for (const item of sec.items ?? []) {
      const title = str(item.title)
      const org = str(item.org)
      if (title && org) return clip(`${title} at ${org}`, 90)
      if (title || org) return clip(title || org, 90)
    }
  }
  const headline = str(cv.basics?.headline)
  if (headline) return clip(headline, 90)
  return ''
}

function buildNoteText(
  cv: CvLike,
  displayName: string,
  preferredName: string,
  rapportHook: string,
): string {
  const parts: string[] = []
  const callAs = preferredName || displayName
  if (callAs) {
    parts.push(
      preferredName && displayName && preferredName !== displayName
        ? `Candidate: preferred "${preferredName}" (display "${displayName}").`
        : `Candidate: ${callAs}.`,
    )
  }
  if (rapportHook) parts.push(`Rapport hook (one phrase only): ${rapportHook}`)
  const headline = str(cv.basics?.headline)
  const summary = str(cv.basics?.summary)
  if (headline) parts.push(`Headline: ${clip(headline, 160)}`)
  if (summary) parts.push(`Summary: ${clip(summary, 220)}`)
  const bullets = collectBullets(cv)
  if (bullets.length) {
    parts.push('Highlights:\n' + bullets.map((b) => `- ${b}`).join('\n'))
  }
  let note = parts.join('\n')
  if (note.length > MAX_NOTE) note = `${note.slice(0, MAX_NOTE - 1).trim()}…`
  return note
}

/**
 * Build a compact CV note for Talk. Falls back to sample when requested and
 * live body is empty/unusable.
 */
export function buildCandidateCvNote(input?: {
  cv?: CvLike | null
  useSampleFallback?: boolean
}): CandidateCvNote {
  const useSample = input?.useSampleFallback !== false
  let cv = input?.cv ?? null
  let source: CandidateCvNote['source'] = 'none'

  if (isUsableCv(cv)) {
    source = 'live'
  } else if (useSample) {
    cv = sampleCandidateCv as CvLike
    source = 'sample'
  } else {
    return {
      hasCv: false,
      source: 'none',
      displayName: '',
      preferredName: '',
      rapportHook: '',
      note: '',
    }
  }

  const displayName = str(cv!.basics?.display_name)
  const preferredName = str(cv!.basics?.preferred_name) || displayName.split(/\s+/)[0] || displayName
  const rapportHook = pickRapportHook(cv!)
  const note = buildNoteText(cv!, displayName, preferredName, rapportHook)

  return {
    hasCv: note.length > 0,
    source,
    displayName,
    preferredName,
    rapportHook,
    note,
  }
}

/** Load sample fixture note (tests / harness). */
export function sampleCandidateCvNote(): CandidateCvNote {
  return buildCandidateCvNote({ useSampleFallback: true })
}

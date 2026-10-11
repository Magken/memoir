import type { CvExtractV2 } from './index'

const MACHINE_WARN = new Set([
  'low_text',
  'scanned_pdf',
  'truncated',
  'pass2_failed',
  'ambiguous_layout',
  'parse_failed',
  'json_parse_failed',
  'pass2_skipped',
])

function looksLikeMachineWarn(value: string): boolean {
  const key = value.trim().toLowerCase()
  if (MACHINE_WARN.has(key)) return true
  return /^[a-z][a-z0-9_]*$/.test(key) && !key.includes(' ')
}

/** Skip “looks fine / no issue” QA chatter that should never hit the UI. */
export function isConfirmatoryTip(value: string): boolean {
  const t = value.trim()
  if (!t) return true
  return (
    /\b(no issue|not an issue|no (error|problem|concern)|looks (fine|good|correct|ok)|which is correct|matches (the )?(source|content)|as expected|nothing (to|missing)|all (good|fine))\b/i.test(
      t,
    ) || /^(ok|fine|correct|n\/?a)\.?$/i.test(t)
  )
}

function mapMachineWarning(key: string): string | null {
  switch (key) {
    case 'low_text':
    case 'scanned_pdf':
      return 'Parts of your CV were hard to read — please skim names, dates, and bullets carefully.'
    case 'truncated':
      return 'Your CV was long, so some text may be missing — scroll through and fill any gaps.'
    case 'pass2_failed':
      return 'We could not finish a second check — please review the full document before submitting.'
    case 'ambiguous_layout':
      return 'The layout was ambiguous — confirm job titles, schools, and date ranges.'
    case 'parse_failed':
    case 'json_parse_failed':
      return 'Some sections may need a closer look before you submit.'
    default:
      return null
  }
}

function softUserFrame(text: string): string {
  const t = text.trim().replace(/\s+/g, ' ')
  if (!t) return t
  if (/^(please|check|double-check|make sure|confirm|look over|consider|your)\b/i.test(t)) {
    return t
  }
  // Drop internal extract voice without inventing new facts.
  return t
    .replace(/\bpass[- ]?1\b/gi, 'draft')
    .replace(/\btaxonomy\b/gi, 'grouped')
    .replace(/\bcoverage\b/gi, 'review')
}

function tipFromMissed(entry: CvExtractV2['missed'][number]): string | null {
  const note = (entry.note ?? '').trim()
  if (note && !looksLikeMachineWarn(note) && !isConfirmatoryTip(note)) {
    return softUserFrame(note)
  }
  const snip = (entry.snippet ?? '').trim().replace(/\s+/g, ' ')
  if (!snip || isConfirmatoryTip(snip)) return null
  const short = snip.length > 90 ? `${snip.slice(0, 87)}…` : snip
  return `Please double-check this detail from your CV: “${short}”`
}

/**
 * Build short, candidate-facing review tips from extract coverage + missed.
 * Filters confirmatory / machine-only noise.
 */
export function buildCvReviewTips(
  fields: Pick<CvExtractV2, 'coverage' | 'missed'>,
): string[] {
  const tips: string[] = []

  for (const raw of fields.coverage?.warnings ?? []) {
    const w = String(raw ?? '').trim()
    if (!w || isConfirmatoryTip(w)) continue
    const key = w.toLowerCase()
    if (looksLikeMachineWarn(key)) {
      const mapped = mapMachineWarning(key)
      if (mapped) tips.push(mapped)
      continue
    }
    tips.push(softUserFrame(w))
  }

  for (const kind of fields.coverage?.missing_common ?? []) {
    const tip = tipFromMissingKind(String(kind ?? ''))
    if (tip) tips.push(tip)
  }

  for (const missed of fields.missed ?? []) {
    const tip = tipFromMissed(missed)
    if (tip) tips.push(tip)
  }

  return [...new Set(tips)].slice(0, 8)
}

function tipFromMissingKind(kind: string): string | null {
  const key = kind.trim().toLowerCase()
  if (!key) return null
  switch (key) {
    case 'experience':
      return 'We did not find a clear Experience section — add jobs if they belong on this CV.'
    case 'education':
      return 'Education looks thin or missing — confirm schools and degrees.'
    case 'skills':
      return 'Skills may be incomplete — add any important tools or specialties.'
    case 'projects':
      return 'No projects section was detected — add one if your CV includes projects.'
    case 'publications':
      return 'Publications were not detected — add them if they should appear here.'
    case 'certifications':
    case 'awards':
    case 'volunteer':
    case 'references':
      return `No ${key} section was detected — add it if it should be on your CV.`
    default:
      if (looksLikeMachineWarn(key)) return null
      return `A common section (${key}) was not detected — add it if it should be on your CV.`
  }
}

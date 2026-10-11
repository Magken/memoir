/**
 * Deterministic assist peel opener — section handoff + authored Assist capability.
 * Same interviewer already met the candidate on Talk / earlier stages.
 */
import type { ToolAssistBundleMatch, ToolAssistCaps } from '../interviewBrief/toolAssistBundles'
import { matchToolAssistBundle, resolveToolAssistCaps } from '../interviewBrief/toolAssistBundles'
import type { GateToolKind } from './resolveGateToolMount'

function scrubSpokenDesc(raw: string): string {
  let t = raw
    .replace(/[\u2014\u2013]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
  t = t
    .replace(
      /\b(strong answers|scoring|assess(?:es|ment)?|this section matters|warm-up, not|all items must be passed|must be passed to continue|pack label)\b[^.?!]*[.?!]?/gi,
      '',
    )
    .replace(/\s+/g, ' ')
    .trim()
  const parts = t.split(/(?<=[.?!])\s+/).filter(Boolean)
  let core = (parts[0] ?? '').trim()
  core = core
    .replace(/^Complete this required\b/i, 'This is a short required')
    .replace(/^You will\b/i, "You'll")
    .replace(
      /^This is a short required eligibility and work authorization screening before proceeding to the main interview\.?$/i,
      'It is a short eligibility screen before the main interview.',
    )
    .replace(
      /\beligibility and work authorization screening before proceeding to the main interview\b/i,
      'eligibility screen before the main interview',
    )
  if (core && !/[.?!]$/.test(core)) core = `${core}.`
  return core
}

function kindLabel(kind: GateToolKind): string {
  if (kind === 'form') return 'form'
  if (kind === 'coding') return 'coding challenge'
  return 'writing piece'
}

function pick(seed: string, variants: readonly string[]): string {
  let h = 0
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return variants[h % variants.length]!
}

/** Resolve named bundle for opener / peel chrome (Assistant default when peel is open). */
export function assistOpenerBundleId(input?: {
  bundleId?: ToolAssistBundleMatch | string | null
  caps?: Partial<ToolAssistCaps> | null
}): ToolAssistBundleMatch {
  const named = String(input?.bundleId ?? '').trim()
  if (
    named === 'assistant' ||
    named === 'coach' ||
    named === 'copilot' ||
    named === 'custom' ||
    named === 'none'
  ) {
    return named
  }
  return matchToolAssistBundle(resolveToolAssistCaps(input?.caps))
}

function capabilityBeat(
  seed: string,
  bundleId: ToolAssistBundleMatch,
  caps: ToolAssistCaps,
): string {
  if (bundleId === 'copilot' || caps.write) {
    return pick(seed + 'cap', [
      'If a line is unclear, ask here. I can hint, or propose one edit. Review it with Check or X.',
      'Ask here if anything is confusing. I can hint or propose one change at a time. Check or X writes it into the editor.',
    ])
  }
  if (bundleId === 'coach' || (caps.spoilers && !caps.write)) {
    return pick(seed + 'cap', [
      'If a line is confusing, ask here. I can hint at the part you name. I will not write in the editor or walk the whole challenge.',
      'Ask here if a line is unclear. I can hint at one part at a time. I will not type into the editor.',
    ])
  }
  return pick(seed + 'cap', [
    'If anything is unclear, I will restate it here. I will not hint at answers or write in the editor.',
    "I'll clarify prompts here if anything reads oddly. I cannot give answers or edit the work.",
    'Say if a line is confusing and I will put it in plain language. I will not hint or write for you.',
  ])
}

function shortPrevLabel(title: string): string {
  const t = title.replace(/\s+/g, ' ').trim()
  if (!t) return 'that last section'
  // Keep labels speakable — drop long "Opening: …" to the part after colon when useful.
  const afterColon = t.includes(':') ? t.split(':').slice(1).join(':').trim() : ''
  if (afterColon && afterColon.length >= 8 && afterColon.length <= 48) return afterColon
  if (t.length <= 52) return t
  return 'that last section'
}

/**
 * Conversational assist opener after tool Start.
 * First assessment (no prior section): greet + introduce this stage.
 * Later stages: thank prior + hand off. No Hi on a mid-day handoff.
 */
export function composeAssistOpenerUtterance(input: {
  title: string
  description?: string
  kind: GateToolKind
  timed?: boolean
  limitMinutes?: number | null
  seed?: string
  /** Spoken on first-assessment intro only. Mid-day handoff keeps persona on peel chrome. */
  personaName?: string
  /** Ignored for opener copy — no Hi {name} on mid-day tool stages. */
  preferredName?: string
  /** Title of the section they just left (completed / skipped / prior spine). */
  previousTitle?: string | null
  /** Authored Assist level — opener must say what this peel can do. */
  bundleId?: ToolAssistBundleMatch | string | null
  caps?: Partial<ToolAssistCaps> | null
}): string {
  const title = input.title.replace(/\s+/g, ' ').trim() || kindLabel(input.kind)
  const desc = scrubSpokenDesc(input.description ?? '')
  const seed = input.seed ?? `${input.kind}:${title}`
  const prev = shortPrevLabel(input.previousTitle?.trim() || '')
  const caps = resolveToolAssistCaps(input.caps)
  const bundleId = assistOpenerBundleId({ bundleId: input.bundleId, caps })
  const prior = input.previousTitle?.trim() || ''
  const opening = !prior
  const persona = input.personaName?.trim() || ''

  const thanks = prior
    ? pick(seed + 'th', [
        `Thanks for completing ${prev}.`,
        `Thanks for wrapping up ${prev}.`,
        `Appreciate you finishing ${prev}.`,
      ])
    : null

  const handoff = pick(seed + 'h', [
    `Next up is ${title}.`,
    `We're moving into ${title}.`,
    `This next piece is ${title}.`,
  ])

  const introGreet = persona
    ? pick(seed + 'g', [`Hi, I'm ${persona}.`, `Hello, I'm ${persona}.`])
    : pick(seed + 'g', ['Hi.', 'Hello.'])
  const introInvite = pick(seed + 'i', [`This is ${title}.`, `We'll start with ${title}.`])

  const workByKind: Record<GateToolKind, string[]> = {
    form: [
      'Take the questions in the main panel when you are ready.',
      'Fill out the form in the panel - I will stay here if anything is unclear.',
    ],
    coding: [
      'The challenge is in the editor on the left and center.',
      'Open the files in the panel and work from the instructions there.',
    ],
    doc: [
      'Draft your response in the document canvas in the panel.',
      'Write in the main panel when you are ready - follow the brief there.',
    ],
  }

  const bits: string[] = []
  if (opening) {
    bits.push(introGreet, introInvite)
  } else {
    if (thanks) bits.push(thanks)
    bits.push(handoff)
  }

  if (desc) {
    const soft = desc
      .replace(
        /^This is a short required eligibility and work authorization screening before proceeding to the main interview\./i,
        'It is a short eligibility screen before the main interview.',
      )
      .replace(
        /^Complete this required eligibility and work authorization screening before proceeding to the main interview\./i,
        'It is a short eligibility screen before the main interview.',
      )
    bits.push(soft)
  } else {
    bits.push(pick(seed + 'w', workByKind[input.kind]))
  }

  if (input.timed && input.limitMinutes && input.limitMinutes > 0) {
    bits.push(
      pick(seed + 't', [
        `You have about ${input.limitMinutes} minutes.`,
        `Roughly ${input.limitMinutes} minutes on the clock.`,
      ]),
    )
    bits.push(
      pick(seed + 'run', [
        'The timer keeps running while you work.',
        'The clock keeps running while you work on this stage.',
      ]),
    )
  }

  bits.push(capabilityBeat(seed, bundleId, caps))

  return bits.join(' ').replace(/\s+/g, ' ').replace(/\s+([.?!])/g, '$1').trim()
}

/** Immediate prior spine section title for assist thanks beat. */
export function previousGateTitle(input: {
  sections: ReadonlyArray<{ id: string; title: string; kindLabel?: string }>
  currentPhaseId: string
  completedPhaseIds?: readonly string[]
  skippedPhaseIds?: readonly string[]
}): string | null {
  const ids = input.sections.map((s) => s.id)
  const idx = ids.indexOf(input.currentPhaseId)
  if (idx <= 0) return null
  const closed = new Set([
    ...(input.completedPhaseIds ?? []),
    ...(input.skippedPhaseIds ?? []),
  ])
  for (let i = idx - 1; i >= 0; i -= 1) {
    const id = ids[i]!
    if (closed.size === 0 || closed.has(id)) {
      const sec = input.sections[i]!
      const label = sec.title.trim() || sec.kindLabel?.trim() || ''
      if (label) return label
    }
  }
  return null
}

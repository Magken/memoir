/**
 * Candidate support note — self-report only.
 * Mode is required on landing Start. Named mode also requires a condition and a look row.
 * Staff Clarity quotes it so a marker can see why clocks look the way they do.
 * Never a diagnosis. Never consumed by InterviewHardTimer, Assist caps, or
 * scoreAttempt. Does not add minutes, extra Assist, or any mark.
 */

export const SITTING_DECLARATION_SCHEMA = 'vurify/sitting-declaration.v1' as const

export type SittingConditionId = 'adhd' | 'dyslexia' | 'dyspraxia' | 'autism' | 'other'

export type SittingHelpId =
  | 'timed_pace'
  | 'written_over_spoken'
  | 'quiet_breaks'
  | 'dictation'
  | 'other'

export type SittingDeclareMode = 'none' | 'quiet' | 'named'

export type SittingDeclarationField =
  | 'mode'
  | 'conditions'
  | 'look'
  | 'notes'
  | 'otherCondition'
  | 'otherHelp'

export type SittingDeclaration = {
  schema: typeof SITTING_DECLARATION_SCHEMA
  updatedAt: string
  nothingToDeclare: boolean
  preferNotToSay: boolean
  /** Candidate pick on the landing form. Older saves omit this. */
  declareMode?: SittingDeclareMode
  conditions: SittingConditionId[]
  otherCondition?: string
  helps: SittingHelpId[]
  otherHelp?: string
  notes?: string
  /** ISO time each landing field last changed. */
  fieldAt?: Partial<Record<SittingDeclarationField, string>>
}

export const SITTING_TERMS_SCHEMA = 'vurify/sitting-terms.v1' as const

export type SittingTermsAck = {
  schema: typeof SITTING_TERMS_SCHEMA
  agreed: boolean
  updatedAt: string
  /** When they last accepted. Null if they have not accepted. */
  agreedAt: string | null
}

export const INTAKE_DECLARATIONS_SCHEMA = 'vurify/intake-declarations.v1' as const

export type IntakeDeclarationsPack = {
  schema: typeof INTAKE_DECLARATIONS_SCHEMA
  terms: {
    agreed: boolean
    updatedAt: string
    agreedAt: string | null
    statement: string
  } | null
  supportNote: SittingDeclaration | null
  supportNoteDigest: SittingDeclarationDigest
}

export type SittingDeclarationDigest = {
  empty: boolean
  preferNotToSay: boolean
  labels: string[]
  helps: string[]
  notes?: string
}

export const SITTING_CONDITION_OPTIONS: Array<{
  id: SittingConditionId
  label: string
  hint: string
}> = [
  {
    id: 'adhd',
    label: 'ADHD',
    hint: 'Attention, time sense, or switching between tasks can look uneven.',
  },
  {
    id: 'dyslexia',
    label: 'Dyslexia',
    hint: 'Reading, spelling, or writing speed can lag behind how you think out loud.',
  },
  {
    id: 'dyspraxia',
    label: 'Dyspraxia / DCD',
    hint: 'Fine motor work or lining up steps can take longer.',
  },
  {
    id: 'autism',
    label: 'Autism',
    hint: 'A long stretch on one problem, or a hard stop when the brief changes, can be how you work.',
  },
  {
    id: 'other',
    label: 'Something else',
    hint: 'Name it in your own words if you want a reviewer to know.',
  },
]

export const SITTING_HELP_OPTIONS: Array<{
  id: SittingHelpId
  label: string
  hint: string
}> = [
  {
    id: 'timed_pace',
    label: 'Timed work: I may go slowly, then finish in a rush',
    hint: 'The timer still ends when it ends. This only notes that a last-minute rush may show.',
  },
  {
    id: 'written_over_spoken',
    label: 'Conversation vs typing: spoken answers and typed work can look different',
    hint: 'Spoken answers and typed work can look different. A reviewer notes the mix; they do not swap one for the other.',
  },
  {
    id: 'quiet_breaks',
    label: 'Pauses: I may go quiet to reset',
    hint: 'Quiet stretches can be a reset. The interview is not paused for you.',
  },
  {
    id: 'dictation',
    label: 'Speaking: I may answer out loud instead of typing',
    hint: 'Speaking answers is a real way of working. It is not extra time.',
  },
  {
    id: 'other',
    label: 'Something else a reviewer might see',
    hint: 'Say what they might notice. This does not change the interview.',
  },
]

const CONDITION_LABEL: Record<SittingConditionId, string> = {
  adhd: 'ADHD',
  dyslexia: 'Dyslexia',
  dyspraxia: 'Dyspraxia / DCD',
  autism: 'Autism',
  other: 'Other (self-described)',
}

const HELP_LABEL: Record<SittingHelpId, string> = {
  timed_pace: 'Self-report: timed work can bunch at the end',
  written_over_spoken: 'Self-report: spoken and typed work can look uneven',
  quiet_breaks: 'Self-report: pauses or quiet stretches can appear on the tape',
  dictation: 'Self-report: may compose by speaking',
  other: 'Self-report: other sitting pattern noted',
}

/** Older local saves used extra_time as an accommodation ask. Map to the note-only id. */
const HELP_ALIASES: Record<string, SittingHelpId> = {
  extra_time: 'timed_pace',
}

function asHelpId(id: string): SittingHelpId | null {
  if (id in HELP_LABEL) return id as SittingHelpId
  return HELP_ALIASES[id] ?? null
}

export function emptySittingDeclaration(): SittingDeclaration {
  return {
    schema: SITTING_DECLARATION_SCHEMA,
    updatedAt: new Date().toISOString(),
    nothingToDeclare: false,
    preferNotToSay: false,
    conditions: [],
    helps: [],
    fieldAt: {},
  }
}

export function emptySittingTerms(): SittingTermsAck {
  return {
    schema: SITTING_TERMS_SCHEMA,
    agreed: false,
    updatedAt: new Date().toISOString(),
    agreedAt: null,
  }
}

const PATCH_TO_FIELD: Record<string, SittingDeclarationField> = {
  declareMode: 'mode',
  nothingToDeclare: 'mode',
  preferNotToSay: 'mode',
  conditions: 'conditions',
  otherCondition: 'otherCondition',
  helps: 'look',
  otherHelp: 'otherHelp',
  notes: 'notes',
}

/** Stamp `updatedAt` plus `fieldAt` for each form field in the patch. */
export function stampSittingDeclaration(
  prev: SittingDeclaration,
  patch: Partial<SittingDeclaration>,
  at = new Date().toISOString(),
): SittingDeclaration {
  const fieldAt = { ...(prev.fieldAt ?? {}) }
  for (const key of Object.keys(patch)) {
    const field = PATCH_TO_FIELD[key]
    if (field) fieldAt[field] = at
  }
  return {
    ...prev,
    ...patch,
    schema: SITTING_DECLARATION_SCHEMA,
    updatedAt: at,
    fieldAt,
  }
}

export function stampSittingTerms(
  prev: SittingTermsAck | null | undefined,
  agreed: boolean,
  at = new Date().toISOString(),
): SittingTermsAck {
  return {
    schema: SITTING_TERMS_SCHEMA,
    agreed,
    updatedAt: at,
    agreedAt: agreed ? (prev?.agreed && prev.agreedAt ? prev.agreedAt : at) : null,
  }
}

export const INTAKE_TERMS_STATEMENT = 'I agree to the interview terms'

export function packageIntakeDeclarations(input: {
  terms?: SittingTermsAck | null
  supportNote?: SittingDeclaration | null
}): IntakeDeclarationsPack {
  const terms = input.terms?.schema === SITTING_TERMS_SCHEMA ? input.terms : null
  const supportNote =
    input.supportNote?.schema === SITTING_DECLARATION_SCHEMA ? input.supportNote : null
  return {
    schema: INTAKE_DECLARATIONS_SCHEMA,
    terms: terms
      ? {
          agreed: terms.agreed,
          updatedAt: terms.updatedAt,
          agreedAt: terms.agreedAt,
          statement: INTAKE_TERMS_STATEMENT,
        }
      : null,
    supportNote,
    supportNoteDigest: digestSittingDeclaration(supportNote),
  }
}

export function isSittingTermsAck(v: unknown): v is SittingTermsAck {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false
  const rec = v as SittingTermsAck
  return rec.schema === SITTING_TERMS_SCHEMA && typeof rec.agreed === 'boolean'
}

export function isSittingDeclaration(v: unknown): v is SittingDeclaration {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false
  const rec = v as SittingDeclaration
  return rec.schema === SITTING_DECLARATION_SCHEMA
}

export function digestSittingDeclaration(
  doc: SittingDeclaration | null | undefined,
): SittingDeclarationDigest {
  if (!doc || doc.schema !== SITTING_DECLARATION_SCHEMA) {
    return { empty: true, preferNotToSay: false, labels: [], helps: [] }
  }
  const helpIds = (doc.helps ?? []).map((id) => asHelpId(String(id))).filter((id): id is SittingHelpId => Boolean(id))
  if (doc.preferNotToSay) {
    return {
      empty: false,
      preferNotToSay: true,
      labels: ['Prefer not to say'],
      helps: helpIds.map((id) => HELP_LABEL[id]),
      ...(doc.notes?.trim() ? { notes: doc.notes.trim().slice(0, 800) } : {}),
    }
  }
  if (doc.nothingToDeclare && !doc.conditions.length && !helpIds.length && !doc.notes?.trim()) {
    return { empty: true, preferNotToSay: false, labels: [], helps: [] }
  }
  const labels: string[] = []
  for (const id of doc.conditions) {
    if (id === 'other' && doc.otherCondition?.trim()) {
      labels.push(`${doc.otherCondition.trim().slice(0, 80)} (self-report)`)
    } else {
      labels.push(`${CONDITION_LABEL[id]} (self-report)`)
    }
  }
  const helps = helpIds.map((id) => {
    if (id === 'other' && doc.otherHelp?.trim()) {
      return `Self-report: ${doc.otherHelp.trim().slice(0, 80)}`
    }
    return HELP_LABEL[id]
  })
  const empty = !labels.length && !helps.length && !doc.notes?.trim() && !doc.nothingToDeclare
  return {
    empty,
    preferNotToSay: false,
    labels,
    helps,
    ...(doc.notes?.trim() ? { notes: doc.notes.trim().slice(0, 800) } : {}),
  }
}

/** Staff atlas strip. Candidate Talk must not receive this object. */
export function sittingDeclarationAtlasBlock(
  doc: SittingDeclaration | null | undefined,
): SittingDeclarationDigest {
  return digestSittingDeclaration(doc)
}

export const DECLARE_Q_MODE = 'declare_mode'
export const DECLARE_Q_CONDITIONS = 'declare_conditions'
export const DECLARE_Q_LOOK = 'declare_look'
export const DECLARE_Q_NOTES = 'declare_notes'

/** Candidate-facing Support form copy. Name the reviewer in plain English — no tape / clocks / channels jargon. */
export const DECLARE_FORM_COPY = {
  mode: {
    prompt: 'Should a reviewer know about a condition or difference that can change how you work?',
    description:
      'This is not a medical test. It does not add time, extra help, or change scores.',
    hint: 'You can still describe how you work even if you skip naming a condition.',
    options: [
      { id: 'none', label: 'No. Nothing to declare' },
      { id: 'quiet', label: 'I’d rather not name a condition' },
      { id: 'named', label: 'Yes. I’ll name what can change how my work looks' },
    ],
  },
  conditions: {
    prompt: 'Which of these apply?',
    description: 'Name only what you want a reviewer to know. We will not diagnose you.',
    hint: 'Select every one that fits. These are your words, not a medical finding.',
  },
  look: {
    prompt: 'How can your work look during this interview?',
    description:
      'Timed parts still end when the timer ends. This does not pause the interview or add extra help.',
    hint: 'This helps someone reading later. It is not a request for extra time.',
  },
  notes: {
    prompt: 'Anything else a reviewer should know?',
    description: 'Optional. Only the reviewer sees this. It does not change the timer or scores.',
    hint: 'A short note is enough.',
  },
  otherConditionLabel: 'Name it in your own words',
  otherHelpLabel: 'What a reviewer might see',
} as const

export const DECLARE_Q_FIELD: Record<string, SittingDeclarationField> = {
  [DECLARE_Q_MODE]: 'mode',
  [DECLARE_Q_CONDITIONS]: 'conditions',
  [DECLARE_Q_LOOK]: 'look',
  [DECLARE_Q_NOTES]: 'notes',
}

export type SittingDeclarationReviewTag = {
  label: string
  signal: 'good' | 'watch' | 'bad'
  hint: string
}

/** Collapsed Results tag: whether the landing support note named anything. */
export function sittingDeclarationReviewTag(
  pack: IntakeDeclarationsPack | null | undefined,
): SittingDeclarationReviewTag {
  const note = pack?.supportNote
  if (!pack || !note || note.schema !== SITTING_DECLARATION_SCHEMA) {
    return {
      label: 'No note',
      signal: 'watch',
      hint: 'No landing support note on this attempt',
    }
  }
  const mode = sittingDeclareMode(note)
  const digest = pack.supportNoteDigest
  if (mode === 'quiet' || digest.preferNotToSay || note.preferNotToSay) {
    return {
      label: 'Prefer not to say',
      signal: 'watch',
      hint: 'They asked not to name a condition',
    }
  }
  if (mode === 'none' || note.nothingToDeclare) {
    return {
      label: 'Nothing to declare',
      signal: 'good',
      hint: 'They said there is nothing to declare',
    }
  }
  if (mode === 'named' || digest.labels.length || digest.helps.length || digest.notes) {
    return {
      label: 'Declared',
      signal: 'good',
      hint: digest.labels[0] ?? digest.helps[0] ?? 'A support note is on file',
    }
  }
  return {
    label: 'No note',
    signal: 'watch',
    hint: 'Landing form was not completed',
  }
}

/** Field / terms clock for the result Declarations fold. */
export function formatSittingDeclareStamp(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function sittingDeclareMode(doc: SittingDeclaration): SittingDeclareMode | null {
  if (doc.declareMode) return doc.declareMode
  if (doc.preferNotToSay) return 'quiet'
  if (doc.nothingToDeclare) return 'none'
  if (doc.conditions.length) return 'named'
  return null
}

/** Mode is required. Named mode also requires at least one condition and one look row. */
export function sittingDeclarationReady(doc: SittingDeclaration): boolean {
  const mode = sittingDeclareMode(doc)
  if (!mode) return false
  if (mode !== 'named') return true
  if (!doc.conditions.length) return false
  if (doc.conditions.includes('other') && !doc.otherCondition?.trim()) return false
  if (!doc.helps.length) return false
  if (doc.helps.includes('other') && !doc.otherHelp?.trim()) return false
  return true
}

/** Named follow-ups that are easy to miss. Mode and terms stay on the page. */
export function sittingDeclarationBlockHint(doc: SittingDeclaration): string | null {
  const mode = sittingDeclareMode(doc)
  if (mode !== 'named') return null
  if (!doc.conditions.length) return 'Select at least one condition.'
  if (doc.conditions.includes('other') && !doc.otherCondition?.trim()) {
    return 'Name the condition in your own words.'
  }
  if (!doc.helps.length) return 'Choose how your work can look during this interview.'
  if (doc.helps.includes('other') && !doc.otherHelp?.trim()) {
    return 'Describe what a reviewer might see.'
  }
  return null
}

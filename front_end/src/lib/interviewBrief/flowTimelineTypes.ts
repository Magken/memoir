/** Friendly spine steps for Interview Creator 2 (timeline authoring — not Flow graph). */

import type { Creator2When } from './creator2BriefTypes'
import type { CodeEditorPayload, DocEditorPayload } from '../editorContext/types'
import type { TestFormDocument } from '../testForm/types'
import type { InterviewFlowTemplateCardMeta } from './analysisLabels'

export type InterviewFlowStepKind = 'talk' | 'form' | 'coding' | 'doc' | 'wrap' | 'unknown'

export type InterviewFlowBranch = {
  id: string
  label: string
  next: string
  tone?: 'pass' | 'fail' | 'soft'
}

export type InterviewFlowProbe = {
  id: string
  goal: string
  required?: boolean
  hint?: string | null
}

export type InterviewFlowTarget = {
  key: string
  label: string
  required?: boolean
  description?: string
  datatype?: string
  enumValues?: string[]
}

export type InterviewFlowAnalysisLine = {
  id: string
  label: string
  when: string
  /** Registry id — kept for authoring / edit clarity */
  templateId: string
}

export type InterviewFlowFormQuestion = {
  id: string
  prompt: string
  required?: boolean
  kind?: string
  /** Whether this item is in the answer key / gate */
  gatesPass?: boolean
}

export type InterviewFlowTestCase = {
  id: string
  name: string
}

export type InterviewFlowFormOnFail = 'none' | 'skip' | 'endAttempt' | 'goToPhase'

/** Compare mode for the external test-runner API (not LLM). */
export type InterviewFlowCodingCompare = 'deep_equal' | 'exact' | 'unordered'

/**
 * Deterministic coding case — shaped for an external runner:
 * `entryPoint(...args)` → compare to `expected`.
 */
export type InterviewFlowCodingTestCase = {
  id: string
  name: string
  /** Short author note: what this case covers */
  description?: string
  /** Positional arguments passed to `tests.entryPoint` */
  args: unknown[]
  expected: unknown
  compare: InterviewFlowCodingCompare
  /** Hidden from the candidate; still sent to the runner */
  hidden: boolean
  timeoutMs?: number | null
  /** Workspace paths this case exercises (defaultLanguage stems). Display + hop only. */
  covers?: string[]
}

/** Editable coding-tool payload for Creator 2 timeline (JSON ↔ UI). */
export type InterviewFlowCodingEditorState = {
  toolRef: string
  sectionTitle: string
  summaryBlurb: string
  packLabel: string
  instructions: string
  /**
   * Allowed challenge languages (catalog ids). Empty = unrestricted.
   * Candidates pick one of these when submitting to the runner.
   */
  languages: string[]
  /** Candidate starting language — must be in `languages` when that list is non-empty. */
  defaultLanguage: string | null
  workspace: CodeEditorPayload
  tests: {
    runner: string
    /** Function the runner invokes, e.g. `twoSum` */
    entryPoint: string
    cases: InterviewFlowCodingTestCase[]
    /** Author-only reference that should pass all cases */
    referenceSolution?: string | null
  }
  onFail: InterviewFlowFormOnFail
  onFailPhaseId?: string | null
  /** Earlier-only RAG bind (up to 3). Empty = None. */
  referencesPhaseId?: string | null
  referencesPhaseIds?: string[]
  estimatedMinutes?: number
  timed: boolean
  limitMinutes: number | null
  /** Locked implied analysis template ids (`tools.*.analysis.templateIds`). */
  analysisTemplateIds: string[]
  /** Per-template soft weights for this phase (`analysis.rollup.templateWeights[phaseId]`). */
  templateWeights?: Record<string, number>
  /** Candidate assist caps (`tools.*.assist`). Missing = None. */
  assist: { chat: boolean; spoilers: boolean; write: boolean }
}

export type InterviewFlowDocPromptStructure = {
  id: string
  label: string
  hint?: string
  minParagraphs?: number
}

/** One score band on a writing criterion (IELTS/TOEFL-style descriptor). */
export type InterviewFlowDocRubricBand = {
  id: string
  /** Short level label — e.g. "4 — Strong" or "Band 7". */
  label: string
  /** What performance at this level looks like for raters. */
  descriptor: string
}

/** Analytic marking criterion — name + gloss + ordered bands. */
export type InterviewFlowDocRubricDimension = {
  key: string
  label: string
  /** What this criterion measures. */
  criterion?: string
  /** Soft share of this essay's mark (0–1). Sum of present weights ≈ 1.0. Not Decision rollup.essay. */
  weight?: number
  /**
   * `prompt.structure[].id` rows this criterion grades.
   * Empty/omit = holistic (whole response). Multi + overlapping allowed.
   */
  structureIds?: string[]
  bands: InterviewFlowDocRubricBand[]
}

export type InterviewFlowDocAssessment = {
  kind: 'rubric' | 'format'
  dimensions: InterviewFlowDocRubricDimension[]
  formatNotes?: string
}

/** Editable writing/doc-tool payload for Creator 2 timeline (JSON ↔ UI). */
export type InterviewFlowDocEditorState = {
  toolRef: string
  sectionTitle: string
  summaryBlurb: string
  packLabel: string
  instructions: string
  prompt: {
    brief: string
    structure: InterviewFlowDocPromptStructure[]
    requirements: string[]
  }
  assessment: InterviewFlowDocAssessment
  document: DocEditorPayload
  minWords?: number
  maxWords?: number
  onFail: InterviewFlowFormOnFail
  onFailPhaseId?: string | null
  /** Earlier-only RAG bind (up to 3). Empty = None. */
  referencesPhaseId?: string | null
  referencesPhaseIds?: string[]
  estimatedMinutes?: number
  timed: boolean
  limitMinutes: number | null
  /** Locked implied analysis template ids (`tools.*.analysis.templateIds`). */
  analysisTemplateIds: string[]
  /** Per-template soft weights for this phase (`analysis.rollup.templateWeights[phaseId]`). */
  templateWeights?: Record<string, number>
  /** Candidate assist caps (`tools.*.assist`). Missing = None. */
  assist: { chat: boolean; spoilers: boolean; write: boolean }
}

export type InterviewFlowTiming = {
  mode: 'timed' | 'untimed'
  estimatedMinutes?: number
  /** Hard cap when timed */
  limitMinutes?: number | null
}

/** Collapsed-row chips — tone drives Tag color; glyph drives icon (shared with talk editor). */
export type InterviewFlowSummaryTagTone =
  | 'kind'
  | 'count'
  | 'time'
  | 'pack'
  | 'gate'
  | 'meta'
  | 'accent'

/**
 * Stable concept id for icons — one concept → one Lucide glyph across
 * day-view tags, talk MetaTags, and expanded rail actions.
 */
export type InterviewFlowSummaryGlyph =
  | 'time'
  | 'turns'
  | 'replies'
  | 'probes'
  | 'probeCap'
  | 'targets'
  | 'pack'
  | 'opening'
  | 'closing'
  | 'required'
  | 'when'
  | 'fail'
  | 'gate'
  | 'count'
  | 'meta'
  | 'kind'
  | 'lang'
  | 'lock'
  | 'refs'

export type InterviewFlowSummaryTag = {
  id: string
  label: string
  tone?: InterviewFlowSummaryTagTone
  /** Prefer over tone-only icons so probes ≠ turns ≠ targets. */
  glyph?: InterviewFlowSummaryGlyph
  /** Optional hover detail (e.g. attached template names). */
  tooltip?: string
}

/** Editable form-tool payload for Creator 2 timeline (JSON ↔ UI). */
export type InterviewFlowFormEditorState = {
  toolRef: string
  document: TestFormDocument
  /** Collapsed / spine section title (phase.title). */
  sectionTitle: string
  /** Collapsed summary blurb (phase.summary.blurb). */
  summaryBlurb: string
  /** Pack / gate chip text (phase.summary.packLabel). */
  packLabel: string
  /** Whether `passThreshold` gates later phases. */
  isGate: boolean
  /** Fail policy for this phase (or dependents’ jump when this is the gate tool). */
  onFail: InterviewFlowFormOnFail
  onFailPhaseId?: string | null
  /** Earlier-only RAG bind (up to 3). Empty = None. */
  referencesPhaseId?: string | null
  referencesPhaseIds?: string[]
  /** Soft planned minutes (auto from questions unless timed override). */
  estimatedMinutes?: number
  /** Hard wall-clock timer for this tool (`tools.*.timing.mode`). */
  timed: boolean
  /** Cap when `timed` — `tools.*.timing.limitMinutes`. */
  limitMinutes: number | null
  /** Locked implied analysis template ids (`tools.*.analysis.templateIds`). */
  analysisTemplateIds: string[]
  /** Per-template soft weights for this phase (`analysis.rollup.templateWeights[phaseId]`). */
  templateWeights?: Record<string, number>
  /** Candidate assist caps (`tools.*.assist`). Missing = None. */
  assist: { chat: boolean; spoilers: boolean; write: boolean }
}

export type InterviewFlowTalkTarget = InterviewFlowTarget & {
  enumValues?: string[]
}

/** Editable discussion phase + bound topic for Creator 2 timeline. */
export type InterviewFlowTalkEditorState = {
  phaseId: string
  topicId: string
  sectionTitle: string
  summaryBlurb: string
  /** Display-only optional chip next to the title. */
  packLabel: string
  /** Same text as summaryBlurb — kept in sync for topic.purpose write-back. */
  purpose: string
  /** Same text as sectionTitle — kept in sync for topic.label write-back. */
  topicLabel: string
  /** Writes topic.targetMinutes + phase.estimatedMinutes. */
  targetMinutes: number
  isOpening: boolean
  isClosing: boolean
  required: boolean
  /** null/undefined = inherit probeDefaults */
  maxFollowUps?: number | null
  maxProbes?: number | null
  minCandidateTurns?: number | null
  behaviourPromptOverride?: string | null
  probes: InterviewFlowProbe[]
  targets: InterviewFlowTalkTarget[]
  /** Attached analysis template ids (explicit list — packs expand into this on load). */
  templateIds: string[]
  /** Per-template soft weights for this Talk (`analysis.rollup.templateWeights[phaseId]`). */
  templateWeights?: Record<string, number>
  onFail: InterviewFlowFormOnFail
  onFailPhaseId?: string | null
  when: Creator2When
  /** Earlier-only RAG bind (up to 3). Empty = None. */
  referencesPhaseId?: string | null
  referencesPhaseIds?: string[]
  notes?: string | null
}

export type InterviewFlowAnalysisShelfState = {
  attachPacks: Record<string, string[]>
  /**
   * Ordered templates defined for this brief (catalog ids + `custom.*`).
   * Sections attach from this list; editing meta updates all attach chips.
   */
  libraryIds: string[]
  /** Card copy + return/shape overrides keyed by template id. */
  templateMeta: Record<string, InterviewFlowTemplateCardMeta>
  analysisDefaults: Record<string, unknown>
  probeDefaults: InterviewFlowProbeDefaults
  /** Full inventory: shelf + locked implied + host-only. */
  roster?: Array<{
    templateId: string
    origin: 'shelf' | 'locked' | 'host'
    assignedSectionIds: string[]
    role: string
    countsInDecision: boolean
    deletable: boolean
  }>
}

/** Editable attempt rollup (Decision package) for Creator 2 timeline. */
export type InterviewFlowWrapWeightRow = {
  key: string
  /** Author-facing label */
  label: string
  /** Numeric soft weight, or sentinel like `gate_only`. */
  value: number | string
  /** Spine phase ids that feed this weight key (multi + overlapping allowed). */
  sectionIds?: string[]
  /** Grade template ids the author put in this folder. */
  templateIds?: string[]
}

/** Grade templates already attached on the live board (Talk + locked tool analysis). */
export type InterviewFlowWrapGradeTemplateOption = {
  id: string
  label: string
}

export type InterviewFlowWrapEditorState = {
  templateId: string
  weights: InterviewFlowWrapWeightRow[]
}

/** Spine section option for Decision weight → section chips. */
export type InterviewFlowWrapSectionOption = {
  id: string
  title: string
  kind?: string
}

export type InterviewFlowStep = {
  id: string
  kind: InterviewFlowStepKind
  title: string
  /** Long / purpose purpose (Details / fallback). */
  purpose: string
  /** Short collapsed blurb — enough to know what is inside without opening Details. */
  summary: string
  /** Compact metadata chips under the summary. */
  tags: readonly InterviewFlowSummaryTag[]
  minutes?: number
  timed?: boolean
  timing?: InterviewFlowTiming
  onlyIf?: string
  branches?: readonly InterviewFlowBranch[]
  packId?: string | null
  packLabel?: string | null
  analysisLines?: readonly InterviewFlowAnalysisLine[]
  probes?: readonly InterviewFlowProbe[]
  targets?: readonly InterviewFlowTarget[]
  depthLines?: readonly string[]
  toolLines?: readonly string[]
  formQuestions?: readonly InterviewFlowFormQuestion[]
  /** Live form document + gate/fail meta for the section editor. */
  formEditor?: InterviewFlowFormEditorState
  /** Live discussion editor (phase + topic). */
  talkEditor?: InterviewFlowTalkEditorState
  /** Live coding workspace + tests for the section editor. */
  codingEditor?: InterviewFlowCodingEditorState
  /** Live writing/doc prompt + rubric for the section editor. */
  docEditor?: InterviewFlowDocEditorState
  /** Live Decision package (attempt rollup) editor. */
  wrapEditor?: InterviewFlowWrapEditorState
  testCases?: readonly InterviewFlowTestCase[]
  languages?: readonly string[]
  /** Candidate starting language when this coding step is taken. */
  defaultLanguage?: string | null
  behaviourOverride?: string | null
  /** Off-spine optional tool (in tools{} but not in phases[]) */
  offSpine?: boolean
  isOpening?: boolean
  isClosing?: boolean
}

export type InterviewFlowTimingBudget = {
  proposedMinutes: number
  estimatedMinutes: number
  sumSections: number
  slackMinutes: number
  fitsProposed: boolean
  fitPolicy?: string
  notes?: string
  sections: readonly {
    phaseId: string
    title: string
    minutes: number
    timed?: boolean
    limitMinutes?: number
  }[]
}

export type InterviewFlowProbeDefaults = {
  maxFollowUps?: number
  targetMinutes?: number
  maxProbes?: number
  minCandidateTurns?: number
}

export type InterviewFlowTimelineBrief = {
  title: string
  roleTitle: string
  status?: string
  proposedMinutes: number
  estimatedMinutes: number
  roleDescription?: string
  candidateDescription?: string
  personaName?: string
  personaVoice?: string
  behaviourPrompt?: string
  category?: string
  maxInterviews?: number
  opensAt?: string
  closesAt?: string
  coverName?: string
  rolePdfName?: string
  systemGoals?: readonly string[]
  guardrails?: readonly string[]
  probeDefaults?: InterviewFlowProbeDefaults
  analysisDefaults?: Record<string, string | null>
  /** Top Analysis section state (not a spine phase). */
  analysisShelf?: InterviewFlowAnalysisShelfState
  timingBudget?: InterviewFlowTimingBudget
  steps: readonly InterviewFlowStep[]
}

/**
 * Rich candidate-safe StageAssistContext for Form / Coding / Doc assist chat.
 * Full stage document + chrome map + marking map + referenceIndex — do not skim.
 */
import type { Creator2BriefDocument } from '../interviewBrief/creator2BriefTypes'
import { toolAssistInterviewerPayload } from '../interviewBrief/toolAssistBundles'
import { buildAssistSectionContract, type SectionContract } from './sectionContract'
import type { AssistDayContinuity } from './buildAssistDayContinuity'
import type { GateToolMount } from './resolveGateToolMount'
import { resolveGateToolMount } from './resolveGateToolMount'
import type { AssistLiveComposition, AssistTimerPack } from './sanitizeLiveComposition'

export type StageAssistChromeRegion = {
  id: string
  label: string
  howToReach?: string
}

export type StageAssistReference = {
  ref: string
  kind: 'question' | 'option' | 'instruction' | 'file' | 'constraint' | 'rubric_dim' | 'section'
  quote: string
}

export type StageAssistContext = {
  briefId: string
  phaseId: string
  kind: 'form' | 'coding' | 'doc'
  title: string
  estimatedMinutes: number | null
  timed: boolean
  limitMinutes: number | null
  persona: { name: string; voice: string; behaviourPrompt: string }
  /** Candidate identity from CV — same note Talk uses; assist must not go CV-blind. */
  candidate: {
    preferredName: string
    displayName: string
    note: string
  } | null
  /**
   * Same-day continuity with Talk — prior section, prior Talk memory, recent day turns.
   * Assist is the same interviewer continuing the interview, not a fresh bot.
   */
  day: {
    continuing: boolean
    previousSectionTitle: string | null
    priorNote: string | null
    /** Standing interviewer notes (preferred name, language, durable prefs). */
    standingNotes: string | null
    dayHistoryTail: Array<{
      role: 'assistant' | 'candidate'
      text: string
      phaseId: string
    }>
  }
  guardrails: string[]
  behaviourPromptOverride: string | null
  chromeMap: { regions: StageAssistChromeRegion[] }
  markingMap: {
    summary: string
    requiredRule?: string
    dimensions?: Array<{
      key: string
      label: string
      lookingFor: string
      weight?: number
      structureIds?: string[]
      structureLabels?: string[]
      bands?: Array<{ id: string; label: string; descriptor: string }>
    }>
    constraints?: string[]
  }
  document: Record<string, unknown>
  referenceIndex: StageAssistReference[]
  /** This stage's assist peel only (opener + turns). */
  historyTail: Array<{ role: 'assistant' | 'candidate'; text: string }>
  /**
   * Live candidate composition (sanitized). What they typed/selected — never answerKey.
   * Help navigate/clarify in chat; Copilot follow-ups propose into the sitting editor when caps.write.
   */
  liveComposition: {
    kind: 'form' | 'coding' | 'doc'
    updatedAt: string
    hasDraft: boolean
    snapshot: Record<string, unknown>
  } | null
  /** Hard timer remaining when stage is timed. */
  timer: {
    timed: boolean
    limitMinutes: number | null
    remainingMs: number | null
    remainingLabel: string | null
    expired: boolean
  } | null
  /**
   * Authored assist bundle from tools[toolRef].assist (same catalog as Creator).
   * Chrome follows caps.chat. Copilot write is FE Apply; spoilers honored when caps.spoilers.
   */
  privileges: {
    bundleId: string
    caps: { chat: boolean; spoilers: boolean; write: boolean }
  }
  /** Candidate-safe section identity for every Assist compose. */
  sectionContract: SectionContract
  /**
   * Candidate-safe referenced-stage slices. User-side only — omit when unbound.
   */
  referencedMemory?: {
    artifacts?: Array<{ phaseId: string; kind: string; digest: string }>
    runs?: Array<{
      phaseId: string
      passed: boolean | null
      passedCount?: number
      total?: number
      failingIds: string[]
    }>
    synths?: Array<{ phaseId: string; boardSummary: string }>
  } | null
}

const FORM_CHROME: StageAssistChromeRegion[] = [
  { id: 'questions', label: 'Question list', howToReach: 'Scroll the form panel in the main stage.' },
  { id: 'progress', label: 'Progress / required markers', howToReach: 'Watch required flags on each question.' },
  { id: 'chat', label: 'Assist chat', howToReach: 'Right peel — ask where something is or what a question asks.' },
]

const CODING_CHROME: StageAssistChromeRegion[] = [
  { id: 'files', label: 'File tree', howToReach: 'Left side of the coding workspace — click a path to open it.' },
  { id: 'editor', label: 'Editor pane', howToReach: 'Center pane — edit the active file here.' },
  { id: 'language', label: 'Language picker', howToReach: 'Workspace chrome — choose an allowed language if shown.' },
  { id: 'tests', label: 'Visible samples / run area', howToReach: 'Use visible sample cases only; hidden tests are not shown.' },
  { id: 'chat', label: 'Assist chat', howToReach: 'Right peel — ask where something is or what the stage is asking.' },
]

const DOC_CHROME: StageAssistChromeRegion[] = [
  { id: 'prompt', label: 'Prompt / brief', howToReach: 'Writing instructions live with the stage; structure bullets list what to cover.' },
  { id: 'canvas', label: 'Document canvas', howToReach: 'Main editor — type your response here.' },
  { id: 'limits', label: 'Word limits', howToReach: 'Respect min/max word constraints when stated.' },
  { id: 'chat', label: 'Assist chat', howToReach: 'Right peel — ask about the prompt, rubric labels, or word limits.' },
]

function pushRef(
  index: StageAssistReference[],
  ref: string,
  kind: StageAssistReference['kind'],
  quote: string,
) {
  const q = quote.replace(/\s+/g, ' ').trim()
  if (!q) return
  index.push({ ref, kind, quote: q.slice(0, 400) })
}

export function buildStageAssistContext(input: {
  briefId: string
  brief: Creator2BriefDocument
  phaseId: string
  timed: boolean
  limitMinutes: number | null
  estimatedMinutes?: number | null
  historyTail?: Array<{ role: 'assistant' | 'candidate'; text: string }>
  mount?: GateToolMount | null
  /** From `resolveCandidateCvNote` — preferred/display + Talk-style note. */
  candidateCv?: {
    hasCv?: boolean
    preferredName?: string
    displayName?: string
    note?: string
  } | null
  /** From `buildAssistDayContinuity` — prior Talk + previous section. */
  dayContinuity?: AssistDayContinuity | null
  /** Sanitized live editor snapshot (form answers / code / essay). */
  liveComposition?: AssistLiveComposition | null
  /** Hard timer remaining pack. */
  timer?: AssistTimerPack | null
  /** Candidate-safe referenced-stage slices (omit when unbound). */
  referencedMemory?: StageAssistContext['referencedMemory']
}): StageAssistContext | null {
  const mount =
    input.mount ??
    resolveGateToolMount({ brief: input.brief, phaseId: input.phaseId })
  if (!mount) return null

  const persona = input.brief.definition?.persona
  const phase = input.brief.phases.find((p) => p.id === input.phaseId)
  const tool =
    phase?.toolRef && input.brief.tools
      ? input.brief.tools[phase.toolRef]
      : undefined
  const privileges = toolAssistInterviewerPayload(tool?.assist)
  const guardrails = [...(input.brief.definition?.guardrails ?? [])]
  guardrails.push(
    privileges.caps.write
      ? 'Do not type answers, keys, or solutions in chat. Copilot proposes into the sitting editor; do not claim you edited until they accept Check.'
      : 'Never give answers, keys, solutions, or write the candidate response for them.',
    'Navigate chrome and restate questions by quoting stage text.',
    'Explain marking expectations as labels only — never reveal correct options or hidden tests.',
    'Use candidate.preferredName / candidate.note for identity when present (retrieved on demand). Never invent a name. If they reject the CV name, ask what to use — do not insist the file is right.',
    'If always-on packs lack a needed fact, broader retrieval runs — do not invent. Only admit missing after search.',
    'You are the same interviewer continuing this interview — use prior-section packs when present; never re-introduce yourself.',
    'ONE ASK: if you ask a question, ask only one — never stack two clarifies.',
    'liveComposition is what the candidate typed — help them navigate and clarify in chat; never complete it in the utterance. Copilot writes on follow-up into the sitting editor, not this peel compose. For coding, prefer snapshot.attachedFiles and snapshot.focusPath as the working set the candidate attached.',
  )

  const cv = input.candidateCv
  const preferred = cv?.preferredName?.trim() || ''
  const display = cv?.displayName?.trim() || ''
  const note = cv?.note?.trim() || ''
  const candidate =
    cv?.hasCv && (preferred || display || note)
      ? {
          preferredName: preferred || display,
          displayName: display || preferred,
          note:
            note ||
            (preferred || display
              ? `Candidate: preferred "${preferred || display}".`
              : ''),
        }
      : null

  const day: StageAssistContext['day'] = input.dayContinuity ?? {
    continuing: false,
    previousSectionTitle: null,
    priorNote: null,
    standingNotes: null,
    dayHistoryTail: [],
  }

  const chromeRegions = (kindRegions: StageAssistChromeRegion[]) =>
    privileges.caps.chat
      ? kindRegions
      : kindRegions.filter((r) => r.id !== 'chat')

  const referenceIndex: StageAssistReference[] = []
  let document: Record<string, unknown>
  let chromeMap = { regions: chromeRegions(FORM_CHROME) }
  let markingMap: StageAssistContext['markingMap'] = { summary: '' }
  let behaviourOverride: string | null = null

  if (mount.kind === 'form') {
    chromeMap = { regions: chromeRegions(FORM_CHROME) }
    const required = (mount.document.questions ?? []).filter((q) => q.required)
    markingMap = {
      summary: 'Form stage — complete required questions. Gate items must pass to continue when authored as a hard gate.',
      requiredRule:
        required.length > 0
          ? `${required.length} required question(s) must be answered.`
          : 'Follow each question prompt; required items are marked in the form.',
      constraints: input.timed
        ? [`Hard timer: ${input.limitMinutes ?? '?'} minutes`]
        : undefined,
    }
    pushRef(referenceIndex, 'form.title', 'instruction', mount.title)
    pushRef(referenceIndex, 'form.instructions', 'instruction', mount.instructions)
    for (const s of mount.document.sections ?? []) {
      pushRef(referenceIndex, `section.${s.id}`, 'section', `${s.title}${s.description ? `: ${s.description}` : ''}`)
    }
    const questions = (mount.document.questions ?? []).map((q) => {
      pushRef(referenceIndex, `q.${q.id}`, 'question', q.prompt)
      const rawOpts =
        'options' in q && Array.isArray((q as { options?: unknown }).options)
          ? ((q as { options: Array<{ id: string; label: string }> }).options ?? [])
          : []
      const options = rawOpts.map((o) => {
        pushRef(referenceIndex, `q.${q.id}.opt.${o.id}`, 'option', o.label)
        return { id: o.id, label: o.label }
      })
      return {
        id: q.id,
        prompt: q.prompt,
        kind: q.kind,
        required: Boolean(q.required),
        sectionId: q.sectionId ?? null,
        options,
      }
    })
    document = {
      title: mount.document.title,
      instructions: mount.instructions,
      sections: (mount.document.sections ?? []).map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description ?? '',
      })),
      questions,
    }
  } else if (mount.kind === 'coding') {
    chromeMap = { regions: chromeRegions(CODING_CHROME) }
    behaviourOverride = privileges.caps.write
      ? 'Clarify constraints in chat. Point to files and instructions by path and quote. Write candidate files only in the sitting editor — never paste the solution in chat.'
      : 'Clarify constraints in chat. Do not ask for or provide the solution. Point to files and instructions by path and quote.'
    markingMap = {
      summary: mount.hasHiddenTests
        ? 'Coding challenge — visible samples may be shown; hidden tests also score the submission.'
        : 'Coding challenge — satisfy the instructions and visible samples.',
      constraints: [
        ...(mount.languages.length ? [`Allowed languages: ${mount.languages.join(', ')}`] : []),
        ...(input.timed ? [`Hard timer: ${input.limitMinutes ?? '?'} minutes`] : []),
        mount.hasHiddenTests
          ? 'Some tests are hidden from you — do not invent their contents.'
          : 'Work from instructions and any visible samples.',
      ],
    }
    pushRef(referenceIndex, 'coding.title', 'instruction', mount.title)
    pushRef(referenceIndex, 'coding.instructions', 'instruction', mount.instructions)
    for (const f of mount.workspace.files ?? []) {
      pushRef(referenceIndex, `file:${f.path}`, 'file', `${f.path}\n${String(f.content ?? '').slice(0, 800)}`)
    }
    for (const c of mount.visibleSampleCases) {
      const desc = c.description?.trim()
      pushRef(
        referenceIndex,
        `sample.${c.id}`,
        'constraint',
        desc
          ? `${c.name}: ${desc}`
          : `${c.name}: args=${JSON.stringify(c.args)} expected=${JSON.stringify(c.expected)}`,
      )
    }
    document = {
      title: mount.title,
      instructions: mount.instructions,
      languages: mount.languages,
      readmeMarkdown: mount.readmeMarkdown,
      files: (mount.workspace.files ?? []).map((f) => ({
        path: f.path,
        language: f.language,
        content: f.content,
      })),
      openIds: mount.workspace.openIds ?? [],
      activeId: mount.workspace.activeId ?? null,
      visibleSampleCases: mount.visibleSampleCases,
      hasHiddenTests: mount.hasHiddenTests,
    }
    const liveSnap = input.liveComposition
    if (liveSnap?.hasDraft && liveSnap.kind === 'coding') {
      const liveFiles = Array.isArray(liveSnap.snapshot.files) ? liveSnap.snapshot.files : null
      if (liveFiles && liveFiles.length) {
        document.files = liveFiles as typeof document.files
        document.openIds = Array.isArray(liveSnap.snapshot.openIds)
          ? (liveSnap.snapshot.openIds as string[])
          : document.openIds
        document.activeId =
          typeof liveSnap.snapshot.activeId === 'string'
            ? liveSnap.snapshot.activeId
            : document.activeId
      }
    }
  } else {
    chromeMap = { regions: chromeRegions(DOC_CHROME) }
    markingMap = {
      summary: 'Writing stage — respond to the brief; rubric dimensions name what reviewers look for.',
      dimensions: mount.assessment.dimensions,
      constraints: [
        ...(mount.minWords != null ? [`Minimum words: ${mount.minWords}`] : []),
        ...(mount.maxWords != null ? [`Maximum words: ${mount.maxWords}`] : []),
        ...(input.timed ? [`Hard timer: ${input.limitMinutes ?? '?'} minutes`] : []),
      ],
    }
    pushRef(referenceIndex, 'doc.title', 'instruction', mount.title)
    pushRef(referenceIndex, 'doc.instructions', 'instruction', mount.instructions)
    pushRef(referenceIndex, 'doc.prompt.brief', 'instruction', mount.prompt.brief)
    for (const s of mount.prompt.structure) {
      pushRef(referenceIndex, `prompt.structure.${s.id}`, 'instruction', `${s.label}${s.hint ? ` — ${s.hint}` : ''}`)
    }
    mount.prompt.requirements.forEach((r, i) => {
      pushRef(referenceIndex, `prompt.req.${i}`, 'constraint', r)
    })
    for (const d of mount.assessment.dimensions) {
      const weightBit = d.weight != null ? ` weight=${d.weight}` : ''
      const coverBit =
        d.structureLabels?.length
          ? ` covers=${d.structureLabels.join('|')}`
          : d.structureIds?.length
            ? ` covers=${d.structureIds.join('|')}`
            : ' covers=holistic'
      const bandBit =
        d.bands?.length
          ? ` bands=${d.bands.map((b) => `${b.label}:${b.descriptor.slice(0, 80)}`).join(' | ')}`
          : ''
      pushRef(
        referenceIndex,
        `rubric.${d.key}`,
        'rubric_dim',
        `${d.label}: ${d.lookingFor}${weightBit}${coverBit}${bandBit}`,
      )
    }
    document = {
      title: mount.title,
      instructions: mount.instructions,
      prompt: mount.prompt,
      assessment: mount.assessment,
      minWords: mount.minWords,
      maxWords: mount.maxWords,
      seedTitle: mount.document.title ?? null,
      seedBody: String(mount.document.markdown ?? '').slice(0, 3500),
    }
    const liveDocSnap = input.liveComposition
    if (liveDocSnap?.hasDraft && liveDocSnap.kind === 'doc') {
      document.liveBody = String(liveDocSnap.snapshot.body ?? '').slice(0, 3500)
      document.liveWordCount = liveDocSnap.snapshot.wordCount ?? null
      document.liveTitle = liveDocSnap.snapshot.title ?? null
    }
  }

  return {
    briefId: input.briefId,
    phaseId: input.phaseId,
    kind: mount.kind,
    title: mount.title,
    estimatedMinutes: input.estimatedMinutes ?? input.limitMinutes,
    timed: input.timed,
    limitMinutes: input.limitMinutes,
    persona: {
      name: persona?.name?.trim() || 'Interviewer',
      voice: persona?.voice?.trim() || 'clear helpful',
      behaviourPrompt:
        persona?.behaviourPrompt?.trim() ||
        'Help the candidate navigate this stage. Quote stage text. Follow Assist privileges for answers and Apply.',
    },
    candidate,
    day,
    guardrails,
    behaviourPromptOverride: behaviourOverride,
    chromeMap,
    markingMap,
    document,
    referenceIndex,
    historyTail: (input.historyTail ?? []).slice(-12),
    liveComposition: input.liveComposition
      ? {
          kind: input.liveComposition.kind,
          updatedAt: input.liveComposition.updatedAt,
          hasDraft: input.liveComposition.hasDraft,
          snapshot: input.liveComposition.snapshot,
        }
      : null,
    timer: input.timer ?? {
      timed: input.timed,
      limitMinutes: input.limitMinutes,
      remainingMs: null,
      remainingLabel: null,
      expired: false,
    },
    privileges,
    sectionContract: buildAssistSectionContract({
      phaseId: input.phaseId,
      title: mount.title,
      kind: mount.kind,
      purpose: mount.instructions,
      bundleId: privileges.bundleId,
      caps: privileges.caps,
    }),
    ...(input.referencedMemory ? { referencedMemory: input.referencedMemory } : {}),
  }
}

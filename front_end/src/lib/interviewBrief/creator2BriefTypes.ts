/**
 * Plan-shaped interview_brief for Creator 2 (superset of live FE types).
 * Matches `planned/interviewer-engine.md` canonical JSON.
 */

export type Creator2Attach = {
  attachPack?: string | null
  templateIds?: string[]
}

export type Creator2Probe = {
  id: string
  goal: string
  required?: boolean
  order?: number
  hint?: string | null
}

export type Creator2Target = {
  key: string
  label: string
  required?: boolean
  datatype?: string
  description?: string
  enumValues?: string[]
}

export type Creator2Topic = {
  id: string
  label: string
  purpose?: string
  maxFollowUps?: number
  targetMinutes?: number
  maxProbes?: number
  minCandidateTurns?: number
  behaviourPromptOverride?: string | null
  probes: Creator2Probe[]
  targets?: Creator2Target[]
  analysis?: Creator2Attach
}

export type Creator2Condition = {
  toolPassed?: string
  targetEquals?: { topicId: string; key: string; value: string }
  phaseCompleted?: string
}

export type Creator2When = {
  all?: Creator2Condition[]
  any?: Creator2Condition[]
} | null

export type Creator2OnFail = 'skip' | 'endAttempt' | { goToPhaseId: string } | null

/** Optional RAG bind to earlier spine phases (taking/assessment). Omit/null = unbound. */
export type Creator2References = { phaseIds: string[] } | null

export type Creator2SummaryTag = {
  label: string
  /** kind · count · time · pack · gate · meta · accent */
  tone?: string
}

/** Optional collapsed teaser — UI derives defaults when omitted. */
export type Creator2Summary = {
  blurb?: string
  /** Override the analysis pack chip (e.g. “Form answer key (gate)”). */
  packLabel?: string
  tags?: Creator2SummaryTag[]
}

export type Creator2Phase = {
  id: string
  kind: 'discussion' | 'tool'
  topicId?: string
  toolRef?: string
  title?: string
  required?: boolean
  estimatedMinutes?: number
  isOpening?: boolean
  isClosing?: boolean
  when?: Creator2When
  onFail?: Creator2OnFail
  /** Earlier-only history bind for taking/assessment RAG. Omit = memory of earlier sections. */
  references?: Creator2References
  notes?: string | null
  /** Collapsed timeline teaser override */
  summary?: Creator2Summary
}

export type Creator2Tool = {
  type: string
  title: string
  instructions?: string
  editorKind?: string
  timing?: {
    mode?: 'timed' | 'untimed'
    estimatedMinutes?: number
    limitMinutes?: number | null
  }
  /**
   * Candidate assist on this tool (Form / Coding / Writing). Omit / all false = None.
   * `write` or `spoilers` implies `chat`.
   */
  assist?: {
    chat?: boolean
    spoilers?: boolean
    write?: boolean
  }
  /** Allowed runner languages (catalog ids). Empty / omit = unrestricted. */
  languages?: string[]
  /** Candidate starting language — must be in `languages` when restricted. */
  defaultLanguage?: string | null
  analysis?: Creator2Attach
  passThreshold?: unknown
  artifact?: unknown
  /** Coding — deterministic runner payload (external API, not LLM). */
  tests?: {
    runner?: string
    entryPoint?: string
    cases?: Array<{
      id?: string
      name?: string
      description?: string
      args?: unknown[]
      /** @deprecated prefer args — kwargs still read on load */
      input?: unknown
      expected?: unknown
      compare?: 'deep_equal' | 'exact' | 'unordered'
      hidden?: boolean
      timeoutMs?: number | null
    }>
    referenceSolution?: unknown
  }
  /** Writing — prompt brief / structure / requirements. */
  prompt?: {
    brief?: string
    structure?: Array<{
      id?: string
      label?: string
      hint?: string
      minParagraphs?: number
    }>
    requirements?: string[]
  }
  /** Writing — rubric/format assessment on the tool (not mark.* library cards). */
  assessment?: {
    kind?: 'rubric' | 'format'
    dimensions?: Array<{
      key?: string
      label?: string
      /** Criterion gloss — what raters look for. */
      criterion?: string
      /** Soft share within this essay (0–1). Not board Decision essay weight. */
      weight?: number
      /** prompt.structure ids this criterion covers; empty/omit = holistic. */
      structureIds?: string[]
      /** Analytic bands with descriptors (preferred). */
      bands?: Array<{
        id?: string
        label?: string
        descriptor?: string
      }>
      /** Legacy scale labels — migrated to bands on read. */
      options?: string[]
    }>
    formatNotes?: string
  }
  minWords?: number
  maxWords?: number
  /** Collapsed timeline teaser override */
  summary?: Creator2Summary
}

export type Creator2BriefDocument = {
  schemaVersion: number
  kind: 'interview_brief'
  definition: {
    meta: {
      title: string
      roleTitle: string
      status?: string
      roleDescription?: string | null
      /** Interviewee-facing intro (not agency creation notes). */
      candidateDescription?: string | null
      proposedMinutes?: number
      estimatedMinutes?: number
      timing?: { slackMinutes?: number; fitPolicy?: string; notes?: string }
      category?: string | null
      coverName?: string | null
      rolePdfName?: string | null
      rolePdfNodeId?: string | null
      maxInterviews?: number
      opensAt?: string | null
      closesAt?: string | null
    }
    persona: {
      name: string
      voice: string
      behaviourPrompt?: string
      /** Prefer omit — opening is an isOpening phase. */
      openingScript?: string | null
      /** Prefer omit — closing is an isClosing phase. */
      closingScript?: string | null
    }
    systemGoals?: string[]
    guardrails?: string[]
    probeDefaults?: Record<string, unknown>
    analysisDefaults?: Record<string, unknown>
  }
  topicLibrary: Creator2Topic[]
  phases: Creator2Phase[]
  tools: Record<string, Creator2Tool>
  analysis: {
    schedule?: Array<Record<string, unknown>> | Record<string, Record<string, unknown>>
    rollup?: {
      templateId?: string
      /**
       * Tier 3 — decision bucket share of the overall grade.
       * See the weighting ladder in `scoreAttempt.ts`.
       */
      weights?: Record<string, number | string>
      /** phase ids contributing to each weight key — multi + overlapping allowed */
      weightSections?: Record<string, string[]>
      /**
       * Author assignment — folder id → grade template ids in that folder.
       * Wins over catalog `decisionBucket` in the blender.
       */
      weightTemplates?: Record<string, string[]>
      /** Author-typed folder names. Rename updates this; the slug id stays. */
      weightLabels?: Record<string, string>
      /**
       * Tier 2 — `phaseId` → share of its decision bucket. Absent = every section in
       * the bucket counts equally. `0` = recorded but does not count.
       */
      sectionWeights?: Record<string, number | string>
      /**
       * Tier 1 — `phaseId` → `templateId` → share of that section's score. Absent falls
       * back to the template card's `sourceWeight`, then the catalog. `0` = recorded but
       * does not count, which is how a template is taken off the grade without losing
       * its result in the report.
       */
      templateWeights?: Record<string, Record<string, number | string>>
    }
    attachPacks?: Record<string, string[]>
    overrides?: Record<string, unknown>
  }
  timingSummary?: {
    proposedMinutes?: number
    estimatedMinutes?: number
    sumSections?: number
    slackMinutes?: number
    fitsProposed?: boolean
    sections?: Array<Record<string, unknown>>
  }
}

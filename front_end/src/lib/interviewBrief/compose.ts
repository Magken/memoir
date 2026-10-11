import type { FlowDocument } from '../flowEditor/types'
import type { Creator2BriefDocument } from './creator2BriefTypes'
import { createInterviewBriefDraft } from './draft'
import { estimateInterviewMinutes } from './duration'
import {
  type InterviewManagerListItem,
} from './managerFixtures'
import { findInterviewPersonaTemplate, matchInterviewPersonaTemplateId } from './personaTemplates'
import { normalizeInterviewRoleCategoryValue } from './roleCategories'
import { createStarterInterviewBrief } from './starters'
import { INTERVIEW_KIND, type InterviewBriefDraft } from './types'

export type InterviewComposeMeta = {
  title: string
  roleTitle: string
  /** Free-text category (Engineering, Design, custom teams, …). */
  category: string
  /** Agency creation notes → meta.roleDescription. */
  description: string
  /**
   * Optional interviewee-facing intro → meta.candidateDescription.
   * Blank on Generate → blank-slate invents; never merged into description.
   */
  candidateDescription: string
  /**
   * Live interviewer fields → definition.persona (bot or user).
   * Template id is FE-only highlight for presets — not stored on the brief body.
   */
  personaName: string
  personaVoice: string
  personaBehaviour: string
  /** FE-only persona preset id when fields match a catalog entry; else empty. */
  personaTemplateId: string
  /** Filename only — File lives on the session (`rolePdfFile`). */
  rolePdfName: string
  /** Filename only — File lives on the session (`coverFile`). */
  coverName: string
  /** Max completed interviews before auto-close (compose-only until backend). */
  maxInterviews: string
  opensAt: string
  closesAt: string
  /**
   * Optional agency target duration. Auto `estimatedMinutes` comes from the spine.
   */
  proposedMinutes: string
}

export type InterviewComposeSession = {
  mode: 'create' | 'edit'
  listItemId: string
  meta: InterviewComposeMeta
  /** Optional role-description PDF (in-memory; also used for DataUpload preview). */
  rolePdfFile: File | null
  /** True when `rolePdfFile` is a new pick that still needs Drive upload. */
  rolePdfDirty?: boolean
  /** Persisted org Drive node for the role PDF. */
  rolePdfNodeId?: string
  /** Signed download URL for hydrating preview File after save/edit. */
  rolePdfUrl?: string | null
  /** Optional list-row cover / thumbnail image. */
  coverFile: File | null
  coverDirty?: boolean
  coverNodeId?: string
  /** Object URL or signed download URL for list + compose preview. */
  coverUrl?: string | null
  flow: FlowDocument | null
  flowDirty: boolean
  generatedAt?: string
  /** Baseline fingerprint of meta when flow was last seeded. */
  seededMetaKey?: string
  /** Server draft brief id once create-bot / Drive path is opened. */
  serverBriefId?: string
  /** Org account id used for briefCreate / createBotOpen. */
  serverAccountId?: string
  /** Active interview_create conversation id. */
  createBotConversationId?: string
}

export function emptyComposeMeta(): InterviewComposeMeta {
  return {
    title: '',
    roleTitle: '',
    category: '',
    description: '',
    candidateDescription: '',
    personaName: '',
    personaVoice: '',
    personaBehaviour: '',
    personaTemplateId: '',
    rolePdfName: '',
    coverName: '',
    maxInterviews: '50',
    opensAt: '',
    closesAt: '',
    proposedMinutes: '',
  }
}

export function composeMetaFromListItem(item: InterviewManagerListItem): InterviewComposeMeta {
  return {
    title: item.title,
    roleTitle: item.roleTitle,
    category: normalizeInterviewRoleCategoryValue(item.category),
    description: '',
    candidateDescription: '',
    personaName: '',
    personaVoice: '',
    personaBehaviour: '',
    personaTemplateId: '',
    rolePdfName: '',
    coverName: '',
    maxInterviews: '50',
    opensAt: item.opensAt ? item.opensAt.slice(0, 10) : '',
    closesAt: item.closesAt ? item.closesAt.slice(0, 10) : '',
    proposedMinutes:
      item.proposedMinutes != null && item.proposedMinutes > 0
        ? String(item.proposedMinutes)
        : '',
  }
}

export function composeMetaKey(meta: InterviewComposeMeta): string {
  return [
    meta.title,
    meta.roleTitle,
    meta.category,
    meta.description,
    meta.candidateDescription,
    meta.personaName,
    meta.personaVoice,
    meta.personaBehaviour,
    meta.personaTemplateId,
    meta.rolePdfName,
    meta.coverName,
    meta.maxInterviews,
    meta.opensAt,
    meta.closesAt,
    meta.proposedMinutes,
  ].join('|')
}

/** Resolve persona fields for a new empty shell (template fills gaps). */
export function composePersonaForShell(meta: InterviewComposeMeta): {
  name: string
  voice: string
  behaviourPrompt: string
} {
  const fromTemplate = findInterviewPersonaTemplate(meta.personaTemplateId)
  return {
    name: meta.personaName.trim() || fromTemplate?.name || 'Alex',
    voice: meta.personaVoice.trim() || fromTemplate?.voice || '',
    behaviourPrompt:
      meta.personaBehaviour.trim() ||
      fromTemplate?.behaviourPrompt ||
      'Be a fair, curious interviewer. Stay on the section goals.',
  }
}

/** Sync compose meta persona fields from a Creator-2 body (after bot edit / load). */
export function composeMetaPersonaFromDefinition(persona: {
  name?: string | null
  voice?: string | null
  behaviourPrompt?: string | null
}): Pick<
  InterviewComposeMeta,
  'personaName' | 'personaVoice' | 'personaBehaviour' | 'personaTemplateId'
> {
  const personaName = (persona.name ?? '').trim()
  const personaVoice = (persona.voice ?? '').trim()
  const personaBehaviour = (persona.behaviourPrompt ?? '').trim()
  return {
    personaName,
    personaVoice,
    personaBehaviour,
    personaTemplateId:
      matchInterviewPersonaTemplateId({
        name: personaName,
        voice: personaVoice,
        behaviourPrompt: personaBehaviour,
      }) ?? '',
  }
}

export function parseComposeDateToIso(raw: string, endOfDay = false): string | undefined {
  const trimmed = raw.trim()
  if (!trimmed) return undefined
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return endOfDay ? `${trimmed}T23:59:00.000Z` : `${trimmed}T00:00:00.000Z`
  }
  const time = Date.parse(trimmed)
  if (Number.isNaN(time)) return undefined
  return new Date(time).toISOString()
}

export function applyComposeMetaToFlow(flow: FlowDocument, meta: InterviewComposeMeta, opts: {
  rolePdfNodeId?: string | null
} = {}): FlowDocument {
  const proposedRaw = Number.parseInt(meta.proposedMinutes, 10)
  const proposedMinutes =
    Number.isFinite(proposedRaw) && proposedRaw > 0 ? proposedRaw : undefined
  const title = meta.title.trim() || 'Untitled interview'
  const roleDescription = meta.description.trim()
  const estimatedMinutes = estimateInterviewMinutes(flow)
  const rolePdfNodeId =
    typeof opts.rolePdfNodeId === 'string' && opts.rolePdfNodeId.trim()
      ? opts.rolePdfNodeId.trim()
      : undefined

  return {
    ...flow,
    nodes: flow.nodes.map((node) => {
      if (node.kind !== INTERVIEW_KIND.meta) return node
      return {
        ...node,
        label: title,
        config: {
          ...node.config,
          title,
          roleTitle: meta.roleTitle.trim(),
          status: 'draft',
          estimatedMinutes,
          proposedMinutes,
          roleDescription,
          rolePdfName: meta.rolePdfName.trim(),
          rolePdfNodeId,
          personaVoice:
            typeof node.config?.personaVoice === 'string' ? node.config.personaVoice : '',
        },
      }
    }),
  }
}

export function isPlaceholderInterviewTitle(value: string): boolean {
  const t = value.trim()
  return !t || /^untitled(\s+interview)?$/i.test(t)
}

export function isPlaceholderRoleTitle(value: string): boolean {
  const t = value.trim()
  return !t || /^role$/i.test(t)
}

export type ApplyComposeMetaPrefer = 'compose' | 'document'

function pickIdentityText(
  compose: string,
  generated: string,
  prefer: ApplyComposeMetaPrefer,
  isPlaceholder: (value: string) => boolean,
  fallback: string,
): string {
  const c = compose.trim()
  const g = generated.trim()
  if (prefer === 'document') {
    if (!isPlaceholder(g)) return g
    return c || g || fallback
  }
  if (c) return c
  return g || fallback
}

/**
 * Stamp compose title / role / description onto a Creator-2 plan brief
 * (same inheritance as {@link applyComposeMetaToFlow} for the Flow path).
 *
 * `prefer: 'compose'` (default) — compose panel save / Open Editor: form fields win when set.
 * `prefer: 'document'` — Generate / peel / builder save: keep non-placeholder body identity.
 */
export function applyComposeMetaToCreator2(
  doc: Creator2BriefDocument,
  meta: InterviewComposeMeta,
  opts?: { prefer?: ApplyComposeMetaPrefer },
): Creator2BriefDocument {
  const prefer = opts?.prefer ?? 'compose'
  const composeProposed = Number.parseInt(meta.proposedMinutes, 10)
  const composeMinutes =
    Number.isFinite(composeProposed) && composeProposed > 0 ? composeProposed : undefined
  const docMinutes = doc.definition.meta.proposedMinutes
  const proposedMinutes =
    prefer === 'document'
      ? docMinutes && Number(docMinutes) > 0
        ? docMinutes
        : composeMinutes ?? docMinutes
      : composeMinutes ?? docMinutes
  const title = pickIdentityText(
    meta.title,
    String(doc.definition.meta.title ?? ''),
    prefer,
    isPlaceholderInterviewTitle,
    'Untitled interview',
  )
  const roleTitle = pickIdentityText(
    meta.roleTitle,
    String(doc.definition.meta.roleTitle ?? ''),
    prefer,
    isPlaceholderRoleTitle,
    'Role',
  )
  const roleDescription = pickIdentityText(
    meta.description,
    String(doc.definition.meta.roleDescription ?? ''),
    prefer,
    (v) => !v.trim(),
    '',
  )
  const candidateDescription = pickIdentityText(
    meta.candidateDescription,
    String(doc.definition.meta.candidateDescription ?? ''),
    prefer,
    (v) => !v.trim(),
    '',
  )
  const composeName = meta.personaName.trim()
  const composeVoice = meta.personaVoice.trim()
  const composeBehaviour = meta.personaBehaviour.trim()
  const docName = String(doc.definition.persona?.name ?? '').trim()
  const docVoice = String(doc.definition.persona?.voice ?? '').trim()
  const docBehaviour = String(doc.definition.persona?.behaviourPrompt ?? '').trim()
  const persona = {
    ...doc.definition.persona,
    name:
      prefer === 'document'
        ? docName || composeName || doc.definition.persona?.name
        : composeName || doc.definition.persona?.name,
    voice:
      prefer === 'document'
        ? docVoice || composeVoice || doc.definition.persona?.voice
        : composeVoice || doc.definition.persona?.voice,
    behaviourPrompt:
      prefer === 'document'
        ? docBehaviour || composeBehaviour || doc.definition.persona?.behaviourPrompt
        : composeBehaviour || doc.definition.persona?.behaviourPrompt,
  }
  const composeCategory = meta.category.trim()
  const docCategory = String(doc.definition.meta.category ?? '').trim()
  const category =
    prefer === 'document' ? docCategory || composeCategory : composeCategory || docCategory
  const composeCover = meta.coverName.trim()
  const docCover = String(doc.definition.meta.coverName ?? '').trim()
  const coverName =
    prefer === 'document' ? docCover || composeCover : composeCover || docCover
  const composePdf = meta.rolePdfName.trim()
  const docPdf = String(doc.definition.meta.rolePdfName ?? '').trim()
  const rolePdfName =
    prefer === 'document' ? docPdf || composePdf : composePdf || docPdf
  const composeMax = Number.parseInt(meta.maxInterviews, 10)
  const composeMaxOk = Number.isFinite(composeMax) && composeMax > 0 ? composeMax : undefined
  const docMax = doc.definition.meta.maxInterviews
  const maxInterviews =
    prefer === 'document'
      ? docMax && Number(docMax) > 0
        ? docMax
        : composeMaxOk ?? docMax
      : composeMaxOk ?? docMax
  const composeOpens = meta.opensAt.trim()
  const docOpens = String(doc.definition.meta.opensAt ?? '').trim()
  const opensAt =
    prefer === 'document' ? docOpens || composeOpens : composeOpens || docOpens
  const composeCloses = meta.closesAt.trim()
  const docCloses = String(doc.definition.meta.closesAt ?? '').trim()
  const closesAt =
    prefer === 'document' ? docCloses || composeCloses : composeCloses || docCloses

  return {
    ...doc,
    definition: {
      ...doc.definition,
      meta: {
        ...doc.definition.meta,
        title,
        roleTitle,
        roleDescription,
        candidateDescription,
        status: doc.definition.meta.status ?? 'draft',
        proposedMinutes,
        category: category || undefined,
        coverName: coverName || undefined,
        rolePdfName: rolePdfName || undefined,
        maxInterviews,
        opensAt: opensAt || undefined,
        closesAt: closesAt || undefined,
      },
      persona,
    },
  }
}

/** Copy generated identity onto compose fields so later compose-wins saves do not revert the bot. */
export function composeMetaFromCreator2(
  meta: InterviewComposeMeta,
  doc: Creator2BriefDocument,
): InterviewComposeMeta {
  const proposed = doc.definition.meta.proposedMinutes
  const maxInterviews = doc.definition.meta.maxInterviews
  const opensAt = String(doc.definition.meta.opensAt ?? '').trim()
  const closesAt = String(doc.definition.meta.closesAt ?? '').trim()
  return {
    ...meta,
    title: String(doc.definition.meta.title ?? '').trim() || meta.title,
    roleTitle: String(doc.definition.meta.roleTitle ?? '').trim() || meta.roleTitle,
    description: meta.description,
    candidateDescription:
      String(doc.definition.meta.candidateDescription ?? '').trim() || meta.candidateDescription,
    category:
      normalizeInterviewRoleCategoryValue(
        String(doc.definition.meta.category ?? '').trim(),
      ) || meta.category,
    coverName: String(doc.definition.meta.coverName ?? '').trim() || meta.coverName,
    rolePdfName: String(doc.definition.meta.rolePdfName ?? '').trim() || meta.rolePdfName,
    proposedMinutes:
      proposed != null && Number(proposed) > 0 ? String(proposed) : meta.proposedMinutes,
    maxInterviews:
      maxInterviews != null && Number(maxInterviews) > 0
        ? String(maxInterviews)
        : meta.maxInterviews,
    opensAt: opensAt ? opensAt.slice(0, 10) : meta.opensAt,
    closesAt: closesAt ? closesAt.slice(0, 10) : meta.closesAt,
    ...composeMetaPersonaFromDefinition(doc.definition.persona),
  }
}

/**
 * Persistable Creator-2 Drive body — tagged so reload never confuses it with
 * legacy flow→brief mapping (`analysis.bindings` only).
 */
export function creator2BodyForPersist(doc: Creator2BriefDocument): Record<string, unknown> {
  const clone = structuredClone(doc) as unknown as Record<string, unknown>
  clone.kind = 'interview_brief'
  clone.editor = 'creator2'
  return clone
}

/** How many analysis templateIds are stored on Talk topics + tools. */
export function countCreator2HostTemplateIds(
  doc: Creator2BriefDocument | null | undefined,
): number {
  if (!doc) return 0
  let n = 0
  for (const topic of doc.topicLibrary ?? []) {
    const ids = topic.analysis?.templateIds
    if (Array.isArray(ids)) n += ids.filter(Boolean).length
  }
  for (const tool of Object.values(doc.tools ?? {})) {
    const ids = tool.analysis?.templateIds
    if (Array.isArray(ids)) n += ids.filter(Boolean).length
  }
  return n
}

/** Keep the body that actually has host attaches (Generate result vs a thinner Drive copy). */
export function preferRicherCreator2Doc(
  a: Creator2BriefDocument | null | undefined,
  b: Creator2BriefDocument | null | undefined,
): Creator2BriefDocument | null {
  if (!a) return b ?? null
  if (!b) return a
  return countCreator2HostTemplateIds(a) >= countCreator2HostTemplateIds(b) ? a : b
}

/** Coerce `briefGet` body (object or JSON string) into a record. */
export function coerceStoredBriefBody(raw: unknown): Record<string, unknown> | null {
  if (!raw) return null
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null
    } catch {
      return null
    }
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, unknown>
  return null
}

/**
 * Restore Creator-2 plan JSON from a stored brief body.
 * Returns null for flow snapshots / legacy mapped bodies (not editable as Creator 2).
 */
export function creator2FromStoredBriefBody(
  body: Record<string, unknown> | null | undefined,
): Creator2BriefDocument | null {
  if (!body || typeof body !== 'object') return null
  const kind = typeof body.kind === 'string' ? body.kind : ''
  if (kind === 'interview_brief_flow') return null
  if (kind && kind !== 'interview_brief') return null

  const definition = body.definition
  if (!definition || typeof definition !== 'object' || Array.isArray(definition)) return null
  if (!Array.isArray(body.phases) || !body.tools || typeof body.tools !== 'object') return null

  // Explicit tag from {@link creator2BodyForPersist}
  if (body.editor === 'creator2') {
    try {
      const { editor: _editor, ...rest } = body
      return structuredClone(rest) as unknown as Creator2BriefDocument
    } catch {
      return null
    }
  }

  const analysis = body.analysis
  const analysisObj =
    analysis && typeof analysis === 'object' && !Array.isArray(analysis)
      ? (analysis as Record<string, unknown>)
      : null
  // Legacy flow→brief mapping uses `analysis.bindings` only.
  const looksLegacy =
    analysisObj != null &&
    Array.isArray(analysisObj.bindings) &&
    analysisObj.rollup == null &&
    analysisObj.attachPacks == null &&
    analysisObj.schedule == null &&
    body.timingSummary == null

  if (looksLegacy) {
    const tools = body.tools as Record<string, unknown>
    const toolVals = Object.values(tools)
    const anyTypedTool = toolVals.some(
      (t) => t && typeof t === 'object' && typeof (t as { kind?: unknown }).kind === 'string',
    )
    if (!anyTypedTool) return null
  }

  try {
    return structuredClone(body) as unknown as Creator2BriefDocument
  } catch {
    return null
  }
}

/** Persistable empty Creator-2 shell (no phases) until Edge generation finishes. */
export function emptyCreator2BriefDocument(meta: InterviewComposeMeta): Creator2BriefDocument {
  const proposedRaw = Number.parseInt(meta.proposedMinutes, 10)
  const proposedMinutes =
    Number.isFinite(proposedRaw) && proposedRaw > 0 ? proposedRaw : 60
  const title = meta.title.trim() || 'Untitled interview'
  const roleTitle = meta.roleTitle.trim() || 'Role'
  const persona = composePersonaForShell(meta)
  return {
    schemaVersion: 1,
    kind: 'interview_brief',
    definition: {
      meta: {
        title,
        roleTitle,
        status: 'draft',
        roleDescription: meta.description.trim(),
        candidateDescription: meta.candidateDescription.trim(),
        proposedMinutes,
        estimatedMinutes: 0,
        timing: { slackMinutes: 5, fitPolicy: 'fit_proposed' },
        category: meta.category.trim() || undefined,
        coverName: meta.coverName.trim() || undefined,
        rolePdfName: meta.rolePdfName.trim() || undefined,
        maxInterviews: (() => {
          const n = Number.parseInt(meta.maxInterviews, 10)
          return Number.isFinite(n) && n > 0 ? n : undefined
        })(),
        opensAt: meta.opensAt.trim() || undefined,
        closesAt: meta.closesAt.trim() || undefined,
      },
      persona,
      systemGoals: [],
      guardrails: [],
      probeDefaults: { maxFollowUps: 2 },
    },
    topicLibrary: [],
    phases: [],
    tools: {},
    analysis: {
      rollup: { templateId: 'rollup.attempt.v1', weights: {} },
    },
    timingSummary: { estimatedMinutes: 0 },
  }
}

/** True when a Creator-2 body has at least one spine section (generation finished). */
export function creator2PlanIsReady(doc: Creator2BriefDocument | null | undefined): boolean {
  return Boolean(doc && Array.isArray(doc.phases) && doc.phases.length > 0)
}

/**
 * Flow starter for Theme / create-bot only — not compose blank-slate Generate
 * (that uses empty Creator-2 shell + headless interview-brief-edit).
 */
export function generateInterviewBriefFromMeta(meta: InterviewComposeMeta): FlowDocument {
  return applyComposeMetaToFlow(createStarterInterviewBrief(), meta)
}

export function draftFromComposeSession(session: InterviewComposeSession): InterviewBriefDraft | null {
  if (!session.flow) return null
  const title = session.meta.title.trim() || 'Untitled interview'
  return createInterviewBriefDraft(title, applyComposeMetaToFlow(session.flow, session.meta))
}

export function listItemFromComposeSession(
  session: InterviewComposeSession,
  existing?: InterviewManagerListItem,
): InterviewManagerListItem {
  const proposedRaw = Number.parseInt(session.meta.proposedMinutes, 10)
  const proposedMinutes =
    Number.isFinite(proposedRaw) && proposedRaw > 0
      ? proposedRaw
      : existing?.proposedMinutes
  const opensAt = parseComposeDateToIso(session.meta.opensAt, false)
  const closesAt = parseComposeDateToIso(session.meta.closesAt, true)
  const title = session.meta.title.trim() || 'Untitled interview'
  const roleTitle = session.meta.roleTitle.trim() || 'Role'
  const phaseCount = session.flow
    ? session.flow.nodes.filter(
        (n) => n.kind === INTERVIEW_KIND.discussion || n.kind === INTERVIEW_KIND.tool,
      ).length
    : existing?.phaseCount ?? 0
  const toolPhaseCount = session.flow
    ? session.flow.nodes.filter((n) => n.kind === INTERVIEW_KIND.tool).length
    : existing?.toolPhaseCount ?? 0
  const estimatedMinutes = session.flow
    ? estimateInterviewMinutes(session.flow)
    : existing?.estimatedMinutes ?? 45

  return {
    id: session.serverBriefId ?? session.listItemId,
    title,
    roleTitle,
    status: existing?.status === 'published' ? 'published' : existing?.status ?? 'draft',
    phaseCount,
    toolPhaseCount,
    estimatedMinutes,
    proposedMinutes,
    applicantsTaken: existing?.applicantsTaken ?? 0,
    applicantsInProgress: existing?.applicantsInProgress ?? 0,
    invitesPending: existing?.invitesPending ?? 0,
    updatedAt: new Date().toISOString(),
    opensAt,
    closesAt,
    category: session.meta.category.trim()
      ? normalizeInterviewRoleCategoryValue(session.meta.category)
      : 'other',
    imageUrl:
      session.coverUrl != null && session.coverUrl.trim()
        ? session.coverUrl.trim()
        : session.coverDirty
          ? undefined
          : existing?.imageUrl,
    coverNodeId: session.coverNodeId?.trim() || existing?.coverNodeId,
    checkWarningShorts: existing?.checkWarningShorts,
    description: session.meta.description.trim() || existing?.description,
  }
}

export function newComposeListId(): string {
  return `draft-${crypto.randomUUID().slice(0, 8)}`
}

/**
 * Persist / builder Save gate. Creator-2 sessions keep `flow: null`;
 * a live `creator2` plan is enough to write.
 */
export function composeSessionHasSaveablePlan(
  session: InterviewComposeSession | null | undefined,
  creator2: Creator2BriefDocument | null | undefined,
): session is InterviewComposeSession {
  return Boolean(session && (creator2 || session.flow))
}

export function createComposeSession(
  mode: 'create' | 'edit',
  item?: InterviewManagerListItem,
  opts: { flow?: FlowDocument | null; serverAccountId?: string | null } = {},
): InterviewComposeSession {
  if (mode === 'edit' && item) {
    const meta = composeMetaFromListItem(item)
    // Do not invent a Flow starter for Creator-2 briefs — flow is optional chrome only.
    const flow = opts.flow ?? null
    return {
      mode: 'edit',
      listItemId: item.id,
      meta,
      rolePdfFile: null,
      rolePdfDirty: false,
      rolePdfNodeId: undefined,
      rolePdfUrl: null,
      coverFile: null,
      coverDirty: false,
      coverNodeId: item.coverNodeId,
      coverUrl: item.imageUrl ?? null,
      flow,
      flowDirty: false,
      generatedAt: new Date().toISOString(),
      seededMetaKey: composeMetaKey(meta),
      serverBriefId: item.id,
      serverAccountId: opts.serverAccountId ?? undefined,
    }
  }
  return {
    mode: 'create',
    listItemId: newComposeListId(),
    meta: emptyComposeMeta(),
    rolePdfFile: null,
    rolePdfDirty: false,
    rolePdfNodeId: undefined,
    rolePdfUrl: null,
    coverFile: null,
    coverDirty: false,
    coverNodeId: undefined,
    coverUrl: null,
    flow: null,
    flowDirty: false,
  }
}

/** Interview-brief FlowEditor toolkit — local draft shapes + publishable brief body. */

export const INTERVIEW_BRIEF_SCHEMA_VERSION = 1

export const INTERVIEW_KIND = {
  meta: 'interview.meta',
  topic: 'interview.topic',
  discussion: 'interview.phase.discussion',
  tool: 'interview.phase.tool',
} as const

export type InterviewProbeConfig = {
  id: string
  goal: string
  templateIds: string[]
}

export type InterviewMetaConfig = {
  title: string
  roleTitle: string
  status: 'draft'
  /** Auto duration from spine phases (authoritative for scheduling UI). */
  estimatedMinutes?: number
  /** Optional agency target entered at compose — not the auto estimate. */
  proposedMinutes?: number
  personaName?: string
  personaVoice?: string
  /** Pasted role / interview requirements from compose. */
  roleDescription?: string
  /** Optional uploaded role-description PDF filename. */
  rolePdfName?: string
  /** Org Drive node id for the role PDF (linked on the brief). */
  rolePdfNodeId?: string
  systemGoals?: string[]
  guardrails?: string[]
}

export type InterviewTopicConfig = {
  label: string
  probes: InterviewProbeConfig[]
}

export type InterviewDiscussionConfig = {
  phaseId: string
  topicNodeId?: string
  isOpening?: boolean
  isClosing?: boolean
  notes?: string
}

export type InterviewToolType = 'coding' | 'doc' | 'form_quiz'

export type InterviewToolConfig = {
  phaseId: string
  toolRef: string
  toolType?: InterviewToolType
  title?: string
  required?: boolean
}

export type InterviewBriefMeta = {
  title: string
  roleTitle: string
  status: 'draft' | string
  /** Auto duration from spine phases. */
  estimatedMinutes?: number
  /** Optional compose target; does not override auto estimate. */
  proposedMinutes?: number
  /** Pasted role / interview requirements from compose. */
  roleDescription?: string
  /** Org Drive file node for the uploaded role PDF. */
  rolePdfNodeId?: string
  rolePdfName?: string
}

export type InterviewBriefPersona = {
  name: string
  voice: string
}

export type InterviewBriefProbe = {
  id: string
  goal: string
  templateIds: string[]
}

export type InterviewBriefTopic = {
  id: string
  label: string
  probes: InterviewBriefProbe[]
}

export type InterviewBriefDiscussionPhase = {
  id: string
  kind: 'discussion'
  topicId?: string
  isOpening?: boolean
  isClosing?: boolean
  notes?: string
}

export type InterviewBriefToolPhase = {
  id: string
  kind: 'tool'
  toolRef: string
  required?: boolean
  title?: string
}

export type InterviewBriefPhase = InterviewBriefDiscussionPhase | InterviewBriefToolPhase

export type InterviewBriefToolEntry = {
  type: InterviewToolType | string
  title: string
  artifact?: { docKind: string }
}

/** Publishable brief JSON (aligns with planned interviewer-engine envelope). */
export type InterviewBriefBody = {
  schemaVersion: number
  kind: 'interview_brief'
  definition: {
    meta: InterviewBriefMeta
    persona: InterviewBriefPersona
    systemGoals: string[]
    guardrails: string[]
    probeDefaults: { maxFollowUps: number }
  }
  topicLibrary: InterviewBriefTopic[]
  phases: InterviewBriefPhase[]
  tools: Record<string, InterviewBriefToolEntry>
  analysis: { bindings: unknown[] }
}

export type InterviewBriefDraft = {
  schemaVersion: number
  title: string
  flow: import('../flowEditor/types').FlowDocument
  updatedAt: string
}

export type InterviewCoverageIssue = {
  id: string
  severity: 'info' | 'warn'
  message: string
  nodeIds?: string[]
}

export type InterviewCoverageReport = {
  metaCount: number
  topicCount: number
  phaseCount: number
  discussionCount: number
  toolCount: number
  issues: InterviewCoverageIssue[]
}

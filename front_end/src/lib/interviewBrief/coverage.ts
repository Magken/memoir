import type { FlowDocument } from '../flowEditor/types'
import { listSpinePhaseNodes } from './mapBrief'
import {
  INTERVIEW_KIND,
  type InterviewCoverageIssue,
  type InterviewCoverageReport,
  type InterviewDiscussionConfig,
  type InterviewToolConfig,
} from './types'
import {
  countOutgoingNext,
  isInterviewPhaseKind,
  topicEdgesFrom,
} from './validate'

export function analyzeInterviewBrief(doc: FlowDocument): InterviewCoverageReport {
  const metas = doc.nodes.filter((n) => n.kind === INTERVIEW_KIND.meta)
  const topics = doc.nodes.filter((n) => n.kind === INTERVIEW_KIND.topic)
  const discussions = doc.nodes.filter((n) => n.kind === INTERVIEW_KIND.discussion)
  const tools = doc.nodes.filter((n) => n.kind === INTERVIEW_KIND.tool)
  const phases = doc.nodes.filter((n) => isInterviewPhaseKind(n.kind))
  const issues: InterviewCoverageIssue[] = []

  if (metas.length === 0) {
    issues.push({
      id: 'meta-missing',
      severity: 'warn',
      message: 'Add exactly one Brief (meta) node',
    })
  } else if (metas.length > 1) {
    issues.push({
      id: 'meta-many',
      severity: 'warn',
      message: `Expected one Brief meta node, found ${metas.length}`,
      nodeIds: metas.map((m) => m.id),
    })
  }

  let hasOpening = false
  let hasClosing = false
  for (const node of discussions) {
    const config = (node.config ?? {}) as InterviewDiscussionConfig
    if (config.isOpening) hasOpening = true
    if (config.isClosing) hasClosing = true
    if (topicEdgesFrom(doc, node.id).length === 0) {
      issues.push({
        id: `discussion-no-topic-${node.id}`,
        severity: 'warn',
        message: `“${node.label}” has no topic bind`,
        nodeIds: [node.id],
      })
    }
  }

  if (discussions.length > 0 && !hasOpening) {
    issues.push({
      id: 'opening-missing',
      severity: 'warn',
      message: 'Mark a discussion phase as opening',
      nodeIds: discussions.map((d) => d.id),
    })
  }
  if (discussions.length > 0 && !hasClosing) {
    issues.push({
      id: 'closing-missing',
      severity: 'warn',
      message: 'Mark a discussion phase as closing',
      nodeIds: discussions.map((d) => d.id),
    })
  }

  const inboundTopic = new Set<string>()
  for (const node of discussions) {
    for (const edge of topicEdgesFrom(doc, node.id)) {
      inboundTopic.add(edge.target)
    }
  }
  for (const topic of topics) {
    if (!inboundTopic.has(topic.id)) {
      issues.push({
        id: `orphan-topic-${topic.id}`,
        severity: 'warn',
        message: `Topic “${topic.label}” is unused`,
        nodeIds: [topic.id],
      })
    }
  }

  for (const node of tools) {
    const config = (node.config ?? {}) as InterviewToolConfig
    if (!config.toolRef?.trim()) {
      issues.push({
        id: `tool-ref-empty-${node.id}`,
        severity: 'warn',
        message: `Tool phase “${node.label}” needs a toolRef`,
        nodeIds: [node.id],
      })
    }
  }

  for (const node of phases) {
    if (countOutgoingNext(doc, node.id) > 1) {
      issues.push({
        id: `branch-${node.id}`,
        severity: 'info',
        message: `“${node.label}” has multiple next links — prefer a linear interview order`,
        nodeIds: [node.id],
      })
    }
  }

  const ordered = listSpinePhaseNodes(doc)
  if (phases.length === 0 || ordered.length === 0) {
    issues.push({
      id: 'phases-empty',
      severity: 'warn',
      message: 'Add at least one phase before publishing',
    })
  }

  return {
    metaCount: metas.length,
    topicCount: topics.length,
    phaseCount: phases.length,
    discussionCount: discussions.length,
    toolCount: tools.length,
    issues,
  }
}

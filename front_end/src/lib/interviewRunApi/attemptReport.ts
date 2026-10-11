/**
 * Three-layer attempt report projection for Finished / Verify.
 */
import { catalogTemplate } from '../interviewBrief/analysisTemplateCatalog'
import { labelTemplate } from '../interviewBrief/analysisLabels'
import type { Creator2BriefDocument } from '../interviewBrief/creator2BriefTypes'
import type { GrainContribution, AttemptScorePackage, SittingResultStatus } from './scoreAttempt'
import { scoreAttempt, sittingResultStatus } from './scoreAttempt'
import type { InterviewResponse } from './talkTypes'
import { getInterviewResponse } from './interviewResponse'

export const ATTEMPT_REPORT_SCHEMA = 'vurify/attempt-report' as const

export type AttemptReportStatus = SittingResultStatus

export type AttemptReport = {
  schema: typeof ATTEMPT_REPORT_SCHEMA
  schemaVersion: 1
  briefId: string
  attemptId: string
  status: AttemptReportStatus
  layer1: {
    overall: number
    byWeight: AttemptScorePackage['softGrade']['byWeight']
    formGate: AttemptScorePackage['formGate']
    pendingCount: number
    contributions: GrainContribution[]
    charts: {
      bucketBars: Array<{ key: string; label: string; unit: number | null; weight: number }>
      contributionTree: Array<{
        bucket: string
        templateId: string
        label: string
        towardOverall: number
      }>
    }
  }
  layer2: Record<
    string,
    {
      kind: string
      title: string
      status: AttemptReportStatus
      headline: string
      detail: string
      pills: Array<{
        templateId: string
        label: string
        unit: number | null
        towardOverall: number | null
        status: string
      }>
    }
  >
  layer3: {
    analysisHosts: {
      turns: number
      tools: string[]
      topics: string[]
    }
    tapePhaseIds: string[]
  }
}

export function assembleAttemptReport(input: {
  brief: Creator2BriefDocument | { phases?: Array<{ id?: string; kind?: string; title?: string; toolRef?: string }>; tools?: Record<string, { type?: string }> }
  response: InterviewResponse
  scored?: AttemptScorePackage
}): AttemptReport {
  const scored = input.scored ?? scoreAttempt({ brief: input.brief, response: input.response })
  const pendingCount = scored.pendingCount
  const hasFilled = scored.contributions.length > 0 || scored.softGrade.overall > 0
  const status = sittingResultStatus(pendingCount, hasFilled || Boolean(scored.formGate))

  const bucketBars = Object.entries(scored.softGrade.byWeight).map(([key, b]) => ({
    key,
    label: b.label,
    unit: b.unit,
    weight: b.weight,
  }))
  const contributionTree = scored.contributions.map((c) => ({
    bucket: c.bucket,
    templateId: c.templateId,
    label: labelTemplate(c.templateId),
    towardOverall: c.towardOverall,
  }))

  const layer2: AttemptReport['layer2'] = {}
  for (const phase of input.brief.phases ?? []) {
    const phaseId = String(phase.id ?? '')
    if (!phaseId) continue
    const hostRef =
      'toolRef' in phase && typeof phase.toolRef === 'string' ? phase.toolRef : phaseId
    const toolRow = input.response.analysis.tools?.[hostRef] ?? {}
    const topicRow =
      'topicId' in phase && typeof phase.topicId === 'string'
        ? input.response.analysis.topics?.[phase.topicId]?.byTemplate ?? {}
        : {}
    const pills: AttemptReport['layer2'][string]['pills'] = []
    const rows = { ...toolRow, ...topicRow }
    for (const [templateId, grain] of Object.entries(rows)) {
      const contrib = scored.contributions.find(
        (c) => c.templateId === templateId && c.hostRef === (grain.hostRef || hostRef),
      )
      pills.push({
        templateId,
        label: catalogTemplate(templateId)?.label ?? labelTemplate(templateId),
        unit: contrib?.unit ?? null,
        towardOverall: contrib?.towardOverall ?? null,
        status: grain.status,
      })
    }
    const pendingHere = pills.some((p) => p.status === 'pending')
    const filledHere = pills.some((p) => p.status === 'filled')
    layer2[phaseId] = {
      kind: String(phase.kind ?? 'tool'),
      title: String(phase.title ?? phaseId),
      status: sittingResultStatus(pendingHere ? 1 : 0, filledHere),
      headline: pills[0]?.label ?? 'Section',
      detail: pills
        .map((p) => `${p.label}: ${p.status}`)
        .join(' · '),
      pills,
    }
  }

  return {
    schema: ATTEMPT_REPORT_SCHEMA,
    schemaVersion: 1,
    briefId: input.response.briefId,
    attemptId: input.response.attemptId,
    status,
    layer1: {
      overall: scored.softGrade.overall,
      byWeight: scored.softGrade.byWeight,
      formGate: scored.formGate,
      pendingCount,
      contributions: scored.contributions,
      charts: { bucketBars, contributionTree },
    },
    layer2,
    layer3: {
      analysisHosts: {
        turns: Object.keys(input.response.analysis.turns ?? {}).length,
        tools: Object.keys(input.response.analysis.tools ?? {}),
        topics: Object.keys(input.response.analysis.topics ?? {}),
      },
      tapePhaseIds: Object.keys(input.response.editorTapes ?? {}),
    },
  }
}

export function downloadAttemptReportJson(input: {
  briefId: string
  brief: Creator2BriefDocument | null | undefined
}): void {
  if (typeof document === 'undefined' || !input.brief) return
  const response = getInterviewResponse(input.briefId)
  const report = assembleAttemptReport({ brief: input.brief, response })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const name = `attempt-report-${input.briefId.replace(/[^a-z0-9._-]+/gi, '_')}-${stamp}.json`
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

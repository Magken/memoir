/**
 * One downloadable JSON for a live sitting — InterviewResponse plus tapes,
 * telemetry, security clocks, sitting-read, and the attempt-report projection.
 * Sidecars stay siblings; they are not stuffed onto InterviewResponse.
 */
import type { Creator2BriefDocument } from '../interviewBrief/creator2BriefTypes'
import { assembleAttemptReport, type AttemptReport } from './attemptReport'
import { collectSittingRead, sittingDurationMinutes } from './collectSittingRead'
import {
  EDITOR_TAPES_PACK_SCHEMA,
  type EditorTapesPack,
} from './editorCapture/types'
import { tapesPackFromStore } from './editorCapture/store'
import {
  buildOutputCardFromScored,
  type InterviewOutputCardFixture,
} from './fixtures/output-cards/outputCardFixture'
import { getInterviewResponse } from './interviewResponse'
import { markJobsInflightCount } from './markJobs'
import { scoreAttempt } from './scoreAttempt'
import { compileSessionSeries, type SessionSeries } from './sessionSeries'
import {
  metaFromSessionSignals,
  overviewSignalGrains,
  type SessionSignalAtlas,
} from './sessionSignals'
import { flushSessionTelemetry, loadSessionTelemetry, type SessionTelemetry } from './sessionTelemetry'
import type { SittingReadSection } from './sittingReadMarkup'
import {
  packageIntakeDeclarations,
  type IntakeDeclarationsPack,
} from './sittingDeclaration'
import type { AnalysisGrainStub, InterviewResponse } from './talkTypes'

export const ATTEMPT_PACKAGE_SCHEMA = 'vurify/attempt-package' as const

export type AttemptPackageStatus = 'marking' | 'ready'

export type AttemptPackagePendingGrain = {
  host: 'turns' | 'tools' | 'topics' | 'signals'
  hostRef: string
  templateId: string
}

export type AttemptPackageMarking = {
  inflightJobs: number
  pendingCount: number
  pending: AttemptPackagePendingGrain[]
}

export type AttemptPackage = {
  schema: typeof ATTEMPT_PACKAGE_SCHEMA
  schemaVersion: 1
  briefId: string
  attemptId: string
  exportedAt: string
  status: AttemptPackageStatus
  marking: AttemptPackageMarking
  response: InterviewResponse
  editorTapes: EditorTapesPack
  sessionTelemetry: SessionTelemetry | null
  sessionSeries: SessionSeries | null
  signalAtlas: SessionSignalAtlas | null
  sittingRead: SittingReadSection[]
  outputCard: InterviewOutputCardFixture | null
  report: AttemptReport | null
  /** Landing terms + support note with ISO stamps. Also on `response`. */
  intakeDeclarations: IntakeDeclarationsPack
}

function emptyTapesPack(briefId: string): EditorTapesPack {
  return {
    schema: EDITOR_TAPES_PACK_SCHEMA,
    schemaVersion: 1,
    briefId,
    byKind: {},
    byPhaseId: {},
  }
}

function visitPending(
  host: AttemptPackagePendingGrain['host'],
  hostRef: string,
  row: Record<string, AnalysisGrainStub> | undefined,
  out: AttemptPackagePendingGrain[],
): void {
  if (!row) return
  for (const [templateId, grain] of Object.entries(row)) {
    if (grain?.status === 'pending') out.push({ host, hostRef, templateId })
  }
}

export function collectPendingPackageGrains(
  response: InterviewResponse,
): AttemptPackagePendingGrain[] {
  const pending: AttemptPackagePendingGrain[] = []
  for (const [hostRef, row] of Object.entries(response.analysis.turns ?? {})) {
    visitPending('turns', hostRef, row, pending)
  }
  for (const [hostRef, row] of Object.entries(response.analysis.tools ?? {})) {
    visitPending('tools', hostRef, row, pending)
  }
  for (const [hostRef, topic] of Object.entries(response.analysis.topics ?? {})) {
    visitPending('topics', hostRef, topic?.byTemplate ?? {}, pending)
  }
  visitPending('signals', 'attempt', response.analysis.signals, pending)
  return pending
}

export function attemptPackageStatus(input: {
  inflightJobs: number
  pendingCount?: number
}): AttemptPackageStatus {
  return input.inflightJobs > 0 || (input.pendingCount ?? 0) > 0 ? 'marking' : 'ready'
}

export function assembleAttemptPackage(input: {
  briefId: string
  brief?: Creator2BriefDocument | null
  response?: InterviewResponse
  editorTapes?: EditorTapesPack | null
  sessionTelemetry?: SessionTelemetry | null
  inflightJobs?: number
  exportedAt?: string
}): AttemptPackage {
  const briefId = input.briefId.trim()
  if (input.editorTapes === undefined && input.sessionTelemetry === undefined) {
    try {
      flushSessionTelemetry()
    } catch {
      /* Node / idle telemetry */
    }
  }
  const response = input.response ?? getInterviewResponse(briefId)
  const editorTapes =
    input.editorTapes === undefined
      ? tapesPackFromStore(briefId)
      : (input.editorTapes ?? emptyTapesPack(briefId))
  const sessionTelemetry =
    input.sessionTelemetry !== undefined
      ? input.sessionTelemetry
      : loadSessionTelemetry(briefId)
  const pending = collectPendingPackageGrains(response)
  const inflightJobs =
    input.inflightJobs ?? (typeof window === 'undefined' ? 0 : markJobsInflightCount())
  const marking: AttemptPackageMarking = {
    inflightJobs,
    pendingCount: pending.length,
    pending,
  }
  const status = attemptPackageStatus({ inflightJobs, pendingCount: pending.length })

  let sessionSeries: SessionSeries | null = null
  let signalAtlas: SessionSignalAtlas | null = null
  let sittingRead: SittingReadSection[] = []
  let outputCard: InterviewOutputCardFixture | null = null
  let report: AttemptReport | null = null
  let packaged: InterviewResponse = response

  if (input.brief) {
    const { atlas, grains } = overviewSignalGrains({
      brief: input.brief,
      response,
      telemetry: sessionTelemetry,
      tapes: editorTapes,
    })
    signalAtlas = atlas
    sessionSeries = atlas.sessionSeries
    packaged = {
      ...response,
      analysis: { ...response.analysis, signals: grains },
    }
    const scored = scoreAttempt({ brief: input.brief, response: packaged })
    sittingRead = collectSittingRead({
      brief: input.brief,
      response: packaged,
      scored,
      sessionSeries,
    })
    outputCard = buildOutputCardFromScored({
      id: response.attemptId,
      candidate: { displayName: 'You' },
      briefTitle: input.brief.definition?.meta?.title,
      sittingRead,
      scored,
      summary: scored.artifacts.sittingThesis?.summary,
      meta: {
        sectionsCompleted: response.completedPhaseIds.length,
        sectionsTotal: input.brief.phases.length,
        skipped: response.skippedPhaseIds.length,
        gate: scored.formGate?.passed === false ? 'fail' : 'pass',
        durationMinutes: sittingDurationMinutes(sessionSeries),
        limitMinutes:
          typeof input.brief.definition?.meta?.proposedMinutes === 'number'
            ? input.brief.definition.meta.proposedMinutes
            : undefined,
        ...metaFromSessionSignals(packaged, atlas),
        sessionMix: scored.artifacts.sessionMix ?? undefined,
        tensions: scored.artifacts.tensions,
        sittingThesis: scored.artifacts.sittingThesis,
      },
    })
    report = assembleAttemptReport({
      brief: input.brief,
      response: packaged,
      scored,
    })
  } else {
    sessionSeries = null
  }

  if (!sessionSeries && input.brief) {
    sessionSeries = compileSessionSeries({
      brief: input.brief,
      response: packaged,
      telemetry: sessionTelemetry,
      tapes: editorTapes,
    })
  }

  return {
    schema: ATTEMPT_PACKAGE_SCHEMA,
    schemaVersion: 1,
    briefId: response.briefId,
    attemptId: response.attemptId,
    exportedAt: input.exportedAt ?? response.updatedAt,
    status,
    marking,
    response: packaged,
    editorTapes,
    sessionTelemetry,
    sessionSeries,
    signalAtlas,
    sittingRead,
    outputCard,
    report,
    intakeDeclarations: packageIntakeDeclarations({
      terms: packaged.sittingTerms,
      supportNote: packaged.sittingDeclaration,
    }),
  }
}

export function exportAttemptPackageJson(
  input: {
    briefId: string
    brief?: Creator2BriefDocument | null
  },
  pretty = true,
): string {
  const pack = assembleAttemptPackage(input)
  return pretty ? JSON.stringify(pack, null, 2) : JSON.stringify(pack)
}

export function downloadAttemptPackageJson(input: {
  briefId: string
  brief?: Creator2BriefDocument | null
}): void {
  if (typeof document === 'undefined') return
  const pack = assembleAttemptPackage({
    ...input,
    exportedAt: new Date().toISOString(),
  })
  const json = JSON.stringify(pack, null, 2)
  const stamp = pack.exportedAt.replace(/[:.]/g, '-')
  const name = `interview-package-${pack.briefId.replace(/[^a-z0-9._-]+/gi, '_')}-${stamp}.json`
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

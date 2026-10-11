/**
 * Build interview-tool-assess request bodies from brief + live artifacts.
 * Form answerKey is rehydrated from the brief (never from the candidate mount).
 */
import { buildCodeRunRequest } from '../interviewBrief/buildCodeRunRequest'
import type { Creator2BriefDocument } from '../interviewBrief/creator2BriefTypes'
import { mapCreator2BriefToTimeline } from '../interviewBrief/mapCreator2BriefToTimeline'
import {
  labeledCodingWorkspaceSource,
  listCodingRunFiles,
} from '../interviewBrief/codingWorkspaceFiles'
import type { CodeEditorPayload, DocEditorPayload } from '../editorContext/types'
import type { TestFormDocument } from '../testForm/types'
import type { CodeRunResult } from './codeRunEdgeClient'
import { runInterviewCode } from './codeRunEdgeClient'
import { runInterviewToolAssess, ToolAssessError, type ToolAssessResult } from './toolAssessEdgeClient'
import type { MarkStageEntry } from './talkTypes'
import { canonicalWritingAssessmentKind } from '../../../../back_end/supabase/functions/_shared/interview-assessors/writingAssessmentKind.ts'

export type LiveToolArtifact =
  | { kind: 'form'; document: TestFormDocument }
  | { kind: 'coding'; payload: CodeEditorPayload; activeLanguage?: string | null }
  | { kind: 'doc'; payload: DocEditorPayload }

export type LastVisibleCodeRun = {
  sourceHash: string
  result: CodeRunResult
}

function simpleHash(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return String(h)
}

function phaseToolRef(brief: Creator2BriefDocument, phaseId: string): string | null {
  const phase = brief.phases.find((p) => p.id === phaseId)
  return phase && 'toolRef' in phase && typeof phase.toolRef === 'string'
    ? phase.toolRef
    : null
}

function mergeCodeRuns(
  visible: CodeRunResult | null,
  hidden: CodeRunResult,
): CodeRunResult {
  if (!visible) return hidden
  const byId = new Map<string, CodeRunResult['cases'][number]>()
  for (const c of visible.cases) byId.set(c.id, c)
  for (const c of hidden.cases) byId.set(c.id, c)
  const cases = [...byId.values()]
  const passedCount = cases.filter((c) => c.passed).length
  const total = cases.length
  return {
    passed: total > 0 && passedCount === total,
    passedCount,
    total,
    status: hidden.status || visible.status,
    cases,
    lines: [
      ...visible.lines,
      '---',
      ...hidden.lines,
      `Assess summary: ${passedCount}/${total} passed (visible+hidden)`,
    ],
    judge0: hidden.judge0 ?? visible.judge0,
  }
}

/** Assess-time Judge0: full suite, or hidden-only when visible already ran for same source. */
export async function runAssessCodeSuite(input: {
  brief: Creator2BriefDocument
  phaseId: string
  codingPayload: CodeEditorPayload
  activeLanguage?: string | null
  lastVisibleRun?: LastVisibleCodeRun | null
  accessToken?: string | null
  briefId?: string | null
  /** Records why the suite did not run — a silent null marks coding with no tests. */
  onStage?: (entry: MarkStageEntry) => void
}): Promise<CodeRunResult | null> {
  const timeline = mapCreator2BriefToTimeline(input.brief)
  const step = timeline.steps.find((s) => s.id === input.phaseId)
  const tests = step?.codingEditor?.tests
  if (!tests?.cases?.length) {
    input.onStage?.({ stage: 'code_run', status: 'skipped', ms: 0 })
    return null
  }

  const allCases = tests.cases
  const hiddenCases = allCases.filter((c) => c.hidden)
  const sourceHash = simpleHash(
    `${input.activeLanguage ?? ''}\n${JSON.stringify(input.codingPayload.files ?? [])}`,
  )
  const reuseVisible =
    input.lastVisibleRun &&
    input.lastVisibleRun.sourceHash === sourceHash &&
    hiddenCases.length > 0

  const casesToRun = reuseVisible ? hiddenCases : allCases
  const built = buildCodeRunRequest({
    workspace: input.codingPayload,
    languages: step?.codingEditor?.languages ?? [],
    defaultLanguage: step?.codingEditor?.languages?.[0] ?? 'typescript',
    activeLanguage: input.activeLanguage,
    tests: {
      runner: tests.runner || 'hidden_cases_v1',
      entryPoint: tests.entryPoint || 'solve',
      cases: casesToRun,
    },
  })
  if (!built.ok) {
    input.onStage?.({ stage: 'code_run', status: 'failed', ms: 0, error: 'build_request_failed' })
    return null
  }

  const startedAt = Date.now()
  try {
    const result = await runInterviewCode({
      body: built.body,
      accessToken: input.accessToken,
      briefId: input.briefId,
    })
    input.onStage?.({ stage: 'code_run', status: 'ok', ms: Date.now() - startedAt })
    if (reuseVisible && input.lastVisibleRun) {
      return mergeCodeRuns(input.lastVisibleRun.result, result)
    }
    return result
  } catch (e) {
    // Returning null here marks the coding section with no suite result at all.
    // Silent before; now it names itself.
    input.onStage?.({
      stage: 'code_run',
      status: 'failed',
      ms: Date.now() - startedAt,
      error: e instanceof Error ? e.message : String(e),
    })
    return null
  }
}

/**
 * What this interview is for, and what this stage was asked to produce.
 *
 * Assessors used to receive the artifact and the rubric but never the aim, so a
 * fluent answer to a different question scored as well as a fluent answer to the
 * authored one. Craft was graded; relevance could not be.
 */
export type AssessAimBlock = {
  roleTitle: string
  roleDescription: string
  systemGoals: string[]
  phaseTitle: string
  phaseInstructions: string
}

export function buildAssessAim(
  brief: Creator2BriefDocument,
  step: { title?: string; instructions?: string } | null,
  instructions?: string | null,
): AssessAimBlock {
  const meta = brief.definition?.meta
  return {
    roleTitle: String(meta?.roleTitle ?? meta?.title ?? '').trim(),
    roleDescription: String(meta?.roleDescription ?? '').trim(),
    systemGoals: (brief.definition?.systemGoals ?? []).map(String).filter(Boolean),
    phaseTitle: String(step?.title ?? '').trim(),
    phaseInstructions: String(instructions ?? step?.instructions ?? '').trim(),
  }
}

/** Aim for any phase, including tape_process which does not go through `buildToolAssessBody`. */
export function assessAimForPhase(
  brief: Creator2BriefDocument,
  phaseId: string,
): AssessAimBlock {
  const phase = brief.phases?.find((p) => p.id === phaseId) ?? null
  const toolRef = typeof phase?.toolRef === 'string' ? phase.toolRef : ''
  const tool = toolRef && brief.tools ? brief.tools[toolRef] : undefined
  const instructions = String(tool?.instructions ?? phase?.notes ?? '').trim()
  return buildAssessAim(
    brief,
    phase ? { title: String(phase.title ?? tool?.title ?? ''), instructions } : null,
    instructions,
  )
}

/** Author-only marking guidance for this tool, when the brief carries any. */
function assessorHintsFor(
  brief: Creator2BriefDocument,
  hostRef: string,
): string | null {
  const tool = brief.tools[hostRef] as { assessorHints?: unknown } | undefined
  const hints = tool?.assessorHints
  const text = typeof hints === 'string' ? hints.trim() : ''
  return text || null
}

export function buildToolAssessBody(input: {
  brief: Creator2BriefDocument
  phaseId: string
  artifact: LiveToolArtifact | null
  codeRun: CodeRunResult | null
}): { hostRef: string; body: Record<string, unknown> } | null {
  const timeline = mapCreator2BriefToTimeline(input.brief)
  const step = timeline.steps.find((s) => s.id === input.phaseId)
  if (!step) return null
  const hostRef = phaseToolRef(input.brief, input.phaseId) || input.phaseId

  if (step.formEditor?.document) {
    const authored = structuredClone(step.formEditor.document) as TestFormDocument
    const live =
      input.artifact?.kind === 'form' ? input.artifact.document : null
    const responses = live?.attempt?.responses ?? authored.attempt?.responses ?? {}
    const document = {
      ...authored,
      attempt: {
        ...(authored.attempt ?? { startedAt: null, submittedAt: null, responses: {} }),
        responses,
      },
    }
    const tool = input.brief.tools[hostRef]
    return {
      hostRef,
      body: {
        kind: 'form',
        hostRef,
        document,
        responses,
        passThreshold: tool?.passThreshold ?? null,
        aim: buildAssessAim(input.brief, step, step.formEditor.summaryBlurb),
        assessorHints: assessorHintsFor(input.brief, hostRef),
      },
    }
  }

  if (step.docEditor?.document) {
    const prompt = step.docEditor.prompt
    const assessment = step.docEditor.assessment
    const live = input.artifact?.kind === 'doc' ? input.artifact.payload : null
    let candidateMarkdown = ''
    if (live && typeof live === 'object') {
      const md = (live as { markdown?: string; exportMarkdown?: string }).markdown
      const exportMd = (live as { exportMarkdown?: string }).exportMarkdown
      candidateMarkdown = String(md ?? exportMd ?? '').trim()
      if (
        !candidateMarkdown &&
        Array.isArray((live as unknown as { blocks?: unknown[] }).blocks)
      ) {
        candidateMarkdown = JSON.stringify(
          (live as unknown as { blocks: unknown[] }).blocks,
        )
      }
    }
    return {
      hostRef,
      body: {
        kind: 'writing',
        hostRef,
        prompt: {
          brief: prompt?.brief ?? step.docEditor.instructions ?? '',
          structure: prompt?.structure ?? [],
          requirements: prompt?.requirements ?? [],
        },
        assessment: {
          kind: canonicalWritingAssessmentKind(assessment?.kind),
          dimensions: assessment?.dimensions ?? [],
          formatNotes: assessment?.formatNotes,
        },
        // Empty stays empty: padding it to '(empty)' made a blank submission look
        // like a one-word answer, and the assessor graded the padding.
        candidateMarkdown,
        limits: {
          minWords: step.docEditor.minWords ?? null,
          maxWords: step.docEditor.maxWords ?? null,
          timed: Boolean(step.docEditor.timed),
          limitMinutes: step.docEditor.limitMinutes ?? null,
        },
        aim: buildAssessAim(input.brief, step, step.docEditor.instructions),
        assessorHints: assessorHintsFor(input.brief, hostRef),
      },
    }
  }

  if (step.codingEditor?.workspace) {
    const live =
      input.artifact?.kind === 'coding' ? input.artifact.payload : step.codingEditor.workspace
    const lang =
      (input.artifact?.kind === 'coding' && input.artifact.activeLanguage) ||
      step.codingEditor.languages?.[0] ||
      'typescript'
    const run = input.codeRun
    const failingIds = run?.cases.filter((c) => !c.passed).map((c) => c.id) ?? []
    const packed = listCodingRunFiles(live, lang)
    const source = packed.length
      ? labeledCodingWorkspaceSource(packed)
      : ''
    const sourcePath =
      packed.find((f) => /solve\./i.test(f.path))?.path ??
      packed[0]?.path ??
      live.files?.find((f) => /solve\./i.test(f.path))?.path ??
      'src/solve.ts'
    return {
      hostRef,
      body: {
        kind: 'coding_bundle',
        hostRef,
        source: String(source),
        language: String(lang),
        entryPoint: step.codingEditor.tests?.entryPoint ?? 'solve',
        sourcePath,
        promptText:
          step.codingEditor.instructions?.trim() ||
          step.title ||
          'Coding challenge',
        // Both were read by the Edge assessors and never sent by the FE: the
        // parameters existed, the channels were dark.
        referenceSolution: step.codingEditor.tests?.referenceSolution ?? null,
        assessorHints: assessorHintsFor(input.brief, hostRef),
        aim: buildAssessAim(input.brief, step, step.codingEditor.instructions),
        run: run
          ? {
              passed: run.passed,
              passedCount: run.passedCount,
              total: run.total,
              status: run.status,
              failingIds,
            }
          : null,
        runData: run
          ? {
              passed: run.passed,
              passedCount: run.passedCount,
              total: run.total,
              status: run.status,
              cases: run.cases.map((c) => {
                const authored = step.codingEditor?.tests?.cases?.find((a) => a.id === c.id)
                const hidden = Boolean(authored?.hidden ?? false)
                return {
                  id: c.id,
                  name: c.name,
                  passed: c.passed,
                  hidden,
                  // Never send oracle / expected payloads for hidden cases.
                  message: hidden
                    ? c.passed
                      ? undefined
                      : 'Hidden case failed'
                    : c.message,
                }
              }),
              // Strip suite dump lines that may echo hidden expected values.
              lines: (run.lines ?? [])
                .filter((line) => !/expected|oracle|assertEqual/i.test(String(line)))
                .slice(0, 40),
            }
          : null,
      },
    }
  }

  return null
}

export async function assessToolPhase(input: {
  brief: Creator2BriefDocument
  phaseId: string
  artifact: LiveToolArtifact | null
  lastVisibleRun?: LastVisibleCodeRun | null
  accessToken?: string | null
  briefId?: string | null
  referencedEvidence?: unknown
}): Promise<{
  hostRef: string
  result: ToolAssessResult
  codeRun: CodeRunResult | null
  /** FE-observed stages plus whatever Edge reported, for `analysis.markTrace`. */
  stages: MarkStageEntry[]
  kind: string
  model?: string | null
  totalMs: number
} | null> {
  const timeline = mapCreator2BriefToTimeline(input.brief)
  const step = timeline.steps.find((s) => s.id === input.phaseId)
  if (!step) return null

  const feStages: MarkStageEntry[] = []
  const startedAt = Date.now()

  let codeRun: CodeRunResult | null = null
  if (step.codingEditor?.workspace) {
    const codingPayload =
      input.artifact?.kind === 'coding'
        ? input.artifact.payload
        : step.codingEditor.workspace
    const activeLanguage =
      input.artifact?.kind === 'coding' ? input.artifact.activeLanguage : null
    codeRun = await runAssessCodeSuite({
      brief: input.brief,
      phaseId: input.phaseId,
      codingPayload,
      activeLanguage,
      lastVisibleRun: input.lastVisibleRun,
      accessToken: input.accessToken,
      briefId: input.briefId,
      onStage: (entry) => feStages.push(entry),
    })
  }

  const built = buildToolAssessBody({
    brief: input.brief,
    phaseId: input.phaseId,
    artifact: input.artifact,
    codeRun,
  })
  if (!built) return null

  try {
    const result = await runInterviewToolAssess({
      body: {
        ...built.body,
        ...(input.briefId ? { briefId: input.briefId } : {}),
        ...(input.referencedEvidence ? { referencedEvidence: input.referencedEvidence } : {}),
      },
      accessToken: input.accessToken,
    })
    return {
      hostRef: built.hostRef,
      result,
      codeRun,
      stages: [...feStages, ...(result.diag?.stages ?? [])],
      kind: String(built.body.kind ?? ''),
      model: result.diag?.model ?? null,
      totalMs: Date.now() - startedAt,
    }
  } catch (e) {
    // Re-throw with the partial trace attached so the caller can persist how far
    // marking got before it died.
    const diag = e instanceof ToolAssessError ? e.diag : undefined
    throw new ToolAssessError(e instanceof Error ? e.message : String(e), {
      ...diag,
      kind: String(built.body.kind ?? ''),
      hostRef: built.hostRef,
      totalMs: Date.now() - startedAt,
      stages: [...feStages, ...(diag?.stages ?? [])],
      failed: diag?.failed ?? (e instanceof Error ? e.message : String(e)),
    })
  }
}

export { simpleHash as hashCodingSource }

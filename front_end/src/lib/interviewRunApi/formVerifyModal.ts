/**
 * Form Soft Decision Verify modal — keyed marks + review document (answerKey kept).
 */
import type { Creator2BriefDocument } from '../interviewBrief/creator2BriefTypes'
import { mapCreator2BriefToTimeline } from '../interviewBrief/mapCreator2BriefToTimeline'
import type {
  TestFormDocument,
  TestFormQuestionScore,
  TestFormResponses,
} from '../testForm/types'
import { formGateLabel } from './fixtures/output-cards/outputCardFixture'
import type { FormGateSummary, AttemptScorePackage } from './scoreAttempt'
import { overlayFormDocument } from './editorCapture/overlay'
import { pickEditorTape } from './editorCapture/store'
import type { EditorTape, EditorTapesPack } from './editorCapture/types'
import type { AnalysisGrainStub, InterviewResponse, InterviewResponseMessage } from './talkTypes'
import { assistTranscriptForPhase } from './assistChatPersist'
import type { TalkVerifyMarkingCard } from './talkVerifyModal'
import {
  cardsFromPackageNotes,
  cardsFromToolHost,
  findToolGrain,
  findToolPackage,
  attemptHostRef,
  resolveVerifyPhaseId,
  applyContributionsToCards,
  type ToolVerifyPackage,
} from './toolVerifyShared'

export type FormVerifyModal = {
  fixtureId: string
  sectionKey: string
  sectionLabel: string
  title: string
  description: string
  depthLabel: string
  formGate: FormGateSummary | null
  /** Authored form with answerKey; attempt scores/responses when available. */
  document: TestFormDocument
  tape: EditorTape | null
  assistMessages: InterviewResponseMessage[]
  cards: TalkVerifyMarkingCard[]
  packageJson: unknown
  readOnly: true
}

function emptyFormDocument(title: string): TestFormDocument {
  return {
    schema: 'vurify/test-form',
    version: 1,
    id: 'tf.verify.empty',
    title,
    settings: {},
    sections: [],
    questions: [],
    answerKey: {},
  }
}

function formatFormGateDescription(gate: FormGateSummary | null): string {
  if (!gate) return ''
  const pass = formGateLabel(gate) ?? 'Review'
  const score = `${gate.gradedScore}/${gate.gradedMax}`
  const ungraded = gate.ungradedIds?.length ?? 0
  return `${pass} · ${score} graded · ${ungraded} ungraded`
}

type FormByItem = {
  questionId?: string
  earned?: number
  max?: number
  auto?: boolean
  correct?: boolean
  notes?: string
  status?: string
  authorHint?: string
}

function scoresFromByItem(byItem: FormByItem[]): TestFormQuestionScore[] {
  return byItem
    .map((row) => {
      const questionId = String(row.questionId ?? '').trim()
      if (!questionId) return null
      const status =
        row.status === 'ungraded'
          ? ('ungraded' as const)
          : row.status === 'graded'
            ? ('graded' as const)
            : undefined
      return {
        questionId,
        earned: typeof row.earned === 'number' ? row.earned : 0,
        max: typeof row.max === 'number' ? row.max : 0,
        auto: Boolean(row.auto),
        correct: row.correct,
        notes: typeof row.notes === 'string' ? row.notes : undefined,
        status,
      } satisfies TestFormQuestionScore
    })
    .filter((s): s is NonNullable<typeof s> => s != null)
}

function scoresFromPackageItems(pkg: ToolVerifyPackage | null): TestFormQuestionScore[] {
  if (!pkg || !Array.isArray(pkg.items)) return []
  return pkg.items
    .map((raw) => {
      if (!raw || typeof raw !== 'object') return null
      const row = raw as Record<string, unknown>
      const questionId = String(row.id ?? row.questionId ?? '').trim()
      if (!questionId) return null
      const score = typeof row.score === 'number' ? row.score : 0
      const max = typeof row.max === 'number' ? row.max : 0
      return {
        questionId,
        earned: score,
        max,
        auto: true,
        correct: max > 0 ? score >= max : undefined,
        notes: typeof row.notes === 'string' ? row.notes : undefined,
      } satisfies TestFormQuestionScore
    })
    .filter((s): s is NonNullable<typeof s> => s != null)
}

function mergeAttemptDocument(
  authored: TestFormDocument,
  grain: AnalysisGrainStub | null | undefined,
  pkg: ToolVerifyPackage | null,
): TestFormDocument {
  const result = (grain?.result ?? null) as {
    byItem?: FormByItem[]
    score?: number
    max?: number
    gradedScore?: number
    gradedMax?: number
  } | null

  const byItemScores =
    Array.isArray(result?.byItem) && result.byItem.length > 0
      ? scoresFromByItem(result.byItem)
      : scoresFromPackageItems(pkg)

  const existingResponses = authored.attempt?.responses
  const responses: TestFormResponses =
    existingResponses && Object.keys(existingResponses).length > 0
      ? existingResponses
      : {}

  const totalEarned =
    typeof result?.gradedScore === 'number'
      ? result.gradedScore
      : typeof result?.score === 'number'
        ? result.score
        : byItemScores.reduce((sum, s) => sum + (s.status === 'ungraded' ? 0 : s.earned), 0)
  const totalMax =
    typeof result?.gradedMax === 'number'
      ? result.gradedMax
      : typeof result?.max === 'number'
        ? result.max
        : byItemScores.reduce((sum, s) => sum + (s.status === 'ungraded' ? 0 : s.max), 0)

  if (byItemScores.length === 0 && Object.keys(responses).length === 0) {
    return {
      ...authored,
      answerKey: authored.answerKey ?? {},
      attempt: authored.attempt,
    }
  }

  return {
    ...authored,
    answerKey: authored.answerKey ?? {},
    attempt: {
      ...(authored.attempt ?? {}),
      responses,
      scores: byItemScores.length > 0 ? byItemScores : authored.attempt?.scores,
      totalEarned,
      totalMax,
    },
  }
}

/**
 * Build Form Verify review modal for formMark Soft Decision / form gate See more.
 * Keeps authored answerKey (does not strip).
 */
export function buildFormVerifyModal(input: {
  fixtureId: string
  sectionKey: string
  sectionLabel: string
  response: InterviewResponse
  scored: AttemptScorePackage
  brief: Creator2BriefDocument
  tapePacks?: { live?: EditorTapesPack | null; fixture?: EditorTapesPack | null }
  /** Spine step. Omit to use the first form stage on the brief. */
  phaseId?: string | null
}): FormVerifyModal {
  const phaseId = resolveVerifyPhaseId(input.brief, 'form', input.phaseId)
  const timeline = mapCreator2BriefToTimeline(input.brief)
  const step = phaseId ? timeline.steps.find((s) => s.id === phaseId) : undefined
  const authored = step?.formEditor?.document
    ? structuredClone(step.formEditor.document)
    : emptyFormDocument(step?.title || input.sectionLabel || 'Form')

  const preferredHost = attemptHostRef(input.brief, phaseId, input.response)
  const formHit = findToolGrain(input.response, 'mark.form.key.v1', preferredHost)
  const reasoningHit = findToolGrain(input.response, 'mark.form.reasoning.v1', preferredHost)
  const synthHit = findToolGrain(input.response, 'synth.tool.v1', preferredHost)
  const hostRef =
    preferredHost || formHit?.hostRef || reasoningHit?.hostRef || synthHit?.hostRef || ''
  const pkg = hostRef ? findToolPackage(input.response, hostRef) : null
  const merged = mergeAttemptDocument(authored, formHit?.grain, pkg)
  const tape = pickEditorTape({
    kind: 'form',
    phaseId,
    live: input.tapePacks?.live,
    fixture: input.tapePacks?.fixture,
  })
  const document = overlayFormDocument(merged, tape)
  const formGate = input.scored.formGate

  const cards: TalkVerifyMarkingCard[] = [
    ...cardsFromToolHost(input.response, hostRef, {
      emphasizeTemplateId: 'mark.form.key.v1',
    }),
    ...cardsFromPackageNotes(pkg),
  ]

  const title = document.title?.trim() || step?.title || 'Form'
  const description = formatFormGateDescription(formGate)
  const qCount = document.questions?.length ?? 0
  const depthLabel = qCount > 0 ? `${qCount} question${qCount === 1 ? '' : 's'}` : 'Form'

  return {
    fixtureId: input.fixtureId,
    sectionKey: input.sectionKey,
    sectionLabel: input.sectionLabel,
    title,
    description,
    depthLabel,
    formGate,
    document,
    tape: tape ?? null,
    assistMessages: assistTranscriptForPhase(input.response.messages, phaseId ?? ''),
    cards: applyContributionsToCards(cards, input.scored.contributions),
    packageJson: {
      sectionKey: input.sectionKey,
      hostRef,
      formGate,
      cardCount: cards.length,
      fixtureId: input.fixtureId,
      hasAnswerKey: Boolean(document.answerKey && Object.keys(document.answerKey).length > 0),
      package: pkg,
      tapeKind: tape?.kind ?? null,
      tapeEvents: tape?.events.length ?? 0,
    },
    readOnly: true,
  }
}

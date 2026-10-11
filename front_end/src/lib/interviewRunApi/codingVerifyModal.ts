/**
 * Coding Soft Decision Verify modal — tests + method marks above a run-capable editor.
 */
import type { Creator2BriefDocument } from '../interviewBrief/creator2BriefTypes'
import type { InterviewFlowCodingTestCase } from '../interviewBrief/flowTimelineTypes'
import { mapCreator2BriefToTimeline } from '../interviewBrief/mapCreator2BriefToTimeline'
import {
  firstFolderRow,
  foldersForPhase,
  foldersForTemplate,
} from '../interviewBrief/rollupFolders'
import type { SoftGradeBucket, AttemptScorePackage } from './scoreAttempt'
import { resolveGateToolMount, type GateToolMount } from './resolveGateToolMount'
import { overlayCodingMount } from './editorCapture/overlay'
import { pickEditorTape } from './editorCapture/store'
import type { EditorTape, EditorTapesPack } from './editorCapture/types'
import type { InterviewResponse, InterviewResponseMessage } from './talkTypes'
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
} from './toolVerifyShared'

export type CodingVerifyModal = {
  fixtureId: string
  sectionKey: string
  sectionLabel: string
  title: string
  description: string
  depthLabel: string
  mount: Extract<GateToolMount, { kind: 'coding' }>
  /** Assessor Run: visible + hidden cases */
  assessRunTests: {
    runner: string
    entryPoint: string
    cases: InterviewFlowCodingTestCase[]
  }
  softBuckets: {
    codingTests: SoftGradeBucket | null
    codingMethod: SoftGradeBucket | null
  }
  cards: TalkVerifyMarkingCard[]
  packageJson: unknown
  tape: EditorTape | null
  assistMessages: InterviewResponseMessage[]
  readOnly: true
  allowRun: true
}

/**
 * Build Coding Verify review modal for codingTests / codingMethod Soft Decision keys.
 * Always includes both mark.code.tests.v1 and mark.code.method.v1 above the editor.
 */
export function buildCodingVerifyModal(input: {
  fixtureId: string
  sectionKey: string
  sectionLabel: string
  response: InterviewResponse
  scored: AttemptScorePackage
  brief: Creator2BriefDocument
  tapePacks?: { live?: EditorTapesPack | null; fixture?: EditorTapesPack | null }
  /** Spine step. Omit to use the first coding stage on the brief. */
  phaseId?: string | null
}): CodingVerifyModal {
  const phaseId = resolveVerifyPhaseId(input.brief, 'coding', input.phaseId)
  if (!phaseId) {
    throw new Error('coding_verify_phase_missing')
  }
  const timeline = mapCreator2BriefToTimeline(input.brief)
  const step = timeline.steps.find((s) => s.id === phaseId)
  const resolved = resolveGateToolMount({ brief: input.brief, phaseId })
  if (resolved?.kind !== 'coding') {
    throw new Error(`coding_verify_mount_missing:${phaseId}`)
  }
  const tape = pickEditorTape({
    kind: 'coding',
    phaseId,
    live: input.tapePacks?.live,
    fixture: input.tapePacks?.fixture,
  })
  const mount = overlayCodingMount(resolved, tape)

  const tests = step?.codingEditor?.tests
  const cases = Array.isArray(tests?.cases) ? [...tests.cases] : []
  const assessRunTests = {
    runner: tests?.runner?.trim() || mount.runTests.runner || 'hidden_cases_v1',
    entryPoint: tests?.entryPoint?.trim() || mount.runTests.entryPoint || 'solve',
    cases,
  }

  const preferredHost = attemptHostRef(input.brief, phaseId, input.response)
  const testsHit = findToolGrain(input.response, 'mark.code.tests.v1', preferredHost)
  const methodHit = findToolGrain(input.response, 'mark.code.method.v1', preferredHost)
  const structureHit = findToolGrain(input.response, 'mark.code.structure.v1', preferredHost)
  const synthHit = findToolGrain(input.response, 'synth.tool.v1', preferredHost)
  const hostRef =
    preferredHost ||
    testsHit?.hostRef ||
    methodHit?.hostRef ||
    structureHit?.hostRef ||
    synthHit?.hostRef ||
    ''
  const pkg = hostRef ? findToolPackage(input.response, hostRef) : null

  const emphasizeTests = input.sectionKey === 'codingTests'
  const emphasizeMethod = input.sectionKey === 'codingMethod'

  const cards: TalkVerifyMarkingCard[] = [
    ...cardsFromToolHost(input.response, hostRef, {
      emphasizeTemplateId: emphasizeTests
        ? 'mark.code.tests.v1'
        : emphasizeMethod
          ? 'mark.code.method.v1'
          : undefined,
    }),
    ...cardsFromPackageNotes(pkg),
  ]

  const rollup = input.brief.analysis?.rollup
  const byWeight = input.scored.softGrade.byWeight
  const testsFolders = foldersForTemplate('mark.code.tests.v1', rollup)
  const methodFolders = foldersForTemplate('mark.code.method.v1', rollup)
  const phaseFolders = foldersForPhase(phaseId, rollup)
  const softBuckets = {
    codingTests:
      firstFolderRow(byWeight, testsFolders.length ? testsFolders : phaseFolders, ['codingTests']),
    codingMethod:
      firstFolderRow(byWeight, methodFolders.length ? methodFolders : phaseFolders, [
        'codingMethod',
      ]),
  }

  const title = mount.title || step?.title || 'Coding'
  const description =
    mount.instructions?.trim() ||
    step?.summary?.trim() ||
    step?.purpose?.trim() ||
    ''
  const depthLabel =
    cases.length > 0
      ? `${cases.filter((c) => !c.hidden).length} visible · ${cases.filter((c) => c.hidden).length} hidden`
      : 'Coding'

  return {
    fixtureId: input.fixtureId,
    sectionKey: input.sectionKey,
    sectionLabel: input.sectionLabel,
    title,
    description,
    depthLabel,
    mount,
    assessRunTests,
    softBuckets,
    cards: applyContributionsToCards(cards, input.scored.contributions),
    packageJson: {
      sectionKey: input.sectionKey,
      hostRef,
      softBuckets,
      assessCaseCount: cases.length,
      cardCount: cards.length,
      fixtureId: input.fixtureId,
      package: pkg,
      tapeKind: tape?.kind ?? null,
      tapeEvents: tape?.events.length ?? 0,
    },
    tape: tape ?? null,
    assistMessages: assistTranscriptForPhase(input.response.messages, phaseId),
    readOnly: true,
    allowRun: true,
  }
}

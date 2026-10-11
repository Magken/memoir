/**
 * Essay Soft Decision Verify modal — doc mark bands above a read-only writing editor.
 */
import type { Creator2BriefDocument } from '../interviewBrief/creator2BriefTypes'
import { firstFolderRow, foldersForPhase, foldersForTemplate } from '../interviewBrief/rollupFolders'
import { mapCreator2BriefToTimeline } from '../interviewBrief/mapCreator2BriefToTimeline'
import type { SoftGradeBucket, AttemptScorePackage } from './scoreAttempt'
import { resolveGateToolMount, type GateToolMount } from './resolveGateToolMount'
import { overlayDocMount } from './editorCapture/overlay'
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

export type EssayVerifyModal = {
  fixtureId: string
  sectionKey: string
  sectionLabel: string
  title: string
  description: string
  depthLabel: string
  mount: Extract<GateToolMount, { kind: 'doc' }>
  softBucket: SoftGradeBucket | null
  cards: TalkVerifyMarkingCard[]
  packageJson: unknown
  tape: EditorTape | null
  assistMessages: InterviewResponseMessage[]
  readOnly: true
  allowRun: false
}

/**
 * Build Essay Verify review modal for the essay Soft Decision key.
 */
export function buildEssayVerifyModal(input: {
  fixtureId: string
  sectionKey: string
  sectionLabel: string
  response: InterviewResponse
  scored: AttemptScorePackage
  brief: Creator2BriefDocument
  tapePacks?: { live?: EditorTapesPack | null; fixture?: EditorTapesPack | null }
  /** Spine step. Omit to use the first writing stage on the brief. */
  phaseId?: string | null
}): EssayVerifyModal {
  const phaseId = resolveVerifyPhaseId(input.brief, 'doc', input.phaseId)
  if (!phaseId) {
    throw new Error('essay_verify_phase_missing')
  }
  const timeline = mapCreator2BriefToTimeline(input.brief)
  const step = timeline.steps.find((s) => s.id === phaseId)
  const resolved = resolveGateToolMount({ brief: input.brief, phaseId })
  if (resolved?.kind !== 'doc') {
    throw new Error(`essay_verify_mount_missing:${phaseId}`)
  }
  const tape = pickEditorTape({
    kind: 'doc',
    phaseId,
    live: input.tapePacks?.live,
    fixture: input.tapePacks?.fixture,
  })
  const mount = overlayDocMount(resolved, tape)

  const preferredHost = attemptHostRef(input.brief, phaseId, input.response)
  const essayHit =
    findToolGrain(input.response, 'mark.doc.essay.v1', preferredHost) ??
    findToolGrain(input.response, 'mark.doc.brief.v1', preferredHost)
  const synthHit = findToolGrain(input.response, 'synth.tool.v1', preferredHost)
  const hostRef = preferredHost || essayHit?.hostRef || synthHit?.hostRef || ''
  const pkg = hostRef ? findToolPackage(input.response, hostRef) : null

  const cards: TalkVerifyMarkingCard[] = [
    ...cardsFromToolHost(input.response, hostRef, {
      emphasizeTemplateId: essayHit?.grain.templateId ?? 'mark.doc.essay.v1',
      lane: 'content',
    }),
    ...cardsFromPackageNotes(pkg),
  ]

  const rollup = input.brief.analysis?.rollup
  const essayFolders = foldersForTemplate(
    essayHit?.grain.templateId ?? 'mark.doc.essay.v1',
    rollup,
  )
  const phaseFolders = foldersForPhase(phaseId, rollup)
  const softBucket =
    firstFolderRow(
      input.scored.softGrade.byWeight,
      essayFolders.length ? essayFolders : phaseFolders,
      ['essay'],
    )
  const title = mount.title || step?.title || 'Writing'
  const description =
    mount.prompt.brief?.trim() ||
    mount.instructions?.trim() ||
    step?.summary?.trim() ||
    step?.purpose?.trim() ||
    ''
  const dimCount = mount.assessment.dimensions?.length ?? 0
  const depthLabel =
    dimCount > 0
      ? `${dimCount} ${dimCount === 1 ? 'criterion' : 'criteria'}`
      : 'Writing'

  return {
    fixtureId: input.fixtureId,
    sectionKey: input.sectionKey,
    sectionLabel: input.sectionLabel,
    title,
    description,
    depthLabel,
    mount,
    softBucket,
    cards: applyContributionsToCards(cards, input.scored.contributions),
    packageJson: {
      sectionKey: input.sectionKey,
      hostRef,
      softBucket,
      cardCount: cards.length,
      fixtureId: input.fixtureId,
      package: pkg,
      tapeKind: tape?.kind ?? null,
      tapeEvents: tape?.events.length ?? 0,
    },
    tape: tape ?? null,
    assistMessages: assistTranscriptForPhase(input.response.messages, phaseId),
    readOnly: true,
    allowRun: false,
  }
}

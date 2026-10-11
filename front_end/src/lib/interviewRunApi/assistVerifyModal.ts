/**
 * Conversation tab for a tool stage — Assist / Copilot peel with Talk-parity
 * per-turn utterance cards plus the stage leave rollup.
 */
import { labelTemplate } from '../interviewBrief/analysisLabels'
import type { Creator2BriefDocument } from '../interviewBrief/creator2BriefTypes'
import { assistTranscriptForPhase } from './assistChatPersist'
import { ASSIST_TURN_TEMPLATE_ID } from './assistTurnMarks'
import type { AttemptScorePackage } from './scoreAttempt'
import type { AnalysisGrainStub, InterviewResponse } from './talkTypes'
import type { TalkVerifyMarkingCard, TalkVerifyModal } from './talkVerifyModal'
import { attemptHostRef, cardsFromGrain } from './toolVerifyShared'

const ASSIST_TITLE = 'How they used Assist / Copilot'

function assistCardsFromTurn(
  messageId: string,
  grain: AnalysisGrainStub,
): TalkVerifyMarkingCard[] {
  const pending = grain.status === 'pending'
  const skipped = grain.status === 'skipped'
  const filled = grain.status === 'filled'
  if (!pending && !skipped && !filled) return []
  const base = cardsFromGrain(grain, {
    lane: 'general',
    title: ASSIST_TITLE,
    id: `utterance:${messageId}:assist`,
  })
  return base.map((card) => ({
    ...card,
    kind: 'utterance',
    anchorMessageId: messageId,
    messageIds: [messageId],
    scored: filled,
    status: grain.status,
  }))
}

export function buildAssistVerifyModal(input: {
  fixtureId: string
  sectionKey?: string
  sectionLabel: string
  response: InterviewResponse
  scored: AttemptScorePackage
  brief: Creator2BriefDocument
  phaseId: string
  hostRef?: string | null
  title?: string
  description?: string
}): TalkVerifyModal {
  const phaseId = input.phaseId.trim()
  const hostRef =
    input.hostRef?.trim() || attemptHostRef(input.brief, phaseId, input.response) || ''
  const messages = assistTranscriptForPhase(input.response.messages ?? [], phaseId)
  const cards: TalkVerifyMarkingCard[] = []

  for (const msg of messages) {
    if (msg.role !== 'candidate') continue
    const grain = input.response.analysis.turns?.[msg.id]?.[ASSIST_TURN_TEMPLATE_ID]
    if (!grain) continue
    cards.push(...assistCardsFromTurn(msg.id, grain))
  }

  const leaveGrain = hostRef
    ? input.response.analysis.tools?.[hostRef]?.[ASSIST_TURN_TEMPLATE_ID]
    : undefined
  if (leaveGrain) {
    cards.push(
      ...cardsFromGrain(leaveGrain, {
        lane: 'general',
        title: labelTemplate(ASSIST_TURN_TEMPLATE_ID) || ASSIST_TITLE,
        id: `assist-leave:${hostRef}`,
      }).map((card) => ({
        ...card,
        kind: 'general' as const,
        templateId: ASSIST_TURN_TEMPLATE_ID,
        hostRef,
      })),
    )
  }

  const candidateTurns = messages.filter((m) => m.role === 'candidate').length
  const title = input.title?.trim() || input.sectionLabel
  const depthLabel =
    candidateTurns > 0
      ? `${candidateTurns} ${candidateTurns === 1 ? 'turn' : 'turns'}`
      : 'Assist'
  const messageIds = messages.map((m) => m.id)

  return {
    fixtureId: input.fixtureId,
    sectionKey: input.sectionKey ?? 'assistUse',
    sectionLabel: input.sectionLabel,
    title,
    description: input.description?.trim() || '',
    depthLabel,
    personaName: 'Assist',
    talkSections: [
      {
        topicId: phaseId,
        phaseId,
        title,
        description: input.description?.trim() || '',
        depthLabel,
        messageIds,
      },
    ],
    messages,
    softBucket: null,
    cards,
    packageJson: {
      phaseId,
      hostRef,
      messageCount: messages.length,
      cardCount: cards.length,
      turnCards: cards.filter((c) => c.kind === 'utterance').length,
    },
  }
}

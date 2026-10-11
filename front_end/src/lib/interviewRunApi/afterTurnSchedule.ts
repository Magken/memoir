import { templateAllowsAfterTurn } from '../interviewBrief/analysisTemplateCatalog'

export type AfterTurnMode = 'none' | 'clarify' | 'answer' | 'mixed'

export type AfterTurnPlan = {
  mode: AfterTurnMode
  scoreIds: string[]
  skipIds: string[]
  turnKind: 'answer' | 'clarify'
  reason: string
}

function hasQuestionMark(text: string): boolean {
  return /\?/.test(text.trim())
}

/** Words that are not in a trailing/question sentence — the answer body. */
export function answerBodyWordCount(text: string, total: number, hasQuestion: boolean): number {
  if (!hasQuestion) return total
  const chunks = text
    .trim()
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
  const body = chunks.filter((s) => !/\?\s*$/.test(s)).join(' ')
  return body.split(/\s+/).filter(Boolean).length
}

/**
 * Which after_turn templates to fire for this utterance.
 *
 * One send can need several templates (story plus a question → delivery and
 * question together) or none (yeah / hi / off-topic). The old XOR (clarify OR
 * answer for the whole turn) dropped one of the two.
 */
export function planAfterTurnForUtterance(input: {
  pendingFirstProbe: boolean
  text: string
  wordCount: number
  situation: string
  signals: string[]
  afterTurnIds: string[]
}): AfterTurnPlan {
  const ids = input.afterTurnIds
  const skipAll = (reason: string): AfterTurnPlan => ({
    mode: 'none',
    scoreIds: [],
    skipIds: [...ids],
    turnKind: 'answer',
    reason,
  })

  if (input.pendingFirstProbe) {
    return skipAll('name_check')
  }

  const question =
    input.signals.includes('question') ||
    input.signals.includes('meta_clarify') ||
    input.signals.includes('ask_for_example') ||
    hasQuestionMark(input.text)
  const unsubstantiated =
    input.situation === 'off_topic' ||
    input.signals.includes('social_rapport') ||
    input.signals.includes('gibberish') ||
    input.signals.includes('non_answer')

  if (unsubstantiated) {
    return skipAll('unsubstantiated')
  }

  const bodyWords = answerBodyWordCount(input.text, input.wordCount, question)
  const substance =
    bodyWords > 3 || (question && input.wordCount >= 18)

  if (!substance && !question) {
    return skipAll('thin_unsubstantiated')
  }

  if (question && !substance) {
    const scoreIds = ids.filter((id) => templateAllowsAfterTurn(id, 'clarify'))
    return {
      mode: 'clarify',
      scoreIds,
      skipIds: ids.filter((id) => !scoreIds.includes(id)),
      turnKind: 'clarify',
      reason: 'question_only',
    }
  }

  if (substance && question) {
    return {
      mode: 'mixed',
      scoreIds: [...ids],
      skipIds: [],
      turnKind: 'answer',
      reason: 'substance_and_question',
    }
  }

  const scoreIds = ids.filter((id) => templateAllowsAfterTurn(id, 'answer'))
  return {
    mode: 'answer',
    scoreIds,
    skipIds: ids.filter((id) => !scoreIds.includes(id)),
    turnKind: 'answer',
    reason: 'substance_only',
  }
}

export function afterTurnSkipCopy(reason: string): string {
  if (reason === 'name_check') {
    return 'Not scored - day-1 name check (analysis applies to answers only).'
  }
  if (reason === 'unsubstantiated' || reason === 'thin_unsubstantiated') {
    return 'Not scored - unsubstantiated turn (no answer and no interview question to mark).'
  }
  if (reason === 'question_only') {
    return 'Not scored - candidate asked a question with no answer body (answer rubrics do not apply; clarify-eligible templates may still score).'
  }
  if (reason === 'substance_only') {
    return 'Not scored - answer turn (clarify-only templates do not apply).'
  }
  return 'Not scored - this template does not apply to this utterance.'
}

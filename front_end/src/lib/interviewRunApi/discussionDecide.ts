import { classifyCandidateSignals, isThinUtterance, candidateWordCount, looksContentHook } from './candidateSignals'
import { findMissingProbeGaps } from './probeGap'
import type {
  TalkContext,
  TalkDecision,
  TalkDecisionSituation,
  TalkRuntimeState,
} from './talkTypes'

function probeCap(ctx: TalkContext): number {
  const n = ctx.topic.probes.length
  const max = ctx.topic.depth.maxProbes
  if (max == null || max <= 0) return n
  return Math.min(n, max)
}

function activeProbe(ctx: TalkContext, state: TalkRuntimeState) {
  return ctx.topic.probes[state.activeProbeIndex] ?? null
}

function maybeSoftTime(ctx: TalkContext, state: TalkRuntimeState): boolean {
  const mins = ctx.topic.depth.targetMinutes
  if (mins == null || mins <= 0 || state.softTimeSent) return false
  const elapsedMin = (Date.now() - state.startedAt) / 60000
  return elapsedMin >= mins
}

function priorCandidateTexts(state: TalkRuntimeState, latest: string): string[] {
  return state.messages
    .filter((m) => m.role === 'candidate')
    .map((m) => m.text)
    .filter((t) => t.trim() && t.trim() !== latest.trim())
}

function looksLogisticsOffTopic(text: string): boolean {
  const t = text.trim().toLowerCase()
  return /\b(what is the salary|how many vacation|when do i hear back|what is the compensation|benefits package|company culture|tell me about (the )?(company|role|team|benefits)|remote work policy|how many pto|stock options|signing bonus|work from home|office location)\b/i.test(
    t,
  )
}

/**
 * Local exit-budget decide.
 * Priority: soft_time → logistics off_topic → social_rapport / gibberish /
 * non_answer → meta_clarify/ask_for_example → thin/elastic (1–3 word / no-substance) →
 * deepen (real answer + ownership) → probe_gap/follow_up → move_probe/close.
 *
 * social_rapport still clarifies (stay board-directed) but is NOT smash noise —
 * compose must meld the social beat, then soft-refocus (GAR).
 */
export function decideTalkTurn(input: {
  ctx: TalkContext
  state: TalkRuntimeState
  candidateText: string
}): TalkDecision {
  const text = input.candidateText.trim()
  const signals = classifyCandidateSignals(text)
  const probe = activeProbe(input.ctx, input.state)
  const prior = priorCandidateTexts(input.state, text)
  const gaps = findMissingProbeGaps({
    probe,
    candidateText: text,
    signals,
    ctx: input.ctx,
    priorCandidateTexts: prior,
  })
  const maxFu = input.ctx.topic.depth.maxFollowUps
  const cap = probeCap(input.ctx)
  const hasMoreProbes = input.state.activeProbeIndex + 1 < cap
  const nextProbe = hasMoreProbes
    ? input.ctx.topic.probes[input.state.activeProbeIndex + 1] ?? null
    : null

  let situation: TalkDecisionSituation = 'close'
  let nextState: TalkRuntimeState = { ...input.state }
  let nextProbeGoal: string | null = null

  const bumpFollowUp = () => {
    if (nextState.followUpsOnActiveProbe < maxFu) {
      nextState = {
        ...nextState,
        followUpsOnActiveProbe: nextState.followUpsOnActiveProbe + 1,
      }
    }
  }

  const lowSignal =
    signals.includes('gibberish') ||
    signals.includes('non_answer') ||
    signals.includes('social_rapport') ||
    signals.includes('meta_clarify') ||
    signals.includes('ask_for_example')

  if (maybeSoftTime(input.ctx, input.state)) {
    situation = 'soft_time'
    nextState = { ...nextState, softTimeSent: true }
  } else if (looksLogisticsOffTopic(text)) {
    situation = 'off_topic'
    bumpFollowUp()
  } else if (
    signals.includes('social_rapport') ||
    signals.includes('gibberish') ||
    signals.includes('non_answer')
  ) {
    situation = 'clarify'
    bumpFollowUp()
  } else if (signals.includes('meta_clarify') || signals.includes('ask_for_example')) {
    situation = 'clarify'
    bumpFollowUp()
  } else if (isThinUtterance(text, signals)) {
    // Thin stays on this probe even when follow-up budget is spent — never skip ahead.
    situation = 'clarify'
    bumpFollowUp()
  } else if (
    !lowSignal &&
    nextState.followUpsOnActiveProbe < maxFu &&
    (signals.includes('collective_we') || gaps.some((g) => g.key === 'personal_decision')) &&
    (signals.includes('substantive') ||
      candidateWordCount(text) >= 8 ||
      (looksContentHook(text) &&
        candidateWordCount(text) >= 6 &&
        signals.includes('collective_we')))
  ) {
    // Ownership deepen only when there is a real answer shape (not smash / meta / thin).
    situation = 'deepen'
    bumpFollowUp()
  } else if (
    (signals.includes('vague') || signals.includes('short') || signals.includes('question')) &&
    gaps.length >= 2 &&
    nextState.followUpsOnActiveProbe < maxFu
  ) {
    situation = 'clarify'
    bumpFollowUp()
  } else if (
    nextState.followUpsOnActiveProbe < maxFu &&
    gaps.length > 0 &&
    (signals.includes('vague') || signals.includes('short') || !signals.includes('substantive'))
  ) {
    situation = 'probe_gap'
    bumpFollowUp()
  } else if (hasMoreProbes && nextProbe) {
    situation = 'move_probe'
    nextProbeGoal = nextProbe.goal
    nextState = {
      ...nextState,
      activeProbeIndex: nextState.activeProbeIndex + 1,
      followUpsOnActiveProbe: 0,
      probesAsked: nextState.probesAsked + 1,
    }
  } else if (nextState.candidateTurns < input.ctx.topic.depth.minCandidateTurns) {
    situation = gaps.length > 0 ? 'probe_gap' : 'follow_up'
    bumpFollowUp()
  } else {
    situation = 'close'
    nextState = { ...nextState, status: 'ready_to_pass' }
  }

  const canPass = situation === 'close' || nextState.status === 'ready_to_pass'

  return {
    situation,
    missingGaps: gaps.map((g) => g.label),
    activeProbeId: probe?.id ?? null,
    nextProbeGoal,
    canPass,
    signals,
    nextState,
  }
}

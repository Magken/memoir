import type { CandidateSignal, TalkContext, TalkProbe } from './talkTypes'

export type ProbeGap = {
  key: string
  label: string
}

const GAP_PATTERNS: Array<{ key: string; label: string; needles: RegExp[] }> = [
  {
    key: 'personal_decision',
    label: 'personal decision',
    needles: [/\bi (decided|chose|owned|led|froze|blocked|escalated)\b/i],
  },
  {
    key: 'outcome_metric',
    label: 'concrete outcome or metric',
    needles: [/\b\d+(\.\d+)?%?\b/, /\b(reduced|increased|cut|improved|moved)\b/i],
  },
  {
    key: 'constraint',
    label: 'constraint or tradeoff',
    needles: [/\b(constraint|tradeoff|trade-off|deadline|budget|latency|risk)\b/i],
  },
  {
    key: 'stakeholder',
    label: 'stakeholder pushback',
    needles: [/\b(stakeholder|manager|pm|customer|partner|disagreed|pushback)\b/i],
  },
]

/**
 * Heuristic missing gaps for the active probe.
 * Uses cumulative recent candidate texts so earlier answers in the same Talk still count.
 */
export function findMissingProbeGaps(input: {
  probe: TalkProbe | null
  candidateText: string
  signals: readonly CandidateSignal[]
  ctx: TalkContext
  /** Prior candidate turns in this Talk (oldest→newest). Latest may also be in candidateText. */
  priorCandidateTexts?: readonly string[]
}): ProbeGap[] {
  const latest = input.candidateText.trim()
  if (!latest) {
    return [{ key: 'empty', label: 'any concrete answer' }]
  }

  const corpus = [...(input.priorCandidateTexts ?? []), latest].join('\n ')
  const gaps: ProbeGap[] = []
  const goal = (input.probe?.goal ?? input.ctx.opener.text).toLowerCase()

  for (const pat of GAP_PATTERNS) {
    const relevant =
      pat.key === 'personal_decision' ||
      (pat.key === 'outcome_metric' &&
        /\b(outcome|metric|result|impact|owned)\b/.test(goal)) ||
      (pat.key === 'constraint' && /\b(tradeoff|design|constraint)\b/.test(goal)) ||
      (pat.key === 'stakeholder' && /\b(stakeholder|priority|conflict)\b/.test(goal))
    if (!relevant) continue
    const hit = pat.needles.some((re) => re.test(corpus))
    if (!hit) gaps.push({ key: pat.key, label: pat.label })
  }

  if (
    input.signals.includes('gibberish') ||
    input.signals.includes('non_answer')
  ) {
    if (!gaps.some((g) => g.key === 'empty')) {
      gaps.unshift({ key: 'empty', label: 'any concrete answer' })
    }
    return gaps.slice(0, 4)
  }

  // Social thin is conversation, not smash — keep normal gap inventory (no forced gap dump).
  if (input.signals.includes('social_rapport')) {
    return gaps.slice(0, 4)
  }

  // Ownership push from latest-turn signal only (do not punish earlier "we" forever).
  if (input.signals.includes('collective_we')) {
    if (!gaps.some((g) => g.key === 'personal_decision')) {
      gaps.unshift({ key: 'personal_decision', label: 'personal decision (not we)' })
    }
  }
  if (
    (input.signals.includes('vague') || input.signals.includes('short')) &&
    !input.signals.includes('gibberish') &&
    !input.signals.includes('non_answer') &&
    !input.signals.includes('social_rapport')
  ) {
    if (!gaps.some((g) => g.key === 'outcome_metric') && /\b(outcome|owned|metric)\b/.test(goal)) {
      gaps.push({ key: 'outcome_metric', label: 'concrete outcome or metric' })
    }
  }

  return gaps.slice(0, 4)
}

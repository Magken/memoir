/**
 * Sitting work-state patterns for Clarity — observational, never diagnostic.
 * Clocks describe how the sitting ran (initiation, burst-pause, channel mix,
 * closing-window bunching, skip vs dwell). They do not add time, change Soft
 * Decision, or name a condition unless the candidate already self-reported it.
 */
import type { Creator2BriefDocument } from '../interviewBrief/creator2BriefTypes'
import type { OverviewSecurityCheck } from './fixtures/output-cards/outputCardFixture'
import type { SessionSeries, SessionSeriesPhase } from './sessionSeries'
import type { SittingDeclarationDigest } from './sittingDeclaration'
import type { SessionTelemetryDigest } from './sessionTelemetry/types'

export type ClarityPatternId =
  | 'support'
  | 'task_split'
  | 'pace_split'
  | 'time_pressure'
  | 'focus_share'
  | 'start_latency'
  | 'burst_idle'
  | 'cadence_spread'
  | 'channel_by_stage'
  | 'talk_gaps'
  | 'follow_thin'
  | 'order_drift'
  | 'leave_mid'
  | 'paste_edit'
  | 'run_after_idle'
  | 'assist_loop'
  | 'file_hops'
  | 'dwell_vs_leftover'
  | 'reconnect_timed'

export type ClarityPatternTape = {
  phaseId: string
  hopCount: number
  pasteCount: number
  applyCount: number
  runCount: number
  idleMs: number
  activeMs: number
  durationMs: number
}

export type ClarityPatternTalk = {
  phaseId: string
  candidateTurns: number
  topicJumps: number
  medianGapMs: number
}

export type ClarityPatternLeftover = {
  phaseId: string
  status: string
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`
}

function signalFor(unit: number): OverviewSecurityCheck['signal'] {
  if (unit >= 0.66) return 'good'
  if (unit >= 0.4) return 'watch'
  return 'bad'
}

function isTimedPhase(brief: Creator2BriefDocument, phaseId: string): boolean {
  const phase = brief.phases.find((p) => p.id === phaseId)
  const tool = phase?.toolRef ? brief.tools?.[phase.toolRef] : undefined
  return tool?.timing?.mode === 'timed'
}

function dwellShares(series: SessionSeries): Array<{
  phaseId: string
  title: string
  share: number
  visibleMs: number
}> {
  const rows = series.byPhase.map((p) => ({
    phaseId: p.phaseId,
    title: p.title,
    visibleMs: p.dwell.visibleMs,
  }))
  const total = rows.reduce((s, r) => s + r.visibleMs, 0)
  if (total <= 0) return rows.map((r) => ({ ...r, share: 0 }))
  return rows.map((r) => ({ ...r, share: r.visibleMs / total }))
}

function lateWindowSurge(phase: SessionSeriesPhase): {
  observed: boolean
  lateRate: number
  earlyRate: number
  lateShare: number
} {
  const buckets = phase.cadence.buckets ?? []
  const duration = Math.max(1, phase.durationMs)
  const cut = duration * 0.8
  let earlyTicks = 0
  let lateTicks = 0
  let earlyMs = 0
  let lateMs = 0
  for (const b of buckets) {
    const span = Math.max(0, b.t1 - b.t0)
    const mid = (b.t0 + b.t1) / 2
    if (mid >= cut) {
      lateTicks += b.tickCount
      lateMs += span
    } else {
      earlyTicks += b.tickCount
      earlyMs += span
    }
  }
  const earlyRate = earlyMs > 0 ? earlyTicks / earlyMs : 0
  const lateRate = lateMs > 0 ? lateTicks / lateMs : 0
  const lateShare = earlyTicks + lateTicks > 0 ? lateTicks / (earlyTicks + lateTicks) : 0
  const observed = lateTicks >= 4 && lateRate > earlyRate * 1.55 && lateShare >= 0.28
  return { observed, lateRate, earlyRate, lateShare }
}

function idleShareOf(phase: SessionSeriesPhase): number {
  const idle = phase.cadence.buckets.reduce((s, b) => s + b.idleMs, 0)
  return idle / Math.max(1, phase.durationMs)
}

function supportCheck(declaration: SittingDeclarationDigest): OverviewSecurityCheck {
  const noAdvantage =
    'This note does not add minutes, extra Assist, extra marks, or an overall-score bump. The timer still ended when it ended. Staff use it to see why clocks look this way.'
  if (declaration.empty) {
    return {
      id: 'support',
      check: 'Support note',
      reading: 'not observed',
      note:
        'No self-report is on file. The clocks below are still observations (time mix, spoken versus typed, closing-window activity, start delay, idle bursts). They are not a medical reading and must not be used to invent a condition.',
      signal: 'good',
    }
  }
  if (declaration.preferNotToSay) {
    return {
      id: 'support',
      check: 'Support note',
      reading: 'prefer not to say',
      note: `The candidate asked staff not to record a named condition. Timed-stage speed, last-minute surges, and spoken-versus-typed mix still read as work-state. ${noAdvantage}`,
      signal: 'good',
    }
  }
  const asked = [...declaration.labels, ...declaration.helps].filter(Boolean)
  const noteBits = [
    asked.length ? `The candidate volunteered: ${asked.join('; ')}.` : 'A support note is on file.',
    noAdvantage,
    'Quote it as self-report, not as a diagnosis. Do not skip a clock because of it.',
    declaration.notes ? `Their words: ${declaration.notes}` : '',
  ]
  return {
    id: 'support',
    check: 'Support note',
    reading: 'on file',
    note: noteBits.filter(Boolean).join(' '),
    signal: 'good',
  }
}

function taskSplitCheck(series: SessionSeries): OverviewSecurityCheck {
  const shares = dwellShares(series).filter((r) => r.visibleMs > 0)
  if (shares.length < 2) {
    return {
      id: 'task_split',
      check: 'Task mix',
      reading: 'not observed',
      note:
        'There was not enough on-stage time across two stages to compare how time was split. A single-stage attempt cannot show whether one problem took most of the time.',
      signal: 'watch',
    }
  }
  const ranked = [...shares].sort((a, b) => b.share - a.share)
  const top = ranked[0]!
  const rest = ranked.slice(1)
  const restPct = rest.map((r) => `${r.title} ${pct(r.share)}`).join(', ')
  const concentrated = top.share >= 0.55
  return {
    id: 'task_split',
    check: 'Task mix',
    reading: `${top.title} ${pct(top.share)}`,
    note: concentrated
      ? `On-stage time concentrated on ${top.title} (${pct(top.share)}). Other stages: ${restPct}. That can be deep work on the stage that mattered, a hard time switching away, or the other briefs simply taking less clock. Read the notes on the thinner stages before calling it neglect. Do not treat a lopsided time share as a clinical sign.`
      : `On-stage time was spread: ${ranked.map((r) => `${r.title} ${pct(r.share)}`).join(', ')}. No single stage took most of the time. Still check whether the thinner stages were skipped or just faster.`,
    signal: concentrated ? 'watch' : 'good',
  }
}

function paceSplitCheck(
  series: SessionSeries,
  telemetry: SessionTelemetryDigest,
): OverviewSecurityCheck {
  const dictationMs = series.byPhase.reduce((s, p) => s + p.dictation.totalMs, 0)
  const typedWords = telemetry.typedWords ?? 0
  const typedWpm = telemetry.typedWpm
  const talkSends = series.byPhase.reduce((s, p) => s + p.talk.sendCount, 0)
  if (!dictationMs && !typedWords && talkSends < 2) {
    return {
      id: 'pace_split',
      check: 'Spoken vs typed',
      reading: 'not observed',
      note:
        'There were no typed bursts and no dictation sessions. Spoken compose cannot be compared with keystroke work on this interview.',
      signal: 'watch',
    }
  }
  const spokenHeavy = dictationMs >= 20_000 && typedWords < 8
  const typedHeavy = typedWords >= 12 && dictationMs < 4_000
  const mix = !spokenHeavy && !typedHeavy && (dictationMs > 0 || typedWords > 0)
  const wpmBit = typedWpm != null ? ` Typed WPM ${typedWpm} (keystrokes only; paste and dictation excluded).` : ''
  const dictBit = dictationMs
    ? ` Dictation clocks total ${Math.round(dictationMs / 1000)}s.`
    : ' No dictation session ran.'
  const talkBit = talkSends ? ` Talk had ${talkSends} candidate send${talkSends === 1 ? '' : 's'}.` : ''
  let note =
    `Compare channels, not a medical label.${wpmBit}${dictBit}${talkBit} ` +
    'A writing-heavy stage that is spoken while a coding stage is typed is a work-path split. Written throughput often lags spoken thinking when they compose by speech; that is a reason to read WPM against the brief, not a diagnosis from WPM, and not a reason to add time.'
  if (spokenHeavy) {
    note =
      `Work leaned on spoken compose (${Math.round(dictationMs / 1000)}s of dictation) with little committed typing (${typedWords} words).` +
      ` ${note} If they told staff they compose by speaking, this is the path the tape shows. It did not extend the clock.`
  } else if (typedHeavy) {
    note =
      `Work leaned on keystrokes (${typedWords} typed words)${wpmBit}${dictBit}${talkBit} ` +
      'Spoken and typed speeds are not interchangeable. Do not infer a condition from a fast or slow WPM alone.'
  } else if (mix) {
    note =
      `The sitting used more than one channel.${wpmBit}${dictBit}${talkBit} ` +
      'Look at which stage used which channel before calling one of them avoidance.'
  }
  return {
    id: 'pace_split',
    check: 'Spoken vs typed',
    reading: spokenHeavy
      ? 'mostly spoken'
      : typedHeavy
        ? 'mostly typed'
        : mix
          ? 'spoken and typed'
          : 'too little to read',
    note,
    signal: spokenHeavy || typedHeavy ? 'watch' : 'good',
  }
}

function timePressureCheck(brief: Creator2BriefDocument, series: SessionSeries): OverviewSecurityCheck {
  const timed = series.byPhase.filter((p) => isTimedPhase(brief, p.phaseId) && p.durationMs > 8_000)
  if (!timed.length) {
    return {
      id: 'time_pressure',
      check: 'Closing-window pace',
      reading: 'not observed',
      note:
        'No timed tool stage ran long enough to compare the last fifth of the clock with the rest. Untimed work does not produce a last-minute surge reading. A visible hard timer still ended when it ended.',
      signal: 'watch',
    }
  }
  const surges = timed
    .map((p) => ({ phase: p, surge: lateWindowSurge(p) }))
    .filter((row) => row.surge.observed)
  if (!surges.length) {
    const sample = timed[0]!
    return {
      id: 'time_pressure',
      check: 'Closing-window pace',
      reading: 'no late bunch',
      note: `Timed stage ${sample.title} did not show a late spike in editor ticks relative to the first 80% of that tape. Activity was not piled into the closing window. That does not prove they were unhurried in their head. It only means the tape did not bunch work at the wall-clock. The timer was not extended.`,
      signal: 'good',
    }
  }
  const named = surges
    .map((row) => `${row.phase.title} (${pct(row.surge.lateShare)} of ticks in the last fifth)`)
    .join('; ')
  return {
    id: 'time_pressure',
    check: 'Closing-window pace',
    reading: 'late surge',
    note: `Editor activity bunched at the end of timed work: ${named}. Under a visible hard timer, a last-window surge can be deadline focus, time-blindness-style catch-up, or simply finishing after thinking. Timed assessments often measure how fast someone processes the prompt as much as the skill on the brief. Report the bunching. Do not add minutes. Do not change the overall score because of it. If they self-reported that timed work can bunch at the end, put that sentence next to this clock so a human marker can see both.`,
    signal: 'watch',
  }
}

function focusShareCheck(series: SessionSeries): OverviewSecurityCheck {
  const shares = dwellShares(series)
  const top = [...shares].sort((a, b) => b.share - a.share)[0]
  const tool = series.byPhase.find((p) => p.kind !== 'talk')
  if (!top || top.visibleMs <= 0) {
    return {
      id: 'focus_share',
      check: 'Focus vs switch',
      reading: 'not observed',
      note: 'No on-stage dwell to say whether they stayed with one problem or hopped.',
      signal: 'watch',
    }
  }
  const idleShare = tool ? idleShareOf(tool) : 0
  const stuck = top.share >= 0.6
  const scatter = shares.filter((s) => s.visibleMs > 0).length >= 3 && top.share < 0.4
  let note = `Largest on-stage share: ${top.title} (${pct(top.share)}).`
  if (stuck) {
    note +=
      ' A long stay on one stage can be follow-through or a hard switch cost. Hyperfocus-style absorption is reported in workplaces as both a productivity burst and a missed hand-off. Name the stage and what shipped there. Do not diagnose from dwell.'
  } else if (scatter) {
    note +=
      ' Time was split across several stages without one dominant stretch. That can be even coverage or difficulty settling. Check leftover quality on each stage before calling it scatter.'
  } else {
    note += ' Dwell was neither a single-stage lock nor a thin sprinkle. Read hops and idle on the tool tapes beside this share.'
  }
  if (idleShare > 0.4) {
    note += ` About ${pct(idleShare)} of the sampled tool tape was idle. Idle is idle - a pause, a reread, or a break - not coded work.`
  }
  return {
    id: 'focus_share',
    check: 'Focus vs switch',
    reading: stuck
      ? `held ${top.title}`
      : scatter
        ? `split across ${shares.filter((s) => s.visibleMs > 0).length} stages`
        : pct(top.share),
    note,
    signal: stuck || scatter ? 'watch' : signalFor(1 - Math.abs(top.share - 0.45)),
  }
}

function startLatencyCheck(series: SessionSeries): OverviewSecurityCheck {
  const tool = series.byPhase.filter((p) => p.kind !== 'talk' && p.durationMs > 8_000 && p.cadence.buckets.length)
  if (!tool.length) {
    return {
      id: 'start_latency',
      check: 'Time to first ticks',
      reading: 'not observed',
      note: 'No tool tape long enough to say how long it took to start editing after the stage opened.',
      signal: 'watch',
    }
  }
  const rows = tool.map((p) => {
    const first = p.cadence.buckets.find((b) => b.tickCount >= 2)
    const latency = first ? first.t0 / Math.max(1, p.durationMs) : 1
    return { title: p.title, latency, t0: first?.t0 ?? p.durationMs }
  })
  const slow = rows.filter((r) => r.latency >= 0.22)
  const fastest = [...rows].sort((a, b) => a.latency - b.latency)[0]!
  if (!slow.length) {
    return {
      id: 'start_latency',
      check: 'Time to first ticks',
      reading: `prompt on ${fastest.title}`,
      note: `Editor ticks started early on ${fastest.title} (${Math.round(fastest.t0 / 1000)}s into that tape). Getting started is often the hard part on attention-difference sittings; this tape did not show a long wait to first keystrokes. That is not proof of ease. It is the clock.`,
      signal: 'good',
    }
  }
  const named = slow
    .map((r) => `${r.title} (${Math.round(r.t0 / 1000)}s / ${pct(r.latency)} of that stage before sustained ticks)`)
    .join('; ')
  return {
    id: 'start_latency',
    check: 'Time to first ticks',
    reading: 'slow start',
    note: `Sustained editor ticks arrived late: ${named}. Task initiation (sitting down to the first real edit) is a common work-state complaint and is not the same as skill. The stage still used the authored minutes. Do not add time because the start was slow. Check whether the later tape recovered.`,
    signal: 'watch',
  }
}

function burstIdleCheck(series: SessionSeries): OverviewSecurityCheck {
  const tool = series.byPhase.filter((p) => p.kind !== 'talk' && p.durationMs > 8_000)
  if (!tool.length) {
    return {
      id: 'burst_idle',
      check: 'Burst vs idle',
      reading: 'not observed',
      note: 'No tool tape long enough to compare idle stretches with clustered ticks.',
      signal: 'watch',
    }
  }
  const rows = tool.map((p) => {
    const ticks = p.cadence.buckets.reduce((s, b) => s + b.tickCount, 0)
    const max = Math.max(0, ...p.cadence.buckets.map((b) => b.tickCount))
    const cluster = ticks > 0 ? max / ticks : 0
    const idle = idleShareOf(p)
    return { title: p.title, idle, cluster, ticks }
  })
  const burst = rows.filter((r) => r.ticks >= 8 && r.idle >= 0.28 && r.cluster >= 0.45)
  if (!burst.length) {
    const sample = rows[0]!
    return {
      id: 'burst_idle',
      check: 'Burst vs idle',
      reading: 'even typing',
      note: `${sample.title} idle share ${pct(sample.idle)}, densest bucket ${pct(sample.cluster)} of ticks. Work was not a long wait then a dump. Burst-pause (wait-mode then a flurry) is a reported work rhythm; this tape did not show it clearly.`,
      signal: 'good',
    }
  }
  const named = burst
    .map((r) => `${r.title} (idle ${pct(r.idle)}, ${pct(r.cluster)} of ticks in the densest slice)`)
    .join('; ')
  return {
    id: 'burst_idle',
    check: 'Burst vs idle',
    reading: 'bursts then pauses',
    note: `Work arrived in clusters with long idle between: ${named}. That can be thinking, rereading, a quiet reset, or wait-mode then a flurry. Idle stays idle - do not call it coding. A human marker should look at what shipped in the dense slices, not average the empty ones into a skill score. The interview was not paused for them.`,
    signal: 'watch',
  }
}

function cadenceSpreadCheck(series: SessionSeries): OverviewSecurityCheck {
  const tool = series.byPhase.filter(
    (p) => p.kind !== 'talk' && p.cadence.tickCount >= 12 && p.cadence.medianGapMs > 0,
  )
  if (!tool.length) {
    return {
      id: 'cadence_spread',
      check: 'Keystroke rhythm',
      reading: 'not observed',
      note: 'There were not enough non-dictation ticks to compare median gap with the long tail. Uneven motor or processing pace cannot be read from this interview.',
      signal: 'watch',
    }
  }
  const rows = tool.map((p) => ({
    title: p.title,
    median: p.cadence.medianGapMs,
    p95: p.cadence.p95GapMs,
    ratio: p.cadence.p95GapMs / Math.max(1, p.cadence.medianGapMs),
  }))
  const wide = rows.filter((r) => r.ratio >= 2.5)
  const sample = [...rows].sort((a, b) => b.ratio - a.ratio)[0]!
  if (!wide.length) {
    return {
      id: 'cadence_spread',
      check: 'Keystroke rhythm',
      reading: `${Math.round(sample.median / 100) / 10}s median`,
      note: `${sample.title} median gap ${Math.round(sample.median)}ms, p95 ${Math.round(sample.p95)}ms (${sample.ratio.toFixed(1)}x). Rhythm was relatively even. A smooth gap is not proof of fluency and a wide gap is not a motor diagnosis. Paste and dictation are excluded from this reading when the tape marks them.`,
      signal: 'good',
    }
  }
  const named = wide
    .map(
      (r) =>
        `${r.title} (median ${Math.round(r.median)}ms, p95 ${Math.round(r.p95)}ms, ${r.ratio.toFixed(1)}x)`,
    )
    .join('; ')
  return {
    id: 'cadence_spread',
    check: 'Keystroke rhythm',
    reading: 'stop-start typing',
    note: `Keystroke gaps stretched on: ${named}. A long tail next to a short median is stop-start typing - searching, correcting, or motor sequencing - not a WPM headline. Dyslexia and dyspraxia guidance often notes slower or lumpier written throughput than spoken thinking. Quote the gaps. Do not name a condition from them.`,
    signal: 'watch',
  }
}

function channelByStageCheck(series: SessionSeries): OverviewSecurityCheck {
  const rows = series.byPhase.map((p) => ({
    title: p.title,
    dictationMs: p.dictation.totalMs,
    talkSends: p.talk.sendCount,
    ticks: p.cadence.tickCount,
  }))
  const spoken = rows.filter((r) => r.dictationMs >= 8_000 || r.talkSends >= 3)
  const typed = rows.filter((r) => r.ticks >= 8 && r.dictationMs < 4_000)
  if (spoken.length + typed.length < 2) {
    return {
      id: 'channel_by_stage',
      check: 'Channel by stage',
      reading: 'not observed',
      note: 'It is not possible to tell which stage used speech and which used keystrokes. That would need dictation or Conversation sends on one stage and editor ticks on another.',
      signal: 'watch',
    }
  }
  const spokenBit = spoken.map((r) => r.title).join(', ') || 'none'
  const typedBit = typed.map((r) => r.title).join(', ') || 'none'
  const split = spoken.some((s) => typed.some((t) => t.title !== s.title))
  return {
    id: 'channel_by_stage',
    check: 'Channel by stage',
    reading: split ? 'speech and typing split' : 'same on each stage',
    note: split
      ? `Spoken or Conversation-heavy: ${spokenBit}. Keystroke-heavy: ${typedBit}. An oral/written split is a classic literacy-difference observation (ideas out loud, slower on the page). It is also just how someone chose to work this brief. Name the stages. Do not score one channel as the real answer and the other as avoidance.`
      : `Stages used a similar channel (spoken ${spokenBit}; typed ${typedBit}). Still read leftover on each stage; a single channel is not a cleanliness score.`,
    signal: split ? 'watch' : 'good',
  }
}

function talkGapsCheck(
  series: SessionSeries,
  talk: ClarityPatternTalk[] | undefined,
): OverviewSecurityCheck {
  const phases = series.byPhase.filter((p) => p.talk.sendCount >= 3 || (p.talk.gapsMs?.length ?? 0) >= 2)
  const atlasTalk = talk?.filter((t) => t.candidateTurns >= 3) ?? []
  if (!phases.length && !atlasTalk.length) {
    return {
      id: 'talk_gaps',
      check: 'Conversation think-time',
      reading: 'not observed',
      note: 'Too few candidate Talk sends to compare think-time between turns. A long pause before a send can be processing, not evasion.',
      signal: 'watch',
    }
  }
  const fromSeries = phases.map((p) => {
    const gaps = p.talk.gapsMs ?? []
    const max = Math.max(0, ...gaps)
    const med = p.talk.medianGapMs
    return { title: p.title, max, med, sends: p.talk.sendCount, jumps: 0 }
  })
  const fromAtlas = atlasTalk.map((t) => {
    const phase = series.byPhase.find((p) => p.phaseId === t.phaseId)
    return {
      title: phase?.title ?? t.phaseId,
      max: t.medianGapMs,
      med: t.medianGapMs,
      sends: t.candidateTurns,
      jumps: t.topicJumps,
    }
  })
  const rows = fromSeries.length ? fromSeries : fromAtlas
  const long = rows.filter((r) => r.med >= 8_000 || (r.max > 0 && r.max >= r.med * 3 && r.med >= 3_000))
  const jumps = (talk ?? []).reduce((s, t) => s + t.topicJumps, 0)
  const jumpBit =
    jumps > 0
      ? ` Topic jumps across Talk: ${jumps}. A jump can be follow-through on a new probe or difficulty holding one thread.`
      : ''
  if (!long.length) {
    const sample = rows[0]!
    return {
      id: 'talk_gaps',
      check: 'Conversation think-time',
      reading: `${Math.round(sample.med / 100) / 10}s median`,
      note: `${sample.title} had ${sample.sends} candidate sends, median gap ${Math.round(sample.med / 100) / 10}s. Turns arrived without a long freeze. That is not a fluency diagnosis.${jumpBit}`,
      signal: 'good',
    }
  }
  const named = long
    .map((r) => `${r.title} (median ${Math.round(r.med / 100) / 10}s${r.max > r.med ? `, longest ${Math.round(r.max / 1000)}s` : ''})`)
    .join('; ')
  return {
    id: 'talk_gaps',
    check: 'Conversation think-time',
    reading: 'long pause',
    note: `Candidate Talk had long think-time between sends: ${named}. Processing before speech is ordinary. It can also look like stall if a marker only counts send count. Read what landed in the send, not the silence. The Talk soft clock was not extended.${jumpBit}`,
    signal: 'watch',
  }
}

function followThinCheck(
  brief: Creator2BriefDocument,
  series: SessionSeries,
  leftover: ClarityPatternLeftover[] | undefined,
  completedPhaseIds: string[] | undefined,
  skippedPhaseIds: string[] | undefined,
): OverviewSecurityCheck {
  const skipped = new Set(skippedPhaseIds ?? [])
  const completed = new Set(completedPhaseIds ?? [])
  const shares = dwellShares(series)
  const thin = shares.filter((r) => r.visibleMs > 0 && r.share > 0 && r.share < 0.12)
  const forfeited = brief.phases.filter((p) => skipped.has(p.id)).map((p) => p.title)
  const open = brief.phases.filter((p) => !skipped.has(p.id) && !completed.has(p.id)).map((p) => p.title)
  const filled = new Set((leftover ?? []).filter((r) => r.status === 'filled').map((r) => r.phaseId))
  const thinUnfilled = thin.filter((r) => leftover?.length && !filled.has(r.phaseId))
  if (!forfeited.length && !open.length && !thin.length) {
    return {
      id: 'follow_thin',
      check: 'Finish vs thin stages',
      reading: 'not observed',
      note: 'No skip list, no open stages, and no thin time share to compare with the notes they left. It is not possible to say whether a stage was abandoned or simply fast.',
      signal: 'watch',
    }
  }
  const bits: string[] = []
  if (forfeited.length) bits.push(`They forfeited ${forfeited.join(', ')}.`)
  if (open.length) bits.push(`They left ${open.join(', ')} open.`)
  if (thin.length) {
    bits.push(
      `Thin on-stage time: ${thin.map((r) => `${r.title} ${pct(r.share)}`).join(', ')}.`,
    )
  }
  if (thinUnfilled.length) {
    bits.push(
      `Those thin stages also lack notes a marker can read (${thinUnfilled.map((r) => r.title).join(', ')}). Time was not spent and little was left for a marker.`,
    )
  }
  bits.push(
    'A skipped or thin stage can be a hard switch, a timer running out on a prior stage, or a choice. It is not a diagnosis. The overall score still uses the authored grades, not this clock.',
  )
  const watch = forfeited.length > 0 || thinUnfilled.length > 0
  return {
    id: 'follow_thin',
    check: 'Finish vs thin stages',
    reading: forfeited.length
      ? `forfeit ${forfeited.length}`
      : thin.length
        ? 'thin leftover'
        : 'stages still open',
    note: bits.join(' '),
    signal: watch ? 'watch' : 'good',
  }
}

function orderDriftCheck(
  brief: Creator2BriefDocument,
  completedPhaseIds: string[] | undefined,
): OverviewSecurityCheck {
  const authored = brief.phases.map((p) => p.id)
  const closed = (completedPhaseIds ?? []).filter((id) => authored.includes(id))
  if (closed.length < 2) {
    return {
      id: 'order_drift',
      check: 'Stage order vs authored',
      reading: 'not observed',
      note: 'There were not enough completed stages to compare visit order with the order they were given.',
      signal: 'watch',
    }
  }
  let holes = 0
  for (let i = 1; i < closed.length; i++) {
    const a = authored.indexOf(closed[i - 1]!)
    const b = authored.indexOf(closed[i]!)
    if (b > a + 1) holes += 1
    if (b < a) holes += 1
  }
  if (!holes) {
    return {
      id: 'order_drift',
      check: 'Stage order vs authored',
      reading: 'as authored',
      note: `They completed ${closed.length} stages in the order they were given. Continuity here is that order, not a flexibility score.`,
      signal: 'good',
    }
  }
  return {
    id: 'order_drift',
    check: 'Stage order vs authored',
    reading: `${holes} jump${holes === 1 ? '' : 's'}`,
    note: `Completed order drifted from the order they were given (${holes} jump${holes === 1 ? '' : 's'}). A skip then a later stage can be the harness moving them on, or difficulty returning to an unfinished brief. Name which titles moved. Do not read jumps as a clinical sign.`,
    signal: 'watch',
  }
}

function leaveMidCheck(series: SessionSeries): OverviewSecurityCheck {
  const rows = series.byPhase
    .map((p) => ({
      title: p.title,
      leaves: p.dwell.leaves.filter((l) => l.kind === 'hidden' || l.kind === 'leave'),
    }))
    .filter((r) => r.leaves.length)
  if (!rows.length) {
    return {
      id: 'leave_mid',
      check: 'Tab-hide mid-stage',
      reading: 'not observed',
      note: 'No tab-hide leave clocks on these stages. Pointer leaving the editor for the brief, Run, Assist, or a referenced-section view modal is not a leave.',
      signal: 'good',
    }
  }
  const named = rows.map((r) => `${r.title} (${r.leaves.length})`).join('; ')
  return {
    id: 'leave_mid',
    check: 'Tab-hide mid-stage',
    reading: `${rows.reduce((s, r) => s + r.leaves.length, 0)} tab-hide`,
    note: `The tab hid mid-stage: ${named}. That can be a break, another window, or attention leaving the interview. It is already a Security leave incident when tagged hidden. Clarity only notes that work was interrupted. It does not pause or extend the timer.`,
    signal: 'watch',
  }
}

function pasteEditCheck(
  series: SessionSeries,
  tapes: ClarityPatternTape[] | undefined,
): OverviewSecurityCheck {
  const fromEvents = series.byPhase.map((p) => {
    const pasteAt = p.events.filter((e) => e.kind === 'paste').map((e) => e.t)
    const lastTick = Math.max(0, ...p.cadence.buckets.map((b) => (b.tickCount > 0 ? b.t1 : 0)))
    const lastPaste = Math.max(0, ...pasteAt)
    const editedAfter = pasteAt.some((t) => lastTick > t + 2_000)
    return { title: p.title, pastes: pasteAt.length, editedAfter, lastPaste, lastTick }
  })
  const fromTapes = (tapes ?? []).map((t) => {
    const phase = series.byPhase.find((p) => p.phaseId === t.phaseId)
    return {
      title: phase?.title ?? t.phaseId,
      pastes: t.pasteCount,
      editedAfter: t.activeMs > 4_000 && t.pasteCount > 0,
      lastPaste: 0,
      lastTick: t.durationMs,
    }
  })
  const rows = fromEvents.some((r) => r.pastes) ? fromEvents : fromTapes
  const withPaste = rows.filter((r) => r.pastes > 0)
  if (!withPaste.length) {
    return {
      id: 'paste_edit',
      check: 'Paste then edit',
      reading: 'no paste',
      note: 'There were no paste events on the tool recordings. Authorship versus a dump cannot be read from paste clocks on this interview.',
      signal: 'good',
    }
  }
  const dumped = withPaste.filter((r) => !r.editedAfter)
  const edited = withPaste.filter((r) => r.editedAfter)
  if (edited.length && !dumped.length) {
    return {
      id: 'paste_edit',
      check: 'Paste then edit',
      reading: 'paste then ticks',
      note: `Paste landed on ${edited.map((r) => r.title).join(', ')} and editor ticks continued after. That can be a snippet they then owned, or Copilot apply they patched. Read the later ticks, not the paste count alone.`,
      signal: 'good',
    }
  }
  return {
    id: 'paste_edit',
    check: 'Paste then edit',
    reading: dumped.length ? 'paste near end' : 'paste seen',
    note: dumped.length
      ? `Paste on ${dumped.map((r) => `${r.title} (${r.pastes})`).join(', ')} with little editor activity after. That can be a dump at the wall-clock or a last insert. Security already counts paste. Clarity notes whether they stayed with the text. A dump is not extra time and not a diagnosis.`
      : `Paste counts: ${withPaste.map((r) => `${r.title} ${r.pastes}`).join(', ')}. Check whether later ticks own the insert.`,
    signal: dumped.length ? 'watch' : 'good',
  }
}

function runAfterIdleCheck(series: SessionSeries, tapes: ClarityPatternTape[] | undefined): OverviewSecurityCheck {
  const coding = series.byPhase.filter((p) => p.kind === 'coding' || p.events.some((e) => e.kind === 'run'))
  const tapeRuns = (tapes ?? []).filter((t) => t.runCount > 0)
  if (!coding.length && !tapeRuns.length) {
    return {
      id: 'run_after_idle',
      check: 'Runs after idle',
      reading: 'not observed',
      note: 'No coding Run clocks. Cannot say whether they tested after a stall or ran in a tight loop.',
      signal: 'watch',
    }
  }
  const afterIdle = coding.filter((p) => {
    const runs = p.events.filter((e) => e.kind === 'run').map((e) => e.t)
    if (!runs.length) return false
    return p.cadence.buckets.some((b) => b.idleMs >= 4_000 && runs.some((t) => t >= b.t1 && t <= b.t1 + 8_000))
  })
  const runBits = [
    ...new Set(
      [
        ...coding.map((p) => {
          const n = p.events.filter((e) => e.kind === 'run').length
          return n ? `${p.title} ${n} run${n === 1 ? '' : 's'}` : ''
        }),
        ...tapeRuns.map((t) => {
          const phase = series.byPhase.find((p) => p.phaseId === t.phaseId)
          return `${phase?.title ?? t.phaseId} ${t.runCount} run${t.runCount === 1 ? '' : 's'}`
        }),
      ].filter(Boolean),
    ),
  ]
  if (!afterIdle.length) {
    return {
      id: 'run_after_idle',
      check: 'Runs after idle',
      reading: runBits[0] ?? 'runs',
      note: `Runs on the tape: ${runBits.join('; ') || 'none counted on events'}. They were not clearly parked after a long idle slice. Tight run loops can be checking; sparse runs after thinking can be the same skill. Do not treat run count as confidence.`,
      signal: 'good',
    }
  }
  return {
    id: 'run_after_idle',
    check: 'Runs after idle',
    reading: 'run after stall',
    note: `A Run landed shortly after an idle slice on ${afterIdle.map((p) => p.title).join(', ')}. That can be "think then check" or "stuck then try it". ${runBits.join('; ')}. Name the stall and the run. Do not score runs as panic.`,
    signal: 'watch',
  }
}

function assistLoopCheck(
  assistApplyCount: number | undefined,
  assistTurnCount: number | undefined,
): OverviewSecurityCheck {
  const applies = assistApplyCount ?? 0
  const turns = assistTurnCount ?? 0
  if (!applies && turns < 2) {
    return {
      id: 'assist_loop',
      check: 'Assist loop',
      reading: 'not observed',
      note: 'There were no Assist turns and no Copilot applies. How they used Assist cannot be described on this interview.',
      signal: 'good',
    }
  }
  if (applies >= 3 && turns > 0 && applies >= turns) {
    return {
      id: 'assist_loop',
      check: 'Assist loop',
      reading: `${applies} applies / ${turns} turns`,
      note: `Copilot apply count (${applies}) is high relative to Assist turns (${turns}). That can be using Assist as a patch mill. Assist judgment still scores the asks. This check only notes the loop. A support note does not unlock extra Assist.`,
      signal: 'watch',
    }
  }
  return {
    id: 'assist_loop',
    check: 'Assist loop',
    reading: `${turns} turn${turns === 1 ? '' : 's'} · ${applies} apply`,
    note: `Assist had ${turns} scored turn${turns === 1 ? '' : 's'} and ${applies} Copilot apply${applies === 1 ? '' : 's'}. Pointed asks versus dump-and-apply still live on the Assist mark. Clarity only notes volume so a marker can see whether they leaned on Assist.`,
    signal: turns >= 6 ? 'watch' : 'good',
  }
}

function fileHopsCheck(series: SessionSeries, tapes: ClarityPatternTape[] | undefined): OverviewSecurityCheck {
  const rows = (tapes ?? [])
    .filter((t) => t.hopCount > 0)
    .map((t) => ({
      title: series.byPhase.find((p) => p.phaseId === t.phaseId)?.title ?? t.phaseId,
      hops: t.hopCount,
    }))
  if (!rows.length) {
    return {
      id: 'file_hops',
      check: 'Files touched',
      reading: 'not observed',
      note: 'No files-touched count on the tool tapes. Cannot say whether they stayed in one file or hopped the tree.',
      signal: 'watch',
    }
  }
  const busy = rows.filter((r) => r.hops >= 4)
  const totalHops = rows.reduce((s, r) => s + r.hops, 0)
  const named = rows.map((r) => `${r.title} ${r.hops} file${r.hops === 1 ? '' : 's'}`).join('; ')
  if (!busy.length) {
    return {
      id: 'file_hops',
      check: 'Files touched',
      reading: `${totalHops} files`,
      note: `Files touched: ${named}. A small set can be follow-through on the file that mattered. It is not proof they ignored the rest of the tree.`,
      signal: 'good',
    }
  }
  return {
    id: 'file_hops',
    check: 'Files touched',
    reading: `${totalHops} files`,
    note: `Several files were touched: ${named}. Hopping can be exploring, searching, or difficulty settling on one edit. Read what shipped in the last snapshots, not the hop count as scatter.`,
    signal: 'watch',
  }
}

function dwellVsLeftoverCheck(
  series: SessionSeries,
  leftover: ClarityPatternLeftover[] | undefined,
): OverviewSecurityCheck {
  if (!leftover?.length) {
    return {
      id: 'dwell_vs_leftover',
      check: 'Time vs leftover',
      reading: 'not observed',
      note: 'No stage notes are listed yet. On-stage time cannot be compared with what was left for a marker on each stage.',
      signal: 'watch',
    }
  }
  const shares = dwellShares(series)
  const filled = new Set(leftover.filter((r) => r.status === 'filled').map((r) => r.phaseId))
  const highEmpty = shares.filter((r) => r.share >= 0.35 && r.visibleMs > 0 && !filled.has(r.phaseId))
  const lowFilled = shares.filter((r) => r.share > 0 && r.share < 0.15 && filled.has(r.phaseId))
  if (!highEmpty.length && !lowFilled.length) {
    return {
      id: 'dwell_vs_leftover',
      check: 'Time vs leftover',
      reading: 'time matches leftover',
      note: 'Stages with more on-stage time also have notes the marker can read, or thin stages have little left. Time spent roughly matches what was left. That is not a quality score.',
      signal: 'good',
    }
  }
  const bits: string[] = []
  if (highEmpty.length) {
    bits.push(
      `Long time on a stage without notes a marker can read: ${highEmpty.map((r) => `${r.title} ${pct(r.share)}`).join(', ')}. Clock was spent; the notes are still empty or skipped. That can be stuck, thinking, or work that did not become a gradeable artifact.`,
    )
  }
  if (lowFilled.length) {
    bits.push(
      `Thin time with notes filled: ${lowFilled.map((r) => `${r.title} ${pct(r.share)}`).join(', ')}. They left something to read without staying long on that stage. Fast is not always shallow.`,
    )
  }
  bits.push('Do not treat minutes as marks. The overall score uses the stage notes and tool marks, not this mismatch.')
  return {
    id: 'dwell_vs_leftover',
    check: 'Time vs leftover',
    reading: highEmpty.length ? 'empty leftover' : 'thin dwell',
    note: bits.join(' '),
    signal: 'watch',
  }
}

function reconnectTimedCheck(
  brief: Creator2BriefDocument,
  series: SessionSeries,
  telemetry: SessionTelemetryDigest,
): OverviewSecurityCheck {
  const reconnects = telemetry.reconnectCount ?? 0
  const incidents = series.incidents.filter((i) => i.kind === 'reconnect')
  const timed = brief.phases.filter((p) => isTimedPhase(brief, p.id))
  if (!reconnects && !incidents.length) {
    return {
      id: 'reconnect_timed',
      check: 'Reconnect on timed work',
      reading: 'not observed',
      note: 'There were no reconnects. Timed stages were not interrupted by a drop on this interview.',
      signal: 'good',
    }
  }
  const timedBit = timed.length
    ? `Timed stages on this brief: ${timed.map((p) => p.title).join(', ')}. Those minutes were not extended after a drop.`
    : 'No timed tool stages on this brief.'
  return {
    id: 'reconnect_timed',
    check: 'Reconnect on timed work',
    reading: `${reconnects || incidents.length} reconnect${(reconnects || incidents.length) === 1 ? '' : 's'}`,
    note: `Network came back ${reconnects || incidents.length} time${(reconnects || incidents.length) === 1 ? '' : 's'} during this interview. ${timedBit} A drop can look like a stall on the recording. The gap is in the record. It does not add time.`,
    signal: 'watch',
  }
}

export function compileClarityPatterns(input: {
  brief: Creator2BriefDocument
  series: SessionSeries
  telemetry: SessionTelemetryDigest
  declaration: SittingDeclarationDigest
  leftover?: ClarityPatternLeftover[]
  tapes?: ClarityPatternTape[]
  talk?: ClarityPatternTalk[]
  completedPhaseIds?: string[]
  skippedPhaseIds?: string[]
  assistApplyCount?: number
  assistTurnCount?: number
}): OverviewSecurityCheck[] {
  return [
    supportCheck(input.declaration),
    taskSplitCheck(input.series),
    paceSplitCheck(input.series, input.telemetry),
    timePressureCheck(input.brief, input.series),
    focusShareCheck(input.series),
    startLatencyCheck(input.series),
    burstIdleCheck(input.series),
    cadenceSpreadCheck(input.series),
    channelByStageCheck(input.series),
    talkGapsCheck(input.series, input.talk),
    followThinCheck(
      input.brief,
      input.series,
      input.leftover,
      input.completedPhaseIds,
      input.skippedPhaseIds,
    ),
    orderDriftCheck(input.brief, input.completedPhaseIds),
    leaveMidCheck(input.series),
    pasteEditCheck(input.series, input.tapes),
    runAfterIdleCheck(input.series, input.tapes),
    assistLoopCheck(input.assistApplyCount, input.assistTurnCount),
    fileHopsCheck(input.series, input.tapes),
    dwellVsLeftoverCheck(input.series, input.leftover),
    reconnectTimedCheck(input.brief, input.series, input.telemetry),
  ]
}

export function clarityPatternProse(checks: OverviewSecurityCheck[]): string {
  const meat = checks.filter((c) => c.id !== 'support' && c.reading !== 'not observed')
  const support = checks.find((c) => c.id === 'support')
  const parts: string[] = []
  if (support?.note) parts.push(support.note)
  if (meat.length) {
    parts.push(
      meat
        .map((c) => {
          const note = String(c.note ?? '').trim()
          if (!note || note === 'undefined') return ''
          return `${c.check}. ${note}`
        })
        .filter(Boolean)
        .join('\n\n'),
    )
  } else {
    parts.push(
      'Session clocks were too thin to describe a task mix, a spoken-versus-typed split, a closing-window surge, or initiation or idle bursts. That absence is not a clean bill of health and not a diagnosis.',
    )
  }
  return parts.join('\n\n')
}

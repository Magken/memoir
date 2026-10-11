/**
 * Interview survey bot phase timing — console timeline for Talk + Assist (Form/Coding/Doc).
 * Filter DevTools by `[interview-bot]` (uses console.info / console.log — visible at default levels).
 *
 * On by default in Vite DEV. Force on/off:
 *   localStorage.setItem('vurify.interviewBotDebug', '1' | '0')
 * Legacy alias still honored: `vurify.talkDebug`
 */
const PREFIX = '[interview-bot]'

export type InterviewBotSurface = 'talk' | 'assist' | 'gate' | 'memory' | 'copilot'

export type InterviewBotPhaseMark = {
  phase: string
  /** ms since profile start */
  atMs: number
  /** ms since previous mark */
  durMs: number
}

export type InterviewBotProfile = {
  mark: (phase: string, detail?: Record<string, unknown>) => void
  /** First stream token / compose delta (Talk streaming). */
  markFirstDelta: () => void
  done: (detail?: Record<string, unknown>) => void
}

/** @deprecated Use InterviewBotPhaseMark */
export type TalkTurnPhaseMark = InterviewBotPhaseMark
/** @deprecated Use InterviewBotProfile */
export type TalkTurnProfile = InterviewBotProfile

function interviewBotDebugEnabled(): boolean {
  try {
    if (typeof localStorage !== 'undefined') {
      const flag =
        localStorage.getItem('vurify.interviewBotDebug') ??
        localStorage.getItem('vurify.talkDebug')
      if (flag === '0') return false
      if (flag === '1') return true
    }
  } catch {
    /* ignore */
  }
  try {
    return Boolean(import.meta.env?.DEV)
  } catch {
    return true
  }
}

function nowMs(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now()
}

/**
 * Start a phase timeline for one bot unit of work.
 * @param surface talk | assist | gate | memory
 * @param label short id (topic/situation/phase)
 */
export function createInterviewBotProfile(
  surface: InterviewBotSurface,
  label: string,
): InterviewBotProfile {
  const enabled = interviewBotDebugEnabled()
  const scope = `${surface}:${label}`
  const t0 = nowMs()
  let last = t0
  const marks: InterviewBotPhaseMark[] = []
  let firstDeltaAt: number | null = null

  return {
    mark(phase, detail) {
      if (!enabled) return
      const t = nowMs()
      const row: InterviewBotPhaseMark = {
        phase,
        atMs: Math.round(t - t0),
        durMs: Math.round(t - last),
      }
      marks.push(row)
      last = t
      if (detail) {
        console.info(PREFIX, scope, phase, `${row.durMs}ms`, detail)
      } else {
        console.info(PREFIX, scope, phase, `${row.durMs}ms`)
      }
    },
    markFirstDelta() {
      if (!enabled || firstDeltaAt != null) return
      firstDeltaAt = nowMs()
      const sinceStart = Math.round(firstDeltaAt - t0)
      const sinceLast = Math.round(firstDeltaAt - last)
      marks.push({
        phase: 'compose_first_delta',
        atMs: sinceStart,
        durMs: sinceLast,
      })
      last = firstDeltaAt
      console.info(PREFIX, scope, 'compose_first_delta', `${sinceStart}ms from start`)
    },
    done(detail) {
      if (!enabled) return
      const totalMs = Math.round(nowMs() - t0)
      const slowest = [...marks].sort((a, b) => b.durMs - a.durMs).slice(0, 5)
      console.log(PREFIX, 'timeline', {
        surface,
        label,
        totalMs,
        firstDeltaMs: firstDeltaAt != null ? Math.round(firstDeltaAt - t0) : null,
        phases: marks,
        slowest,
        ...detail,
      })
    },
  }
}

/** Talk helper — same profiler, surface=`talk`. */
export function createTalkTurnProfile(label: string): InterviewBotProfile {
  return createInterviewBotProfile('talk', label)
}

/** DEV log when a sitting hop dropped a required pack. Never dump into Sam speech. */
export function logSittingInjectMiss(surface: InterviewBotSurface, drops: unknown): void {
  if (!interviewBotDebugEnabled()) return
  const list = Array.isArray(drops) ? drops.map(String).filter((d) => d.startsWith('inject_miss:')) : []
  if (!list.length) return
  console.info(PREFIX, `${surface}:inject_miss`, list)
}

export function sittingInjectPeelMiss(drops: unknown): boolean {
  const list = Array.isArray(drops) ? drops.map(String) : []
  return list.includes('inject_miss:peel')
}

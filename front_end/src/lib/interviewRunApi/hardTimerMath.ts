/**
 * Hard-timer remaining + mm:ss helpers (shared by InterviewHardTimer).
 */
export function hardTimerRemainingMs(deadlineAt: string | number, now = Date.now()): number {
  const end = typeof deadlineAt === 'number' ? deadlineAt : Date.parse(deadlineAt)
  if (!Number.isFinite(end)) return 0
  return Math.max(0, end - now)
}

export function formatHardTimerMmSs(ms: number): string {
  const total = Math.ceil(Math.max(0, ms) / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

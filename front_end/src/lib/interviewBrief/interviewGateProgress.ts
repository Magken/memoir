export type InterviewGateStatus = 'not_started' | 'in_progress' | 'completed'

export type InterviewGateProgress = {
  briefId: string
  completedPhaseIds: string[]
  /** Timed stages left mid-flight — forfeited; cannot resume. */
  skippedPhaseIds: string[]
  status: InterviewGateStatus
  /** Sample (or later authored) opener for the active pending gate */
  activeStartPrompt: string | null
  activeStartPromptId: string | null
  updatedAt: string
}

const STORAGE_PREFIX = 'vurify.interviewGate.v1:'

function storageKey(briefId: string): string {
  return `${STORAGE_PREFIX}${briefId.trim()}`
}

export function emptyGateProgress(briefId: string): InterviewGateProgress {
  return {
    briefId: briefId.trim(),
    completedPhaseIds: [],
    skippedPhaseIds: [],
    status: 'not_started',
    activeStartPrompt: null,
    activeStartPromptId: null,
    updatedAt: new Date(0).toISOString(),
  }
}

function isProgress(value: unknown): value is InterviewGateProgress {
  if (!value || typeof value !== 'object') return false
  const v = value as InterviewGateProgress
  return (
    typeof v.briefId === 'string' &&
    Array.isArray(v.completedPhaseIds) &&
    (v.status === 'not_started' || v.status === 'in_progress' || v.status === 'completed')
  )
}

/** Read local gate progress (browser only). */
export function loadGateProgress(briefId: string): InterviewGateProgress {
  const id = briefId.trim()
  if (!id || typeof localStorage === 'undefined') return emptyGateProgress(id || 'unknown')
  try {
    const raw = localStorage.getItem(storageKey(id))
    if (!raw) return emptyGateProgress(id)
    const parsed: unknown = JSON.parse(raw)
    if (!isProgress(parsed)) return emptyGateProgress(id)
    const skipped = Array.isArray((parsed as InterviewGateProgress).skippedPhaseIds)
      ? (parsed as InterviewGateProgress).skippedPhaseIds.filter(
          (x): x is string => typeof x === 'string',
        )
      : []
    return {
      briefId: id,
      completedPhaseIds: parsed.completedPhaseIds.filter((x): x is string => typeof x === 'string'),
      skippedPhaseIds: skipped,
      status: parsed.status,
      activeStartPrompt:
        typeof parsed.activeStartPrompt === 'string' ? parsed.activeStartPrompt : null,
      activeStartPromptId:
        typeof parsed.activeStartPromptId === 'string' ? parsed.activeStartPromptId : null,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
    }
  } catch {
    return emptyGateProgress(id)
  }
}

export function saveGateProgress(progress: InterviewGateProgress): InterviewGateProgress {
  const next: InterviewGateProgress = {
    ...progress,
    briefId: progress.briefId.trim(),
    skippedPhaseIds: progress.skippedPhaseIds ?? [],
    updatedAt: new Date().toISOString(),
  }
  if (typeof localStorage !== 'undefined' && next.briefId) {
    localStorage.setItem(storageKey(next.briefId), JSON.stringify(next))
  }
  return next
}

export function clearGateProgress(briefId: string): void {
  const id = briefId.trim()
  if (!id || typeof localStorage === 'undefined') return
  localStorage.removeItem(storageKey(id))
}

/** Closed = completed or forfeited (skipped timed). */
export function closedPhaseIds(progress: InterviewGateProgress): string[] {
  return [...progress.completedPhaseIds, ...(progress.skippedPhaseIds ?? [])]
}

/** First spine phase id not completed and not skipped. */
export function nextOpenGateId(
  phaseIds: readonly string[],
  closedIds: readonly string[],
): string | null {
  const done = new Set(closedIds)
  for (const id of phaseIds) {
    if (!done.has(id)) return id
  }
  return null
}

export function hasInProgressGateAttempt(progress: InterviewGateProgress): boolean {
  return (
    progress.status === 'in_progress' ||
    progress.status === 'completed' ||
    progress.completedPhaseIds.length > 0 ||
    (progress.skippedPhaseIds?.length ?? 0) > 0
  )
}

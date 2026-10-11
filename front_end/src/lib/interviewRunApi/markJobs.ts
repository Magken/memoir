/**
 * Background mark jobs after Next free-pass. Restart bumps generation and aborts in-flight work.
 */
type MarkJob = (signal: AbortSignal) => Promise<void>

export type MarkJobFailure = {
  label: string
  error: string
  at: string
}

let generation = 0
const inflight = new Set<AbortController>()
/** One chain so coding_bundle + process jobs cannot RMW-race localStorage. */
let chain: Promise<void> = Promise.resolve()
const listeners = new Set<() => void>()
const failures: MarkJobFailure[] = []
const FAILURE_LIMIT = 100

function notifyMarkJobs(): void {
  for (const fn of [...listeners]) {
    try {
      fn()
    } catch {
      /* Result card refresh must not break the chain. */
    }
  }
}

/** Fired after each mark job settles (filled, skipped, or aborted). */
export function subscribeMarkJobs(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function currentMarkGeneration(): number {
  return generation
}

export function bumpMarkJobGeneration(): number {
  generation += 1
  for (const ac of inflight) {
    try {
      ac.abort()
    } catch {
      /* ignore */
    }
  }
  inflight.clear()
  chain = Promise.resolve()
  return generation
}

export function enqueueMarkJob(gen: number, work: MarkJob, label = 'mark_job'): void {
  if (gen !== generation) return
  const ac = new AbortController()
  inflight.add(ac)
  chain = chain
    .then(async () => {
      if (gen !== generation || ac.signal.aborted) return
      await work(ac.signal)
    })
    .catch((e: unknown) => {
      // Assess errors stay non-blocking, but they must never be invisible: a
      // swallowed throw here is why a pending grain could live forever with no
      // trace of what happened.
      if (e instanceof DOMException && e.name === 'AbortError') return
      const error = e instanceof Error ? e.message : String(e)
      failures.push({ label, error, at: new Date().toISOString() })
      if (failures.length > FAILURE_LIMIT) failures.splice(0, failures.length - FAILURE_LIMIT)
      console.error('[interview-mark] job failed', label, e)
    })
    .finally(() => {
      inflight.delete(ac)
      notifyMarkJobs()
    })
}

/** Failures swallowed by the chain, for DIAG and for the stuck-marking gate. */
export function markJobFailures(): MarkJobFailure[] {
  return [...failures]
}

export function clearMarkJobFailures(): void {
  failures.length = 0
}

export function markJobsInflightCount(): number {
  return inflight.size
}

/**
 * Wait until the mark chain is idle. Restart (`bumpMarkJobGeneration`) drops
 * in-flight work; callers should not hold this across a restart.
 */
export async function awaitMarkJobs(timeoutMs = 15_000): Promise<void> {
  const t0 = Date.now()
  for (;;) {
    const pending = chain
    await pending
    if (inflight.size === 0 && chain === pending) return
    if (Date.now() - t0 > timeoutMs) {
      throw new Error('awaitMarkJobs timeout')
    }
  }
}

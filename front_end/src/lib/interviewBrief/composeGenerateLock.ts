/**
 * Compose blank-slate generate ownership — start / stop / finally unlock.
 * Blocks the classic Stop→Generate button-swap form re-submit via cooldown.
 */

export const COMPOSE_GENERATE_STOP_COOLDOWN_MS = 750

export type ComposeGenerateStartOk = {
  ok: true
  gen: number
  abort: AbortController
  signal: AbortSignal
}

export type ComposeGenerateStartBlocked = {
  ok: false
  reason: 'cooldown'
}

export type ComposeGenerateFinallyResult = {
  clearGenerating: boolean
  clearOwner: boolean
}

export type ComposeGenerateLock = {
  beginStart: () => ComposeGenerateStartOk | ComposeGenerateStartBlocked
  stop: () => { editRunId: string | null }
  setEditRunId: (id: string | null) => void
  getEditRunId: () => string | null
  isCurrent: (gen: number) => boolean
  /** Clear abort ownership after a successful/failed run that still owns the lock. */
  releaseIfOwner: (runAbort: AbortController) => void
  finallyUnlock: (gen: number, runAbort: AbortController) => ComposeGenerateFinallyResult
  snapshot: () => {
    gen: number
    hasAbort: boolean
    editRunId: string | null
    ignoreStartsUntil: number
  }
}

export function createComposeGenerateLock(
  now: () => number = () => Date.now(),
  cooldownMs: number = COMPOSE_GENERATE_STOP_COOLDOWN_MS,
): ComposeGenerateLock {
  let gen = 0
  let abort: AbortController | null = null
  let editRunId: string | null = null
  let ignoreStartsUntil = 0

  return {
    beginStart() {
      if (now() < ignoreStartsUntil) {
        return { ok: false, reason: 'cooldown' }
      }
      abort?.abort()
      const next = new AbortController()
      abort = next
      editRunId = null
      gen += 1
      return { ok: true, gen, abort: next, signal: next.signal }
    },

    stop() {
      const pending = abort
      const runId = editRunId
      abort = null
      editRunId = null
      gen += 1
      ignoreStartsUntil = now() + cooldownMs
      pending?.abort()
      return { editRunId: runId }
    },

    setEditRunId(id) {
      editRunId = id
    },

    getEditRunId() {
      return editRunId
    },

    isCurrent(g) {
      return g === gen
    },

    releaseIfOwner(runAbort) {
      if (abort === runAbort) {
        abort = null
        editRunId = null
      }
    },

    finallyUnlock(g, runAbort) {
      const stillOwner = abort === runAbort
      if (g === gen) {
        return { clearGenerating: true, clearOwner: stillOwner }
      }
      // Stop cleared ownership (abort === null) — unlock UI.
      if (abort === null || stillOwner) {
        return { clearGenerating: true, clearOwner: stillOwner }
      }
      // Newer generate owns the controller.
      return { clearGenerating: false, clearOwner: false }
    },

    snapshot() {
      return {
        gen,
        hasAbort: abort !== null,
        editRunId,
        ignoreStartsUntil,
      }
    },
  }
}

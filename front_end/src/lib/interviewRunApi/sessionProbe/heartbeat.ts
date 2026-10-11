/**
 * Sitting heartbeats — HTTP RTT + IP sample every 30s and on reconnect.
 * Paused with session telemetry (landing / Finished).
 */
import { runAndStoreSessionProbe } from './runProbe'

export const SESSION_PROBE_HEARTBEAT_MS = 30_000

let timer: ReturnType<typeof setInterval> | null = null
let briefId = ''
let attemptId = ''
let phaseId = ''
let paused = true
let inFlight = false

async function fire(): Promise<void> {
  if (paused || inFlight || !briefId) return
  inFlight = true
  try {
    await runAndStoreSessionProbe({
      briefId,
      attemptId,
      phaseId: phaseId || undefined,
    })
  } catch {
    /* sample path already stores a failed echo when possible */
  } finally {
    inFlight = false
  }
}

export function setSessionProbePhase(nextPhaseId: string): void {
  phaseId = nextPhaseId
}

export function startSessionProbeHeartbeat(input: {
  briefId: string
  attemptId: string
  phaseId?: string
}): void {
  stopSessionProbeHeartbeat()
  briefId = input.briefId.trim()
  attemptId = input.attemptId
  phaseId = input.phaseId ?? ''
  paused = false
  void fire()
  timer = setInterval(() => {
    void fire()
  }, SESSION_PROBE_HEARTBEAT_MS)
}

export function pauseSessionProbeHeartbeat(): void {
  paused = true
}

export function resumeSessionProbeHeartbeat(): void {
  if (!briefId) return
  paused = false
  void fire()
}

export function stopSessionProbeHeartbeat(): void {
  if (timer) clearInterval(timer)
  timer = null
  paused = true
  briefId = ''
  attemptId = ''
  phaseId = ''
  inFlight = false
}

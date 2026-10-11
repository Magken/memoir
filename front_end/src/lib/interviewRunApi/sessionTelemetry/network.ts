/**
 * Append network / GPS samples onto the telemetry sidecar.
 * Works before a live sitting (landing preflight).
 */
import {
  NETWORK_SAMPLE_CAP,
  type SessionTelemetryGpsFix,
  type SessionTelemetryNetworkSample,
} from './types'
import { ensureSessionTelemetry, saveSessionTelemetry } from './store'

const DEDUPE_MS = 10_000

function sittingT(startedAt: string, now = Date.now()): number {
  const origin = Date.parse(startedAt)
  return Number.isFinite(origin) ? Math.max(0, now - origin) : 0
}

export function recordNetworkSample(
  briefId: string,
  attemptId: string,
  sample: Omit<SessionTelemetryNetworkSample, 't' | 'phaseId'> & {
    t?: number
    phaseId?: string
  },
): SessionTelemetryNetworkSample | null {
  const id = briefId.trim()
  if (!id) return null
  const doc = ensureSessionTelemetry(id, attemptId)
  const t = sample.t ?? sittingT(doc.startedAt)
  const phaseId = sample.phaseId || 'preflight'
  const next: SessionTelemetryNetworkSample = {
    t,
    phaseId,
    ...(sample.ip ? { ip: sample.ip } : {}),
    ...(sample.city ? { city: sample.city } : {}),
    ...(sample.region ? { region: sample.region } : {}),
    ...(sample.country ? { country: sample.country } : {}),
    ...(typeof sample.lat === 'number' ? { lat: sample.lat } : {}),
    ...(typeof sample.lon === 'number' ? { lon: sample.lon } : {}),
    ...(typeof sample.rttMs === 'number' ? { rttMs: sample.rttMs } : {}),
    ...(sample.vpnLikely != null ? { vpnLikely: sample.vpnLikely } : {}),
    ...(sample.reasons?.length ? { reasons: sample.reasons } : {}),
    ...(sample.isp ? { isp: sample.isp } : {}),
    ...(sample.timezone ? { timezone: sample.timezone } : {}),
    ...(sample.gps ? { gps: sample.gps } : {}),
  }
  const prev = doc.networkSamples ?? []
  const last = prev[prev.length - 1]
  if (last && t - last.t < DEDUPE_MS && (last.ip || '') === (next.ip || '')) {
    return last
  }
  const networkSamples = [...prev, next].slice(-NETWORK_SAMPLE_CAP)
  saveSessionTelemetry({
    ...doc,
    attemptId: attemptId || doc.attemptId,
    networkSamples,
    ...(next.gps ? { gps: next.gps } : {}),
  })
  return next
}

export function recordGpsFix(briefId: string, attemptId: string, gps: SessionTelemetryGpsFix): void {
  const id = briefId.trim()
  if (!id) return
  const doc = ensureSessionTelemetry(id, attemptId)
  const samples = doc.networkSamples ?? []
  const last = samples[samples.length - 1]
  const networkSamples = last
    ? [...samples.slice(0, -1), { ...last, gps }]
    : samples
  saveSessionTelemetry({
    ...doc,
    attemptId: attemptId || doc.attemptId,
    gps,
    networkSamples,
  })
}

export function lastNetworkSample(briefId: string): SessionTelemetryNetworkSample | null {
  const doc = ensureSessionTelemetry(briefId)
  const samples = doc.networkSamples ?? []
  return samples[samples.length - 1] ?? null
}

/**
 * Run one IP/geo/RTT probe and store it on the telemetry sidecar.
 * Edge first; public IP echo fallback never invents VPN.
 */
import { recordGpsFix, recordNetworkSample } from '../sessionTelemetry/network'
import type { SessionTelemetryGpsFix, SessionTelemetryNetworkSample } from '../sessionTelemetry/types'
import { gpsMismatchReason } from './vpnHeuristic'
import { runInterviewSessionProbe } from './sessionProbeEdgeClient'
import { gatherWebrtcIps } from './webrtcIps'

function clientTimezone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null
  } catch {
    return null
  }
}

async function ipEchoFallback(): Promise<Pick<SessionTelemetryNetworkSample, 'ip' | 'rttMs'>> {
  const t0 = Date.now()
  const res = await fetch('https://api.ipify.org?format=json')
  const data = (await res.json()) as { ip?: string }
  return {
    ip: typeof data.ip === 'string' ? data.ip.trim() : undefined,
    rttMs: Date.now() - t0,
  }
}

export async function runAndStoreSessionProbe(input: {
  briefId: string
  attemptId?: string
  phaseId?: string
  gps?: SessionTelemetryGpsFix | null
}): Promise<SessionTelemetryNetworkSample | null> {
  const briefId = input.briefId.trim()
  if (!briefId) return null
  const attemptId = input.attemptId ?? ''
  const timezone = clientTimezone()
  const webrtcIps = await gatherWebrtcIps()
  const clientSentAt = Date.now()
  let sample: Omit<SessionTelemetryNetworkSample, 't' | 'phaseId'> = {}
  try {
    const probe = await runInterviewSessionProbe({
      briefId,
      timezone,
      webrtcIps,
      clientSentAt,
    })
    const reasons = [...(probe.vpn?.reasons ?? [])]
    const gpsReason = gpsMismatchReason(input.gps ?? null, {
      lat: probe.lat ?? undefined,
      lon: probe.lon ?? undefined,
    })
    if (gpsReason) reasons.push(gpsReason)
    sample = {
      ip: probe.ip ?? undefined,
      city: probe.city ?? undefined,
      region: probe.region ?? undefined,
      country: probe.country ?? undefined,
      lat: probe.lat ?? undefined,
      lon: probe.lon ?? undefined,
      rttMs: probe.rttMs,
      vpnLikely: Boolean(probe.vpn?.likely || gpsReason),
      reasons,
      isp: probe.isp ?? undefined,
      timezone: probe.timezone ?? timezone ?? undefined,
      ...(input.gps ? { gps: input.gps } : {}),
    }
  } catch {
    try {
      const echo = await ipEchoFallback()
      sample = {
        ...echo,
        vpnLikely: false,
        reasons: [],
        timezone: timezone ?? undefined,
        ...(input.gps ? { gps: input.gps } : {}),
      }
    } catch {
      sample = {
        vpnLikely: false,
        reasons: [],
        timezone: timezone ?? undefined,
        ...(input.gps ? { gps: input.gps } : {}),
      }
    }
  }
  const stored = recordNetworkSample(briefId, attemptId, {
    ...sample,
    phaseId: input.phaseId,
  })
  if (input.gps) recordGpsFix(briefId, attemptId, input.gps)
  return stored
}

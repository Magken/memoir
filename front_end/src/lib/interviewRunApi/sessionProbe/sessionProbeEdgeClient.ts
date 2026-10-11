/**
 * FE client for Edge interview-session-probe (IP / geo / RTT / VPN heuristic).
 */
import { DataApiError, getSupabasePublicKey, getSupabaseUrl } from '../../dataApi'
import { requireInterviewEdgeAccessToken } from '../edgeAccessToken'

export type SessionProbeVpn = {
  likely: boolean
  reasons: string[]
}

export type SessionProbeResult = {
  ip: string | null
  city: string | null
  region: string | null
  country: string | null
  lat: number | null
  lon: number | null
  timezone: string | null
  isp: string | null
  org: string | null
  as: string | null
  rttMs: number
  vpn: SessionProbeVpn
}

type EdgeEnvelope<T> = {
  data?: T | null
  error?: { code?: string; detail?: string } | string | null
  meta?: unknown
}

function edgeErrorCode(error: EdgeEnvelope<unknown>['error']): string {
  if (!error) return 'unknown'
  if (typeof error === 'string') return error
  return error.code || 'unknown'
}

export async function runInterviewSessionProbe(input: {
  briefId: string
  timezone?: string | null
  webrtcIps?: readonly string[]
  clientSentAt: number
  accessToken?: string | null
}): Promise<SessionProbeResult> {
  const token = await requireInterviewEdgeAccessToken(input.accessToken, input.briefId)
  const base = getSupabaseUrl()
  if (!base) throw new DataApiError('unknown', 'missing_supabase_url')

  const res = await fetch(`${base}/functions/v1/interview-session-probe`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: getSupabasePublicKey(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      briefId: input.briefId,
      timezone: input.timezone ?? null,
      webrtcIps: input.webrtcIps ?? [],
      clientSentAt: input.clientSentAt,
    }),
  })

  let env: EdgeEnvelope<SessionProbeResult> = {}
  try {
    env = (await res.json()) as EdgeEnvelope<SessionProbeResult>
  } catch {
    env = {}
  }
  if (!res.ok || env.error) {
    throw new DataApiError('unknown', edgeErrorCode(env.error) || `session_probe_${res.status}`)
  }
  const data = env.data
  if (!data) throw new DataApiError('unknown', 'session_probe_empty')
  return data
}

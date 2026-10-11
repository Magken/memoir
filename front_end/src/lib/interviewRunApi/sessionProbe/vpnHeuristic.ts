/**
 * VPN / proxy heuristic — never claims we accessed a VPN.
 * Reasons are evidence tags; the product reading is "VPN likely" vs "no VPN signal".
 */

export const VPN_GPS_MISMATCH_KM = 500

const CLOUD_ORG_RE =
  /\b(vpn|proxy|hosting|datacenter|data centre|cloud|amazon|aws|google cloud|gcp|microsoft azure|azure|digitalocean|ovh|hetzner|linode|vultr|m247|nordvpn|expressvpn|surfshark|proton|mullvad|windscribe|cyberghost|pia|hidemyass|private internet|colo|leaseweb|fastly|cloudflare)\b/i

const CLOUD_ASN_RE =
  /\b(AS14(?:536|018)|AS16509|AS15169|AS8075|AS14061|AS16276|AS24940|AS63949|AS20473|AS31898|AS45102|AS54113|AS13335|AS60068|AS9009|AS62240)\b/i

export type VpnHeuristicInput = {
  ip?: string
  timezone?: string | null
  clientTimezone?: string | null
  isp?: string | null
  org?: string | null
  as?: string | null
  proxy?: boolean | null
  hosting?: boolean | null
  webrtcIps?: readonly string[]
}

export type VpnHeuristicResult = {
  likely: boolean
  reasons: string[]
}

export function isPublicIp(ip: string): boolean {
  const v = ip.trim()
  if (!v) return false
  if (v.includes(':')) {
    const lower = v.toLowerCase()
    if (lower === '::1' || lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80')) {
      return false
    }
    return true
  }
  const parts = v.split('.').map((n) => Number(n))
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false
  const [a, b] = parts
  if (a === 10 || a === 127) return false
  if (a === 192 && b === 168) return false
  if (a === 172 && b != null && b >= 16 && b <= 31) return false
  if (a === 169 && b === 254) return false
  return true
}

export function haversineKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const toRad = (n: number) => (n * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

export function scoreVpnHeuristic(input: VpnHeuristicInput): VpnHeuristicResult {
  const reasons: string[] = []
  const org = `${input.org ?? ''} ${input.isp ?? ''}`.trim()
  const asn = String(input.as ?? '').trim()
  if (input.proxy === true) reasons.push('proxy_flag')
  if (input.hosting === true) reasons.push('hosting_flag')
  if (org && CLOUD_ORG_RE.test(org)) reasons.push('cloud_org')
  if (asn && (CLOUD_ASN_RE.test(asn) || CLOUD_ORG_RE.test(asn))) reasons.push('hosting_asn')

  const headerIp = String(input.ip ?? '').trim()
  const publicWebrtc = (input.webrtcIps ?? []).map((ip) => ip.trim()).filter(isPublicIp)
  if (headerIp && isPublicIp(headerIp) && publicWebrtc.length && !publicWebrtc.includes(headerIp)) {
    reasons.push('webrtc_mismatch')
  }

  const geoTz = String(input.timezone ?? '').trim().toLowerCase()
  const clientTz = String(input.clientTimezone ?? '').trim().toLowerCase()
  if (geoTz && clientTz && geoTz !== clientTz) reasons.push('timezone_mismatch')

  const unique = [...new Set(reasons)]
  return { likely: unique.length > 0, reasons: unique }
}

export function gpsMismatchReason(
  gps: { lat: number; lon: number } | null | undefined,
  ip: { lat?: number; lon?: number } | null | undefined,
): string | null {
  if (!gps || ip?.lat == null || ip?.lon == null) return null
  if (!Number.isFinite(gps.lat) || !Number.isFinite(gps.lon)) return null
  if (!Number.isFinite(ip.lat) || !Number.isFinite(ip.lon)) return null
  return haversineKm(gps, { lat: ip.lat, lon: ip.lon }) > VPN_GPS_MISMATCH_KM
    ? 'gps_mismatch'
    : null
}

/**
 * Gather public STUN srflx IPs. Never stores SDP.
 */

const STUN_URL = 'stun:stun.l.google.com:19302'
const GATHER_MS = 1800

function ipFromCandidate(candidate: string): string | null {
  const parts = candidate.split(' ')
  const ip = parts[4]?.trim()
  if (!ip) return null
  if (ip.startsWith('[') && ip.endsWith(']')) return ip.slice(1, -1)
  return ip
}

export async function gatherWebrtcIps(): Promise<string[]> {
  if (typeof RTCPeerConnection === 'undefined') return []
  const pc = new RTCPeerConnection({ iceServers: [{ urls: STUN_URL }] })
  const found = new Set<string>()
  try {
    pc.createDataChannel('probe')
    const done = new Promise<void>((resolve) => {
      const timer = setTimeout(() => resolve(), GATHER_MS)
      pc.onicecandidate = (ev) => {
        const cand = ev.candidate?.candidate
        if (!cand) {
          if (ev.candidate == null) {
            clearTimeout(timer)
            resolve()
          }
          return
        }
        if (!/ typ srflx /i.test(cand) && !/ typ relay /i.test(cand)) return
        const ip = ipFromCandidate(cand)
        if (ip) found.add(ip)
      }
    })
    await pc.setLocalDescription(await pc.createOffer())
    await done
  } catch {
    /* STUN optional */
  } finally {
    try {
      pc.close()
    } catch {
      /* ignore */
    }
  }
  return [...found].slice(0, 8)
}

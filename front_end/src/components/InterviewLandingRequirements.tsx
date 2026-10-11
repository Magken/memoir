import { useCallback, useEffect, useState } from 'react'
import {
  Check,
  Eye,
  MapPin,
  Mic,
  MousePointer2,
  Wifi,
  type LucideIcon,
} from 'lucide-react'
import { Tag } from './Tag'
import { VurifyIcon } from './VurifyIcon'
import { VurifyMenuButton } from './VurifyMenuButton'
import { ensureInterviewResponse } from '../lib/interviewRunApi/interviewResponse'
import {
  canStartInterview,
  runAndStoreSessionProbe,
  type RequirementStatus,
} from '../lib/interviewRunApi/sessionProbe'
import {
  lastNetworkSample,
  recordGpsFix,
} from '../lib/interviewRunApi/sessionTelemetry'
import type { SessionTelemetryGpsFix } from '../lib/interviewRunApi/sessionTelemetry'

type InterviewLandingRequirementsProps = {
  briefId: string
  onReadyChange?: (ready: boolean) => void
  debug?: boolean
}

type RowState = {
  mic: RequirementStatus
  probe: RequirementStatus
  gps: RequirementStatus
}

function statusLabel(status: RequirementStatus): string {
  if (status === 'checking') return 'Checking'
  if (status === 'pass') return 'Ready'
  if (status === 'fail') return 'Needs attention'
  return 'Required'
}

function statusTagClass(status: RequirementStatus): string {
  if (status === 'pass') return 'theme-interview-landing__output-meta-tag--good'
  if (status === 'fail') return 'theme-interview-landing__output-meta-tag--bad'
  if (status === 'checking') return 'theme-interview-landing__output-meta-tag--watch'
  return 'theme-interview-landing__output-meta-tag--watch'
}

async function queryPermission(name: PermissionName): Promise<PermissionState | null> {
  try {
    const q = await navigator.permissions?.query({ name })
    return q?.state ?? null
  } catch {
    return null
  }
}

async function requestMic(): Promise<boolean> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  for (const track of stream.getTracks()) track.stop()
  return true
}

function requestGps(): Promise<SessionTelemetryGpsFix> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('no_geolocation'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        })
      },
      () => reject(new Error('gps_denied')),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    )
  })
}

/**
 * Pre-start integrity checklist — mic, network probe, and GPS required.
 */
export function InterviewLandingRequirements({
  briefId,
  onReadyChange,
  debug = false,
}: InterviewLandingRequirementsProps) {
  const [mic, setMic] = useState<RequirementStatus>('idle')
  const [probe, setProbe] = useState<RequirementStatus>('idle')
  const [gps, setGps] = useState<RequirementStatus>('idle')
  const [probeAttempted, setProbeAttempted] = useState(false)
  const [probeDetail, setProbeDetail] = useState(
    'We store the network address we see and how long a ping took. A VPN is a fact for a reviewer. It does not block you.',
  )
  const [gpsDetail, setGpsDetail] = useState(
    'Required. We compare it with the city on your network so a reviewer can see if the interview moved. Other candidates never see your pin.',
  )
  const [online, setOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine !== false,
  )

  const attemptId = ensureInterviewResponse(briefId).attemptId
  const ready = canStartInterview({
    agreed: true,
    mic,
    probe,
    gps,
    probeAttempted,
    online,
  })

  useEffect(() => {
    onReadyChange?.(ready)
  }, [onReadyChange, ready])

  const runProbe = useCallback(async () => {
    setProbe('checking')
    setProbeAttempted(true)
    try {
      const sample = await runAndStoreSessionProbe({ briefId, attemptId, phaseId: 'preflight' })
      const place = [sample?.city, sample?.region || sample?.country].filter(Boolean).join(', ')
      const rtt = typeof sample?.rttMs === 'number' ? `${sample.rttMs}ms` : null
      const vpn = sample?.vpnLikely ? 'VPN likely' : sample?.ip ? 'No VPN signal' : 'Network check'
      setProbeDetail(
        [vpn, place || null, rtt].filter(Boolean).join(' · ') ||
          'Network check stored. A reviewer can see the address we reached you from.',
      )
      if (sample?.ip || typeof sample?.rttMs === 'number') setProbe('pass')
      else setProbe('fail')
    } catch {
      setProbe('fail')
      setProbeDetail('The network check did not complete. Stay online and retry.')
    }
  }, [attemptId, briefId])

  const runGps = useCallback(async () => {
    setGps('checking')
    try {
      const fix = await requestGps()
      recordGpsFix(briefId, attemptId, fix)
      setGps('pass')
      setGpsDetail(
        typeof fix.accuracy === 'number'
          ? `Location stored (±${Math.round(fix.accuracy)}m). Compared with IP city for a reviewer.`
          : 'Location stored. Compared with IP city for a reviewer.',
      )
    } catch {
      setGps('fail')
      setGpsDetail(
        typeof navigator === 'undefined' || !navigator.geolocation
          ? 'This browser has no location API. You cannot continue without it.'
          : 'Location was blocked. Allow location for this site, then retry.',
      )
    }
  }, [attemptId, briefId])

  useEffect(() => {
    const onOn = () => setOnline(true)
    const onOff = () => setOnline(false)
    window.addEventListener('online', onOn)
    window.addEventListener('offline', onOff)
    return () => {
      window.removeEventListener('online', onOn)
      window.removeEventListener('offline', onOff)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const micState = await queryPermission('microphone' as PermissionName)
      if (cancelled) return
      if (micState === 'granted') {
        try {
          await requestMic()
          if (!cancelled) setMic('pass')
        } catch {
          if (!cancelled) setMic('idle')
        }
      }
      const existing = lastNetworkSample(briefId)
      if (existing && !cancelled) {
        setProbeAttempted(true)
        setProbe('pass')
        const place = [existing.city, existing.region || existing.country].filter(Boolean).join(', ')
        setProbeDetail(
          [existing.vpnLikely ? 'VPN likely' : existing.ip ? 'No VPN signal' : 'Stored sample', place]
            .filter(Boolean)
            .join(' · '),
        )
      } else if (!cancelled) {
        void runProbe()
      }
      const geoState = await queryPermission('geolocation' as PermissionName)
      if (!cancelled && geoState === 'granted') {
        void runGps()
      }
    })()
    return () => {
      cancelled = true
    }
  }, [briefId, runGps, runProbe])

  if (debug) {
    console.debug('[InterviewLandingRequirements]', { briefId, mic, probe, gps, ready })
  }

  const rows: Array<{
    id: keyof RowState | 'pointer' | 'visibility'
    label: string
    detail: string
    status: RequirementStatus
    required: boolean
    icon: LucideIcon
    action?: { label: string; onClick: () => void; busy?: boolean }
  }> = [
    {
      id: 'mic',
      label: 'Microphone',
      detail:
        'Spoken answers and dictation. We do not keep the audio file.',
      status: mic,
      required: true,
      icon: Mic,
      action:
        mic === 'pass'
          ? undefined
          : {
              label: mic === 'fail' ? 'Retry' : 'Allow',
              busy: mic === 'checking',
              onClick: () => {
                setMic('checking')
                void requestMic()
                  .then(() => setMic('pass'))
                  .catch(() => setMic('fail'))
              },
            },
    },
    {
      id: 'probe',
      label: 'Network',
      detail: probeDetail,
      status: probe,
      required: true,
      icon: Wifi,
      action:
        probe === 'pass'
          ? undefined
          : {
              label: probe === 'fail' ? 'Retry' : 'Check',
              busy: probe === 'checking',
              onClick: () => {
                void runProbe()
              },
            },
    },
    {
      id: 'gps',
      label: 'Location',
      detail: gpsDetail,
      status: gps,
      required: true,
      icon: MapPin,
      action:
        gps === 'pass'
          ? undefined
          : {
              label: gps === 'fail' ? 'Retry' : 'Share location',
              busy: gps === 'checking',
              onClick: () => {
                void runGps()
              },
            },
    },
    {
      id: 'pointer',
      label: 'On-stage pointer',
      detail: 'Coarse path on this page only, not other apps or tabs.',
      status: 'pass',
      required: false,
      icon: MousePointer2,
    },
    {
      id: 'visibility',
      label: 'This tab',
      detail: 'Leaving this tab is recorded as an interview fact, not a score.',
      status: 'pass',
      required: false,
      icon: Eye,
    },
  ]

  return (
    <section
      className="theme-interview-landing__requirements"
      aria-labelledby="interview-requirements-heading"
    >
      <h3
        id="interview-requirements-heading"
        className="type-label mb-0 theme-interview-landing__structure-label"
      >
        What this interview needs
      </h3>
      <p className="type-caption type-muted mb-0 theme-interview-landing__requirements-lead">
        Microphone, a network check, and location on this device. We keep those as facts for
        a reviewer. They are not a score.
      </p>
      <ul className="theme-interview-landing__req-list" aria-label="Interview requirements">
        {rows.map((row) => {
          const Icon = row.icon
          const done = row.status === 'pass'
          return (
            <li
              key={row.id}
              className={[
                'theme-interview-landing__req-item',
                done ? 'is-done' : '',
                row.status === 'fail' ? 'is-req-fail' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <div className="theme-interview-landing__req-row">
                <span className="theme-interview-landing__req-icon" aria-hidden>
                  <VurifyIcon
                    icon={done ? Check : Icon}
                    variant="plain"
                    tone={done ? 'accent' : row.status === 'fail' ? 'muted' : 'muted'}
                    size="sm"
                  />
                </span>
                <div className="theme-interview-landing__req-copy">
                  <p className="type-body-sm mb-0 theme-interview-landing__req-label">{row.label}</p>
                  <p className="type-caption type-muted mb-0 theme-interview-landing__req-detail">
                    {row.detail}
                  </p>
                </div>
                <div className="theme-interview-landing__req-end">
                  {row.action ? (
                    <VurifyMenuButton
                      variant="label"
                      size="sm"
                      type="button"
                      disabled={row.action.busy}
                      onClick={row.action.onClick}
                    >
                      {row.action.label}
                    </VurifyMenuButton>
                  ) : (
                    <Tag
                      size="sm"
                      className={[
                        'theme-interview-landing__output-meta-tag',
                        'theme-interview-landing__req-status-tag',
                        row.required ? statusTagClass(row.status) : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      <span>{row.required ? statusLabel(row.status) : 'On'}</span>
                    </Tag>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

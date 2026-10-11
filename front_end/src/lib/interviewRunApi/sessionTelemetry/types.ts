/**
 * Session telemetry sidecar — dwell / network / trail / typed WPM for session signals.
 * Body is not a result tree. Index may live on InterviewResponse.
 */

export const SESSION_TELEMETRY_SCHEMA = 'vurify/session-telemetry.v1' as const
export const SESSION_TELEMETRY_VERSION = 1
export const NETWORK_SAMPLE_CAP = 60
export const POINTER_TRAIL_CAP = 1800

export type SessionTelemetrySurface = 'editor' | 'talk' | 'assist'

export type SessionTelemetryEventKind =
  | 'focus_in'
  | 'focus_out'
  | 'pointer_in'
  | 'pointer_out'
  | 'online'
  | 'offline'
  | 'visible'
  | 'hidden'
  | 'dictation_start'
  | 'dictation_stop'
  | 'focus_lost'
  | 'focus_gained'
  | 'fullscreen_enter'
  | 'fullscreen_exit'
  | 'fullscreen_denied'
  | 'fullscreen_unsupported'
  | 'cover_open'
  | 'cover_closed'
  | 'cover_minimized'
  | 'cover_blocked'
  | 'cover_heuristic_ok'
  | 'cover_heuristic_fail'
  | 'window_management_unsupported'
  | 'window_management_denied'
  | 'multi_screen_undetailed'
  | 'policy_overlay_stripped'
  | 'devtools_open'
  | 'devtools_console_trap'
  | 'devtools_shortcut'
  | 'duplicate_tab'
  | 'copy_blocked'
  | 'cut_blocked'
  | 'copy_route'
  | 'paste_route'
  | 'print_blocked'
  | 'save_blocked'
  | 'view_source'
  | 'new_surface'
  | 'framed'
  | 'pointer_left_window'

export type SessionTelemetryEvent = {
  t: number
  phaseId: string
  kind: SessionTelemetryEventKind
  surface?: SessionTelemetrySurface
  /** Dictation stop: committed transcript length. Never audio. */
  charCount?: number
  /** Short sitting-policy note (kind label, not a stem dump). */
  note?: string
}

export type SessionTelemetryGpsFix = {
  lat: number
  lon: number
  accuracy?: number
}

export type SessionTelemetryNetworkSample = {
  t: number
  phaseId: string
  ip?: string
  city?: string
  region?: string
  country?: string
  lat?: number
  lon?: number
  rttMs?: number
  vpnLikely?: boolean
  reasons?: string[]
  isp?: string
  timezone?: string
  gps?: SessionTelemetryGpsFix
}

export type SessionTelemetryPointerPoint = {
  t: number
  phaseId: string
  x: number
  y: number
}

export type SessionTelemetryTypingRow = {
  surface: SessionTelemetrySurface
  committedWords: number
  activeMs: number
  wpm: number | null
}

export type SessionTelemetryIndexEntry = {
  schema: typeof SESSION_TELEMETRY_SCHEMA
  eventCount: number
  visibleMs: number
  inEditorMs: number
  /** Talk compose + Assist peel. */
  inTalkMs: number
  reconnectCount: number
}

/** Per-section dwell. Sitting totals stay on the root; do not copy them onto every phase. */
export type SessionTelemetryPhaseDwell = {
  visibleMs: number
  inEditorMs: number
  inTalkMs: number
}

export type SessionTelemetry = {
  schema: typeof SESSION_TELEMETRY_SCHEMA
  schemaVersion: typeof SESSION_TELEMETRY_VERSION
  briefId: string
  attemptId: string
  startedAt: string
  updatedAt: string
  visibleMs: number
  inEditorMs: number
  inTalkMs: number
  offlineMs: number
  reconnectCount: number
  /** Accumulators keyed by live `phaseId`. Source for `sessionSeries.byPhase[].dwell`. */
  dwellByPhase?: Record<string, SessionTelemetryPhaseDwell>
  events: SessionTelemetryEvent[]
  networkSamples?: SessionTelemetryNetworkSample[]
  pointerTrail?: SessionTelemetryPointerPoint[]
  typing?: SessionTelemetryTypingRow[]
  gps?: SessionTelemetryGpsFix
}

export type SessionTelemetryDigest = {
  visibleMs: number
  inEditorMs: number
  inTalkMs: number
  inWorkMs: number
  dwellRatio: number | null
  offlineMs: number
  reconnectCount: number
  eventCount: number
  trailCount: number
  sampleCount: number
  typedWpm: number | null
  typedWords: number
}

export type SessionTelemetryStartInput = {
  briefId: string
  attemptId: string
  phaseId: string
}

/**
 * localStorage sidecar for session telemetry — same adapter pattern as editor tapes.
 */
import {
  SESSION_TELEMETRY_SCHEMA,
  SESSION_TELEMETRY_VERSION,
  type SessionTelemetry,
  type SessionTelemetryGpsFix,
  type SessionTelemetryIndexEntry,
  type SessionTelemetryNetworkSample,
} from './types'

const STORAGE_PREFIX = 'vurify.sessionTelemetry.v1:'
const PREFLIGHT_PREFIX = 'vurify.sessionTelemetry.preflight:'

export function sessionTelemetryStorageKey(briefId: string): string {
  return `${STORAGE_PREFIX}${briefId.trim()}`
}

type PreflightStash = {
  networkSamples?: SessionTelemetryNetworkSample[]
  gps?: SessionTelemetryGpsFix
}

function preflightKey(briefId: string): string {
  return `${PREFLIGHT_PREFIX}${briefId.trim()}`
}

function readPreflight(briefId: string): PreflightStash | null {
  if (typeof sessionStorage === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(preflightKey(briefId))
    if (!raw) return null
    return JSON.parse(raw) as PreflightStash
  } catch {
    return null
  }
}

function writePreflight(briefId: string, stash: PreflightStash): void {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(preflightKey(briefId), JSON.stringify(stash))
  } catch {
    /* quota */
  }
}

function emptyTelemetry(briefId: string, attemptId = ''): SessionTelemetry {
  const now = new Date().toISOString()
  const stash = readPreflight(briefId)
  return {
    schema: SESSION_TELEMETRY_SCHEMA,
    schemaVersion: SESSION_TELEMETRY_VERSION,
    briefId: briefId.trim(),
    attemptId,
    startedAt: now,
    updatedAt: now,
    visibleMs: 0,
    inEditorMs: 0,
    inTalkMs: 0,
    offlineMs: 0,
    reconnectCount: 0,
    dwellByPhase: {},
    events: [],
    networkSamples: stash?.networkSamples ?? [],
    pointerTrail: [],
    typing: [],
    ...(stash?.gps ? { gps: stash.gps } : {}),
  }
}

export function loadSessionTelemetry(briefId: string): SessionTelemetry | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(sessionTelemetryStorageKey(briefId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as SessionTelemetry
    if (parsed?.schema !== SESSION_TELEMETRY_SCHEMA) return null
    return parsed
  } catch {
    return null
  }
}

export function saveSessionTelemetry(doc: SessionTelemetry): SessionTelemetry {
  const next = { ...doc, updatedAt: new Date().toISOString() }
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(sessionTelemetryStorageKey(doc.briefId), JSON.stringify(next))
  }
  if ((next.networkSamples?.length || next.gps) && typeof sessionStorage !== 'undefined') {
    writePreflight(next.briefId, {
      networkSamples: next.networkSamples,
      gps: next.gps,
    })
  }
  return next
}

export function clearSessionTelemetry(briefId: string): void {
  const existing = loadSessionTelemetry(briefId)
  if (existing && (existing.networkSamples?.length || existing.gps)) {
    writePreflight(briefId, {
      networkSamples: existing.networkSamples,
      gps: existing.gps,
    })
  }
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(sessionTelemetryStorageKey(briefId))
}

export function ensureSessionTelemetry(briefId: string, attemptId = ''): SessionTelemetry {
  return loadSessionTelemetry(briefId) ?? saveSessionTelemetry(emptyTelemetry(briefId, attemptId))
}

export function sessionTelemetryIndexEntry(doc: SessionTelemetry): SessionTelemetryIndexEntry {
  return {
    schema: SESSION_TELEMETRY_SCHEMA,
    eventCount: doc.events.length,
    visibleMs: doc.visibleMs,
    inEditorMs: doc.inEditorMs,
    inTalkMs: doc.inTalkMs,
    reconnectCount: doc.reconnectCount,
  }
}

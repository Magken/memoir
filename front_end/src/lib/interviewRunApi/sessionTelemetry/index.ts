export {
  SESSION_TELEMETRY_SCHEMA,
  SESSION_TELEMETRY_VERSION,
  NETWORK_SAMPLE_CAP,
  POINTER_TRAIL_CAP,
} from './types'
export type {
  SessionTelemetry,
  SessionTelemetryDigest,
  SessionTelemetryEvent,
  SessionTelemetryEventKind,
  SessionTelemetryGpsFix,
  SessionTelemetryIndexEntry,
  SessionTelemetryNetworkSample,
  SessionTelemetryPhaseDwell,
  SessionTelemetryPointerPoint,
  SessionTelemetryStartInput,
  SessionTelemetrySurface,
  SessionTelemetryTypingRow,
} from './types'
export {
  sessionTelemetryStorageKey,
  loadSessionTelemetry,
  saveSessionTelemetry,
  clearSessionTelemetry,
  ensureSessionTelemetry,
  sessionTelemetryIndexEntry,
} from './store'
export {
  TELEMETRY_TICK_MS,
  TELEMETRY_MAX_EVENTS,
  startSessionTelemetry,
  setTelemetryPhase,
  pauseSessionTelemetry,
  resumeSessionTelemetry,
  flushSessionTelemetry,
  stopSessionTelemetry,
  bindTelemetryHost,
  digestSessionTelemetry,
  recordDictationSession,
  recordSessionTelemetryEvent,
  resetTelemetrySession,
  peekTelemetrySession,
  setTelemetryClockForTests,
  tickTelemetryForTests,
  setPointerForTests,
} from './recorder'
export { recordNetworkSample, recordGpsFix, lastNetworkSample } from './network'
export {
  recordTypedInsert,
  sittingTypedWpm,
  syncTypingLive,
  resetTypingBursts,
  countTypedCommitForTests,
} from './typing'

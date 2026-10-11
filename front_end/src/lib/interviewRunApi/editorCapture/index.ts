/**
 * Editor History Capture — candidate session tape (not editor-local undo).
 */
import './registry'
export {
  EDITOR_TAPE_SCHEMA,
  EDITOR_TAPES_PACK_SCHEMA,
  EDITOR_TAPE_VERSION,
} from './types'
export type {
  CaptureStartInput,
  CaptureTickInput,
  Checkpoint,
  EditorCaptureAdapter,
  EditorCaptureKind,
  EditorTape,
  EditorTapeActionName,
  EditorTapeEvent,
  EditorTapeIndexEntry,
  EditorTapePatch,
  EditorTapesPack,
} from './types'
export { Capture, flushCapture, startCapture, tickCapture, actionCapture, resetCaptureSession, peekCaptureSession, setCaptureClockForTests } from './recorder'
export { replayTape, replayTapeFinal, actionTicks, tapeDurationMs } from './replay'
export {
  loadEditorTape,
  loadEditorTapes,
  saveEditorTape,
  clearEditorTapes,
  exportEditorTapesJson,
  downloadEditorTapesJson,
  tapesPackFromStore,
  resolveTapeFromPack,
  pickEditorTape,
  tapeIndexEntry,
} from './store'
export { persistEditorTape, flushAndPersistCapture } from './persist'
export { digestEditorTape, digestHasSecretLeak } from './tapeDigest'
export type { TapeDigest } from './tapeDigest'
export {
  TIMELINE_IDLE_GAP_MS,
  TIMELINE_MAX_BUCKETS,
  buildTimelineIndex,
  bucketAt,
  formatTapeClock,
  historyPlaySteps,
  llmTagsFromMarkingCards,
  mergeLlmTags,
  nextHistoryPlayStep,
} from './timelineIndex'
export type {
  TimelineAtlasBucket,
  TimelineBucket,
  TimelineIndex,
  TimelineLlmTag,
  TimelineTag,
} from './timelineIndex'
export {
  registerEditorCaptureAdapter,
  getEditorCaptureAdapter,
  listEditorCaptureKinds,
} from './registry'
export {
  overlayCodingMount,
  overlayDocMount,
  overlayFormDocument,
  codingPayloadFromCheckpoint,
  docPayloadFromCheckpoint,
  formResponsesFromCheckpoint,
} from './overlay'

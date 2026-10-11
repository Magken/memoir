import { VURIFY_REF_PATHS } from '../../vurifyRef/paths'

export const SITTING_POLICY_OVERLAY_ATTR = 'data-sitting-policy'
/** In-sitting view of a bound earlier section — not a leave / not a new window. */
export const SITTING_REFERENCE_VIEW_ATTR = 'data-sitting-reference-view'
export const SITTING_COVER_CHANNEL = 'vurify-sitting-cover'
export const SITTING_LOCK_CHANNEL = 'vurify-sitting-lock'
export const SITTING_COVER_PATH = VURIFY_REF_PATHS.assessmentCover
export const SITTING_WATCHDOG_MS = 250
export const POINTER_LEAVE_HOLD_MS = 2000

export type SittingPolicyReason =
  | 'fullscreen'
  | 'tab_hidden'
  | 'cover'
  | 'overlay_stripped'
  | 'devtools'
  | 'duplicate_tab'
  | 'framed'
  | 'pointer_left_window'
  | 'popup_blocked'

export type SittingPolicyOverlayKind =
  | 'none'
  | 'fullscreen'
  | 'tab_return'
  | 'cover'
  | 'duplicate'
  | 'framed'
  | 'popup'
  | 'stay'

export type SittingPolicySnapshot = {
  hold: boolean
  reasons: SittingPolicyReason[]
  overlayKind: SittingPolicyOverlayKind
  overlayGeneration: number
  fullscreenEntered: boolean
  fullscreenSupported: boolean
  coversEstablished: boolean
  isExtended: boolean
}

export type SittingPolicyStartInput = {
  briefId: string
  attemptId: string
  phaseId: string
}

export type CoverMessage =
  | { type: 'hello'; name: string }
  | { type: 'heartbeat'; name: string }
  | { type: 'hidden'; name: string }
  | { type: 'closed'; name: string }
  | { type: 'fullscreen_exit'; name: string }
  | { type: 'ping' }
  | { type: 'shutdown' }

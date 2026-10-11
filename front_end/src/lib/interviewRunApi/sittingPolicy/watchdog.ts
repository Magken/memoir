import { pickOverlayKind } from './detect'
import type { SittingPolicyReason } from './types'

export function buildHoldReasons(input: {
  framed: boolean
  duplicate: boolean
  popupBlocked: boolean
  fullscreenRequired: boolean
  fullscreenElement: boolean
  tabHidden: boolean
  coverDead: boolean
  overlayStripped: boolean
  devtools: boolean
  pointerLeftHold: boolean
}): SittingPolicyReason[] {
  const reasons: SittingPolicyReason[] = []
  if (input.framed) reasons.push('framed')
  if (input.duplicate) reasons.push('duplicate_tab')
  if (input.popupBlocked) reasons.push('popup_blocked')
  if (input.fullscreenRequired && !input.fullscreenElement) reasons.push('fullscreen')
  if (input.tabHidden) reasons.push('tab_hidden')
  if (input.coverDead) reasons.push('cover')
  if (input.overlayStripped) reasons.push('overlay_stripped')
  if (input.devtools) reasons.push('devtools')
  if (input.pointerLeftHold) reasons.push('pointer_left_window')
  return reasons
}

export { pickOverlayKind }

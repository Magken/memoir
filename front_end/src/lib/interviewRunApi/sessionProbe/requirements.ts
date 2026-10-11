/**
 * Landing preflight gate — mic, network probe, and GPS required.
 */

export type RequirementId = 'mic' | 'probe' | 'gps' | 'pointer' | 'visibility'

export type RequirementStatus = 'idle' | 'checking' | 'pass' | 'fail' | 'skip'

export type RequirementGateInput = {
  agreed: boolean
  mic: RequirementStatus
  probe: RequirementStatus
  gps: RequirementStatus
  probeAttempted: boolean
  online: boolean
}

export function canStartInterview(input: RequirementGateInput): boolean {
  if (!input.agreed) return false
  if (input.mic !== 'pass') return false
  if (input.gps !== 'pass') return false
  if (input.probe === 'pass') return true
  if (input.probeAttempted && input.online && input.probe === 'fail') return true
  return false
}

export function pointerTrailSupported(): boolean {
  return typeof PointerEvent !== 'undefined' || typeof window !== 'undefined'
}

export function visibilityApiSupported(): boolean {
  return typeof document !== 'undefined' && typeof document.visibilityState === 'string'
}

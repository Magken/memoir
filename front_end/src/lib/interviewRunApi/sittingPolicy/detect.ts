export const COPY_OK_SELECTOR = [
  'textarea',
  'input',
  '[contenteditable="true"]',
  '.monaco-editor',
  '.ProseMirror',
  '.theme-interview-creator-chat__composer',
  '[data-sitting-copy-ok]',
  '[data-sitting-reference-view]',
].join(', ')

export function isEditableCopyTarget(node: Node | null): boolean {
  const el = node instanceof Element ? node : node?.parentElement ?? null
  if (!el) return false
  return Boolean(el.closest(COPY_OK_SELECTOR))
}

export function overlayLooksHidden(el: HTMLElement | null): boolean {
  if (!el || !el.isConnected) return true
  if (typeof getComputedStyle !== 'function') return false
  const s = getComputedStyle(el)
  if (s.display === 'none' || s.visibility === 'hidden') return true
  if (Number.parseFloat(s.opacity || '1') < 0.05) return true
  if (s.pointerEvents === 'none') return true
  return false
}

export function dockedDevtoolsLikely(input: {
  innerWidth: number
  innerHeight: number
  outerWidth: number
  outerHeight: number
  prevInnerWidth?: number
  prevInnerHeight?: number
}): boolean {
  const dw = input.outerWidth - input.innerWidth
  const dh = input.outerHeight - input.innerHeight
  if (dw > 160 || dh > 180) return true
  if (
    typeof input.prevInnerWidth === 'number' &&
    input.prevInnerWidth - input.innerWidth > 140 &&
    Math.abs(input.outerWidth - (input.prevInnerWidth + dw)) < 8
  ) {
    return true
  }
  if (
    typeof input.prevInnerHeight === 'number' &&
    input.prevInnerHeight - input.innerHeight > 140
  ) {
    return true
  }
  return false
}

import type { SittingPolicyOverlayKind } from './types'

export function pickOverlayKind(reasons: readonly string[]): SittingPolicyOverlayKind {
  if (reasons.includes('framed')) return 'framed'
  if (reasons.includes('duplicate_tab')) return 'duplicate'
  if (reasons.includes('popup_blocked')) return 'popup'
  if (reasons.includes('fullscreen')) return 'fullscreen'
  if (reasons.includes('cover')) return 'cover'
  if (reasons.includes('tab_hidden')) return 'tab_return'
  if (reasons.length) return 'stay'
  return 'none'
}

export function fullscreenSupported(): boolean {
  if (typeof document === 'undefined') return false
  return Boolean(document.fullscreenEnabled)
}

export function windowManagementSupported(): boolean {
  return typeof window !== 'undefined' && 'getScreenDetails' in window
}

export type KeyboardNavigator = Navigator & {
  keyboard?: {
    lock: (keyCodes?: string[]) => Promise<void>
    unlock: () => void
  }
}

export function keyboardLockSupported(): boolean {
  return typeof navigator !== 'undefined' && Boolean((navigator as KeyboardNavigator).keyboard?.lock)
}

export type ScreenLike = {
  availLeft: number
  availTop: number
  availWidth: number
  availHeight: number
}

export function otherScreens(
  screens: ScreenLike[],
  current: ScreenLike | null,
): ScreenLike[] {
  if (!current) return screens.slice(1)
  return screens.filter(
    (s) => s.availLeft !== current.availLeft || s.availTop !== current.availTop,
  )
}

export type SittingHotkeyInput = {
  key: string
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
  shiftKey: boolean
}

export type SittingHotkeyKind =
  | 'inspect'
  | 'print'
  | 'save'
  | 'view_source'
  | 'new_surface'
  | 'paste'
  | 'copy'
  | 'cut'

export type SittingHotkeyHit = {
  kind: SittingHotkeyKind
  chord: string
}

export function formatSittingChord(e: SittingHotkeyInput): string {
  const parts: string[] = []
  if (e.ctrlKey) parts.push('Ctrl')
  if (e.metaKey) parts.push('Cmd')
  if (e.altKey) parts.push('Alt')
  if (e.shiftKey) parts.push('Shift')
  const raw = typeof e.key === 'string' ? e.key : ''
  if (!raw) return parts.join('+')
  const label =
    raw === 'F12' || /^F\d{1,2}$/.test(raw)
      ? raw
      : raw.length === 1
        ? raw.toUpperCase()
        : raw
  parts.push(label)
  return parts.join('+')
}

export function appendSittingChord(note: string, chord: string | null | undefined): string {
  const c = (chord ?? '').trim()
  if (!c) return note
  return note ? `${note} · ${c}` : c
}

export function classifySittingHotkey(e: SittingHotkeyInput): SittingHotkeyHit | null {
  const raw = typeof e.key === 'string' ? e.key : ''
  if (!raw) return null
  const key = raw.length === 1 ? raw.toLowerCase() : raw
  const mod = e.ctrlKey || e.metaKey
  const chord = formatSittingChord(e)
  if (e.key === 'F12') return { kind: 'inspect', chord: formatSittingChord({ ...e, key: 'F12' }) }
  if (mod && e.shiftKey && /^[ijck]$/.test(key)) return { kind: 'inspect', chord }
  if (e.metaKey && e.altKey && /^[ijck]$/.test(key)) return { kind: 'inspect', chord }
  if (!mod) return null
  if (key === 'p') return { kind: 'print', chord }
  if (key === 's') return { kind: 'save', chord }
  if (key === 'u') return { kind: 'view_source', chord }
  if (/^[tnw]$/.test(key)) return { kind: 'new_surface', chord }
  if (key === 'v') return { kind: 'paste', chord }
  if (key === 'c' && !e.shiftKey) return { kind: 'copy', chord }
  if (key === 'x') return { kind: 'cut', chord }
  return null
}

import { recordSessionTelemetryEvent } from '../sessionTelemetry'
import { actionCapture } from '../editorCapture/recorder'
import {
  formatPasteRouteNote,
  rememberSittingCopy,
  resetClipboardBuffer,
  resolveCopySurface,
  routeSittingPaste,
} from './clipboardRoute'
import {
  appendSittingChord,
  classifySittingHotkey,
  dockedDevtoolsLikely,
  fullscreenSupported,
  isEditableCopyTarget,
  keyboardLockSupported,
  otherScreens,
  overlayLooksHidden,
  pickOverlayKind,
  windowManagementSupported,
  type KeyboardNavigator,
  type ScreenLike,
} from './detect'
import {
  POINTER_LEAVE_HOLD_MS,
  SITTING_COVER_CHANNEL,
  SITTING_COVER_PATH,
  SITTING_LOCK_CHANNEL,
  SITTING_POLICY_OVERLAY_ATTR,
  SITTING_WATCHDOG_MS,
  type CoverMessage,
  type SittingPolicySnapshot,
  type SittingPolicyStartInput,
} from './types'
import { buildHoldReasons } from './watchdog'

type CoverSlot = {
  name: string
  win: Window | null
  lastBeat: number
}

type LivePolicy = {
  briefId: string
  attemptId: string
  phaseId: string
  unbind: Array<() => void>
  interval: ReturnType<typeof setInterval> | null
  snapshot: SittingPolicySnapshot
  tabHidden: boolean
  ackTabReturn: boolean
  fullscreenEntered: boolean
  fullscreenSupported: boolean
  coversEstablished: boolean
  coverDead: boolean
  popupBlocked: boolean
  pendingScreens: ScreenLike[]
  covers: CoverSlot[]
  coverChannel: BroadcastChannel | null
  lockChannel: BroadcastChannel | null
  lockRelease: (() => void) | null
  duplicate: boolean
  framed: boolean
  overlayStripped: boolean
  devtools: boolean
  pointerLeft: boolean
  pointerLeftTimer: ReturnType<typeof setTimeout> | null
  pointerLeftHold: boolean
  isExtended: boolean
  prevInnerW: number
  prevInnerH: number
  wake: WakeLockSentinel | null
  trapAt: number
}

let live: LivePolicy | null = null
const HOTKEY_STASH_MS = 400
let lastClipboardHotkey: { t: number; kind: 'paste' | 'copy' | 'cut'; chord: string } | null = null

function stashClipboardHotkey(kind: 'paste' | 'copy' | 'cut', chord: string): void {
  lastClipboardHotkey = { t: Date.now(), kind, chord }
}

function takeClipboardHotkey(kind: 'paste' | 'copy' | 'cut'): string | null {
  const hit = lastClipboardHotkey
  if (!hit || hit.kind !== kind) return null
  if (Date.now() - hit.t > HOTKEY_STASH_MS) return null
  lastClipboardHotkey = null
  return hit.chord
}

const listeners = new Set<(s: SittingPolicySnapshot) => void>()

let policyLeaveHandler: (() => void) | null = null

/** InterviewPage registers this — policy overlay Leave must land on overview, not only exit FS. */
export function registerSittingPolicyLeaveHandler(handler: (() => void) | null): void {
  policyLeaveHandler = handler
}

/** Policy overlay Leave — run registered landing navigation, then tear down sitting policy. */
export function sittingPolicyLeaveToLanding(): void {
  policyLeaveHandler?.()
  if (live) stopSittingPolicy()
}

function emptySnapshot(): SittingPolicySnapshot {
  return {
    hold: false,
    reasons: [],
    overlayKind: 'none',
    overlayGeneration: 0,
    fullscreenEntered: false,
    fullscreenSupported: false,
    coversEstablished: false,
    isExtended: false,
  }
}

function emit(): void {
  if (!live) return
  const reasons = buildHoldReasons({
    framed: live.framed,
    duplicate: live.duplicate,
    popupBlocked: live.popupBlocked,
    fullscreenRequired: live.fullscreenEntered,
    fullscreenElement: Boolean(typeof document !== 'undefined' && document.fullscreenElement),
    tabHidden: live.tabHidden && !live.ackTabReturn,
    coverDead: live.coverDead,
    overlayStripped: live.overlayStripped,
    devtools: live.devtools,
    pointerLeftHold: live.pointerLeftHold,
  })
  live.snapshot = {
    hold: reasons.length > 0,
    reasons,
    overlayKind: pickOverlayKind(reasons),
    overlayGeneration: live.snapshot.overlayGeneration,
    fullscreenEntered: live.fullscreenEntered,
    fullscreenSupported: live.fullscreenSupported,
    coversEstablished: live.coversEstablished,
    isExtended: live.isExtended,
  }
  for (const fn of listeners) fn(live?.snapshot ?? emptySnapshot())
}

function bumpOverlay(): void {
  if (!live) return
  live.snapshot = { ...live.snapshot, overlayGeneration: live.snapshot.overlayGeneration + 1 }
  emit()
}

function note(kind: Parameters<typeof recordSessionTelemetryEvent>[0], extra?: string): void {
  recordSessionTelemetryEvent(kind, extra ? { note: extra } : undefined)
}

async function enterFullscreen(): Promise<boolean> {
  if (typeof document === 'undefined') return false
  if (!document.fullscreenEnabled) {
    note('fullscreen_unsupported')
    return false
  }
  try {
    await document.documentElement.requestFullscreen({ navigationUI: 'hide' })
    return true
  } catch {
    note('fullscreen_denied')
    return false
  }
}

async function lockKeyboard(): Promise<void> {
  if (!keyboardLockSupported()) return
  try {
    await (navigator as KeyboardNavigator).keyboard?.lock(['Escape', 'KeyT', 'KeyN', 'KeyW'])
  } catch {
    /* ignore */
  }
}

function unlockKeyboard(): void {
  try {
    (navigator as KeyboardNavigator).keyboard?.unlock()
  } catch {
    /* ignore */
  }
}

async function requestWake(): Promise<void> {
  if (!live || typeof navigator === 'undefined' || !navigator.wakeLock?.request) return
  try {
    live.wake = await navigator.wakeLock.request('screen')
  } catch {
    live.wake = null
  }
}

function releaseWake(): void {
  try {
    void live?.wake?.release()
  } catch {
    /* ignore */
  }
  if (live) live.wake = null
}

function openCoverOnScreen(screen: ScreenLike, index: number): Window | null {
  if (typeof window === 'undefined') return null
  const name = `vurify-cover-${index}`
  const feats = [
    `left=${Math.round(screen.availLeft)}`,
    `top=${Math.round(screen.availTop)}`,
    `width=${Math.round(screen.availWidth)}`,
    `height=${Math.round(screen.availHeight)}`,
  ].join(',')
  return window.open(SITTING_COVER_PATH, name, feats)
}

async function tryOpenCovers(): Promise<void> {
  if (!live || typeof window === 'undefined') return
  const extended = Boolean(window.screen && 'isExtended' in window.screen && window.screen.isExtended)
  live.isExtended = extended

  if (!windowManagementSupported()) {
    note(extended ? 'multi_screen_undetailed' : 'window_management_unsupported')
    if (extended) {
      const guess: ScreenLike = {
        availLeft: (window.screen as unknown as ScreenLike).availLeft + window.screen.availWidth,
        availTop: (window.screen as unknown as ScreenLike).availTop,
        availWidth: window.screen.availWidth,
        availHeight: window.screen.availHeight,
      }
      const win = openCoverOnScreen(guess, 0)
      if (win) {
        live.covers = [{ name: 'vurify-cover-0', win, lastBeat: Date.now() }]
        live.coversEstablished = true
        note('cover_heuristic_ok')
        note('cover_open', 'heuristic')
      } else {
        note('cover_heuristic_fail')
      }
    }
    emit()
    return
  }

  try {
    const details = await (
      window as unknown as Window & { getScreenDetails: () => Promise<{
        screens: ScreenLike[]
        currentScreen: ScreenLike
        addEventListener: (type: string, fn: () => void) => void
        removeEventListener: (type: string, fn: () => void) => void
      }> }
    ).getScreenDetails()
    const others = otherScreens(details.screens, details.currentScreen)
    live.pendingScreens = []
    const opened: CoverSlot[] = []
    others.forEach((screen, i) => {
      const win = openCoverOnScreen(screen, i)
      if (!win) {
        live!.pendingScreens.push(screen)
        note('cover_blocked')
        return
      }
      opened.push({ name: `vurify-cover-${i}`, win, lastBeat: Date.now() })
      note('cover_open', `vurify-cover-${i}`)
    })
    live.covers = opened
    live.coversEstablished = opened.length > 0
    live.popupBlocked = live.pendingScreens.length > 0
    const onScreens = () => {
      void tryOpenCovers()
    }
    details.addEventListener('screenschange', onScreens)
    details.addEventListener('currentscreenchange', onScreens)
    live.unbind.push(() => {
      details.removeEventListener('screenschange', onScreens)
      details.removeEventListener('currentscreenchange', onScreens)
    })
  } catch {
    note('window_management_denied')
    if (extended) note('multi_screen_undetailed')
  }
  emit()
}

function closeCovers(): void {
  if (!live) return
  live.coverChannel?.postMessage({ type: 'shutdown' } satisfies CoverMessage)
  for (const slot of live.covers) {
    try {
      slot.win?.close()
    } catch {
      /* ignore */
    }
  }
  live.covers = []
  live.coversEstablished = false
  live.coverDead = false
}

function bindDocumentGuards(): void {
  if (!live || typeof document === 'undefined' || typeof window === 'undefined') return

  const onVis = () => {
    if (!live) return
    const hidden = document.visibilityState === 'hidden'
    live.tabHidden = hidden
    live.ackTabReturn = false
    emit()
  }
  const onPageHide = () => {
    if (!live) return
    live.tabHidden = true
    live.ackTabReturn = false
    emit()
  }
  const onFocus = () => {
    note('focus_gained')
  }
  const onBlur = () => {
    note('focus_lost')
  }
  const onFs = () => {
    if (!live) return
    if (document.fullscreenElement) {
      live.fullscreenEntered = true
      note('fullscreen_enter')
      void lockKeyboard()
    } else {
      note('fullscreen_exit')
      unlockKeyboard()
    }
    emit()
  }
  const onCopy = (e: ClipboardEvent) => {
    const target = e.target as Node
    const allowed = isEditableCopyTarget(target)
    const surface = resolveCopySurface(target)
    const chord = takeClipboardHotkey(e.type === 'cut' ? 'cut' : 'copy')
    if (!allowed) {
      e.preventDefault()
      const n = String(window.getSelection()?.toString().length ?? 0)
      note(e.type === 'cut' ? 'cut_blocked' : 'copy_blocked', appendSittingChord(n, chord))
      return
    }
    if (e.type === 'copy') {
      const text = window.getSelection()?.toString() ?? ''
      rememberSittingCopy(text, surface)
      if (chord) note('copy_route', appendSittingChord(`${surface}|${text.length}`, chord))
    }
  }
  const onPaste = (e: ClipboardEvent) => {
    const text = e.clipboardData?.getData('text') ?? ''
    const dest = resolveCopySurface(e.target as Node)
    const route = routeSittingPaste(text, dest)
    const chord = takeClipboardHotkey('paste')
    note('paste_route', appendSittingChord(formatPasteRouteNote(route), chord))
    actionCapture('paste_route', {
      from: route.from,
      srcSurface: route.srcSurface,
      destSurface: route.destSurface,
      chars: route.chars,
      label: route.label,
    })
  }
  const onContext = (e: Event) => {
    e.preventDefault()
  }
  const onPrint = (e: Event) => {
    e.preventDefault()
    note('print_blocked')
  }
  const onKey = (e: KeyboardEvent) => {
    const hit = classifySittingHotkey(e)
    if (!hit) return
    if (hit.kind === 'inspect') {
      note('devtools_shortcut', hit.chord)
      const docked = dockedDevtoolsLikely({
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        outerWidth: window.outerWidth,
        outerHeight: window.outerHeight,
        prevInnerWidth: live!.prevInnerW,
        prevInnerHeight: live!.prevInnerH,
      })
      if (live!.snapshot.hold || docked) {
        live!.devtools = true
        emit()
      }
      return
    }
    if (hit.kind === 'print') {
      e.preventDefault()
      note('print_blocked', hit.chord)
      return
    }
    if (hit.kind === 'save') {
      e.preventDefault()
      note('save_blocked', hit.chord)
      return
    }
    if (hit.kind === 'view_source') {
      e.preventDefault()
      note('view_source', hit.chord)
      return
    }
    if (hit.kind === 'new_surface') {
      e.preventDefault()
      note('new_surface', hit.chord)
      return
    }
    stashClipboardHotkey(hit.kind, hit.chord)
  }
  const onPointerOut = (e: PointerEvent) => {
    if (!live) return
    if (e.relatedTarget != null) return
    live.pointerLeft = true
    if (live.pointerLeftTimer) clearTimeout(live.pointerLeftTimer)
    live.pointerLeftTimer = setTimeout(() => {
      if (!live || !live.pointerLeft) return
      note('pointer_left_window')
      live.pointerLeftHold = true
      emit()
    }, POINTER_LEAVE_HOLD_MS)
  }
  const onPointerOver = () => {
    if (!live) return
    const hadPendingLeave = live.pointerLeftTimer != null
    live.pointerLeft = false
    if (live.pointerLeftTimer) {
      clearTimeout(live.pointerLeftTimer)
      live.pointerLeftTimer = null
    }
    // Sustained leave is latched — stay paused until Continue or Leave.
    if (live.pointerLeftHold) return
    // Returned before the leave timer fired — refresh (e.g. devtools/fullscreen hold).
    if (hadPendingLeave) emit()
  }

  document.addEventListener('visibilitychange', onVis)
  window.addEventListener('pagehide', onPageHide)
  window.addEventListener('focus', onFocus)
  window.addEventListener('blur', onBlur)
  document.addEventListener('fullscreenchange', onFs)
  document.addEventListener('copy', onCopy, true)
  document.addEventListener('cut', onCopy, true)
  document.addEventListener('paste', onPaste, true)
  document.addEventListener('contextmenu', onContext)
  window.addEventListener('beforeprint', onPrint)
  window.addEventListener('keydown', onKey, true)
  document.addEventListener('pointerout', onPointerOut)
  document.addEventListener('pointerover', onPointerOver)
  const onBeforeUnload = (e: BeforeUnloadEvent) => {
    e.preventDefault()
    e.returnValue = ''
  }
  window.addEventListener('beforeunload', onBeforeUnload)

  live.unbind.push(() => {
    document.removeEventListener('visibilitychange', onVis)
    window.removeEventListener('pagehide', onPageHide)
    window.removeEventListener('focus', onFocus)
    window.removeEventListener('blur', onBlur)
    document.removeEventListener('fullscreenchange', onFs)
    document.removeEventListener('copy', onCopy, true)
    document.removeEventListener('cut', onCopy, true)
    document.removeEventListener('paste', onPaste, true)
    document.removeEventListener('contextmenu', onContext)
    window.removeEventListener('beforeprint', onPrint)
    window.removeEventListener('keydown', onKey, true)
    document.removeEventListener('pointerout', onPointerOut)
    document.removeEventListener('pointerover', onPointerOver)
    window.removeEventListener('beforeunload', onBeforeUnload)
  })
}

function bindOverlayObserver(): void {
  if (!live || typeof MutationObserver === 'undefined' || typeof document === 'undefined') return
  const obs = new MutationObserver(() => {
    if (!live) return
    const host = document.querySelector(`[${SITTING_POLICY_OVERLAY_ATTR}]`)
    const stripped = live.snapshot.hold && overlayLooksHidden(host instanceof HTMLElement ? host : null)
    if (stripped && !live.overlayStripped) {
      live.overlayStripped = true
      note('policy_overlay_stripped')
      bumpOverlay()
    } else if (!stripped && live.overlayStripped) {
      live.overlayStripped = false
      emit()
    }
  })
  obs.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['hidden', 'style', 'class'],
  })
  live.unbind.push(() => obs.disconnect())
}

function bindCoverChannel(): void {
  if (!live || typeof BroadcastChannel === 'undefined') return
  const ch = new BroadcastChannel(SITTING_COVER_CHANNEL)
  live.coverChannel = ch
  ch.onmessage = (ev: MessageEvent<CoverMessage>) => {
    if (!live) return
    const msg = ev.data
    if (!msg || typeof msg !== 'object') return
    if (msg.type === 'heartbeat' || msg.type === 'hello') {
      const slot = live.covers.find((c) => c.name === msg.name)
      if (slot) slot.lastBeat = Date.now()
    }
    if (msg.type === 'closed' || msg.type === 'hidden' || msg.type === 'fullscreen_exit') {
      live.coverDead = true
      note(msg.type === 'hidden' ? 'cover_minimized' : 'cover_closed', msg.name)
      emit()
    }
  }
  live.unbind.push(() => {
    ch.close()
  })
}

function bindSittingLock(attemptId: string): void {
  if (!live) return
  if (typeof BroadcastChannel !== 'undefined') {
    const ch = new BroadcastChannel(SITTING_LOCK_CHANNEL)
    live.lockChannel = ch
    ch.onmessage = (ev: MessageEvent<{ type?: string; attemptId?: string }>) => {
      if (!live) return
      if (ev.data?.type === 'claim' && ev.data.attemptId === attemptId) {
        ch.postMessage({ type: 'busy', attemptId })
      }
      if (ev.data?.type === 'busy' && ev.data.attemptId === attemptId && !live.lockRelease) {
        live.duplicate = true
        note('duplicate_tab')
        emit()
      }
    }
    ch.postMessage({ type: 'claim', attemptId })
    live.unbind.push(() => ch.close())
  }
  const locks = navigator.locks
  if (locks?.request) {
    void locks.request(`vurify-sitting:${attemptId}`, { ifAvailable: true }, (lock) => {
      if (!lock) {
        if (live) {
          live.duplicate = true
          note('duplicate_tab')
          emit()
        }
        return
      }
      return new Promise<void>((resolve) => {
        if (live) live.lockRelease = resolve
      })
    })
  }
}

function tickWatchdog(): void {
  if (!live || typeof window === 'undefined' || typeof document === 'undefined') return
  try {
    if (window.top !== window) {
      if (!live.framed) {
        live.framed = true
        note('framed')
      }
    }
  } catch {
    if (live && !live.framed) {
      live.framed = true
      note('framed')
    }
  }
  const likely = dockedDevtoolsLikely({
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    outerWidth: window.outerWidth,
    outerHeight: window.outerHeight,
    prevInnerWidth: live.prevInnerW,
    prevInnerHeight: live.prevInnerH,
  })
  live.prevInnerW = window.innerWidth
  live.prevInnerH = window.innerHeight
  if (likely && !live.devtools) {
    live.devtools = true
    note('devtools_open')
  }
  if (Date.now() - live.trapAt > 5000) {
    live.trapAt = Date.now()
    const probe = {
      get id() {
        if (!live) return ''
        live.devtools = true
        note('devtools_console_trap')
        emit()
        return 'sitting'
      },
    }
    console.debug(probe)
  }
  if (live.coversEstablished) {
    const stale = Date.now() - 4000
    for (const slot of live.covers) {
      if (slot.win?.closed || slot.lastBeat < stale) {
        live.coverDead = true
        note('cover_closed', slot.name)
      }
    }
  }
  if (!document.fullscreenElement && live.fullscreenEntered) {
    /* hold via emit reasons */
  }
  const host = document.querySelector(`[${SITTING_POLICY_OVERLAY_ATTR}]`)
  const missing = live.snapshot.hold && !(host instanceof HTMLElement && host.isConnected)
  if (missing) {
    if (!live.overlayStripped) note('policy_overlay_stripped')
    live.overlayStripped = true
    bumpOverlay()
    return
  }
  emit()
}

export function startSittingPolicy(input: SittingPolicyStartInput): void {
  if (typeof window === 'undefined') return
  if (live) {
    live.phaseId = input.phaseId
    live.briefId = input.briefId
    live.attemptId = input.attemptId
    return
  }
  live = {
    briefId: input.briefId,
    attemptId: input.attemptId,
    phaseId: input.phaseId,
    unbind: [],
    interval: null,
    snapshot: emptySnapshot(),
    tabHidden: document.visibilityState === 'hidden',
    ackTabReturn: false,
    fullscreenEntered: false,
    fullscreenSupported: fullscreenSupported(),
    coversEstablished: false,
    coverDead: false,
    popupBlocked: false,
    pendingScreens: [],
    covers: [],
    coverChannel: null,
    lockChannel: null,
    lockRelease: null,
    duplicate: false,
    framed: false,
    overlayStripped: false,
    devtools: false,
    pointerLeft: false,
    pointerLeftTimer: null,
    pointerLeftHold: false,
    isExtended: Boolean(window.screen && 'isExtended' in window.screen && window.screen.isExtended),
    prevInnerW: window.innerWidth,
    prevInnerH: window.innerHeight,
    wake: null,
    trapAt: 0,
  }
  bindDocumentGuards()
  bindOverlayObserver()
  bindCoverChannel()
  bindSittingLock(input.attemptId)
  void requestWake()
  void (async () => {
    const ok = await enterFullscreen()
    if (ok && live) {
      live.fullscreenEntered = true
      await lockKeyboard()
    }
    await tryOpenCovers()
    emit()
  })()
  live.interval = setInterval(tickWatchdog, SITTING_WATCHDOG_MS)
  emit()
}

export function stopSittingPolicy(): void {
  if (!live) return
  closeCovers()
  unlockKeyboard()
  releaseWake()
  if (typeof document !== 'undefined' && document.fullscreenElement) {
    void document.exitFullscreen().catch(() => undefined)
  }
  if (live.interval) clearInterval(live.interval)
  if (live.pointerLeftTimer) clearTimeout(live.pointerLeftTimer)
  live.lockRelease?.()
  for (const fn of live.unbind) {
    try {
      fn()
    } catch {
      /* ignore */
    }
  }
  live = null
  lastClipboardHotkey = null
  resetClipboardBuffer()
  for (const fn of listeners) fn(emptySnapshot())
}

export function sittingPolicyActive(): boolean {
  return live != null
}

export function setSittingPolicyPhase(phaseId: string): void {
  if (live) live.phaseId = phaseId
}

export function subscribeSittingPolicy(cb: (s: SittingPolicySnapshot) => void): () => void {
  listeners.add(cb)
  cb(live?.snapshot ?? emptySnapshot())
  return () => {
    listeners.delete(cb)
  }
}

export function getSittingPolicy(): SittingPolicySnapshot {
  return live?.snapshot ?? emptySnapshot()
}

export async function sittingPolicyReturnFullscreen(): Promise<void> {
  const ok = await enterFullscreen()
  if (ok && live) {
    live.fullscreenEntered = true
    await lockKeyboard()
  }
  emit()
}

export function sittingPolicyAckTabReturn(): void {
  if (!live) return
  live.ackTabReturn = true
  live.tabHidden = document.visibilityState === 'hidden'
  emit()
}

export async function sittingPolicyRetryCovers(): Promise<void> {
  if (!live) return
  live.coverDead = false
  live.popupBlocked = false
  await tryOpenCovers()
  emit()
}

export function sittingPolicyAckStay(): void {
  if (!live) return
  live.devtools = false
  live.overlayStripped = false
  live.pointerLeftHold = false
  live.pointerLeft = false
  emit()
}

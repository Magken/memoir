/**
 * Sitting policy detectors — no browser APIs.
 * Run: npx tsx front_end/src/lib/interviewRunApi/sittingPolicy/sittingPolicy.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dockedDevtoolsLikely, isEditableCopyTarget, classifySittingHotkey, formatSittingChord, otherScreens, pickOverlayKind } from './detect.ts'
import { buildHoldReasons } from './watchdog.ts'
import { registerSittingPolicyLeaveHandler, sittingPolicyLeaveToLanding } from './session.ts'

assert.equal(pickOverlayKind(['framed']), 'framed')
assert.equal(pickOverlayKind(['fullscreen', 'tab_hidden']), 'fullscreen')
assert.equal(pickOverlayKind(['devtools']), 'stay')
assert.equal(pickOverlayKind(['overlay_stripped']), 'stay')
assert.equal(pickOverlayKind(['pointer_left_window']), 'stay')
assert.equal(pickOverlayKind([]), 'none')

const hold = buildHoldReasons({
  framed: false,
  duplicate: false,
  popupBlocked: false,
  fullscreenRequired: true,
  fullscreenElement: false,
  tabHidden: false,
  coverDead: false,
  overlayStripped: false,
  devtools: false,
  pointerLeftHold: false,
})
assert.deepEqual(hold, ['fullscreen'])

assert.equal(
  dockedDevtoolsLikely({
    innerWidth: 800,
    innerHeight: 700,
    outerWidth: 1000,
    outerHeight: 800,
  }),
  true,
)
assert.equal(
  dockedDevtoolsLikely({
    innerWidth: 1200,
    innerHeight: 800,
    outerWidth: 1240,
    outerHeight: 860,
  }),
  false,
)

const screens = [
  { availLeft: 0, availTop: 0, availWidth: 1440, availHeight: 900 },
  { availLeft: 1440, availTop: 0, availWidth: 1920, availHeight: 1080 },
]
assert.equal(otherScreens(screens, screens[0]).length, 1)
assert.equal(otherScreens(screens, screens[0])[0]?.availLeft, 1440)

if (typeof document !== 'undefined') {
  const ta = document.createElement('textarea')
  assert.equal(isEditableCopyTarget(ta), true)
  const box = document.createElement('div')
  box.setAttribute('data-sitting-reference-view', 'true')
  const inner = document.createElement('span')
  box.appendChild(inner)
  ;(document.body ?? document.documentElement).appendChild(box)
  assert.equal(isEditableCopyTarget(inner), true, 'referenced-section view is copy-ok')
  box.remove()
}

function chord(partial) {
  return { key: 'a', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, ...partial }
}

assert.equal(classifySittingHotkey(chord({ key: 'F12' }))?.kind, 'inspect')
assert.equal(classifySittingHotkey(chord({ key: 'F12' }))?.chord, 'F12')
assert.equal(classifySittingHotkey(chord({ key: 'i', ctrlKey: true, shiftKey: true }))?.kind, 'inspect')
assert.equal(formatSittingChord(chord({ key: 'i', ctrlKey: true, shiftKey: true })), 'Ctrl+Shift+I')
assert.equal(classifySittingHotkey(chord({ key: 'k', ctrlKey: true, shiftKey: true }))?.kind, 'inspect')
assert.equal(classifySittingHotkey(chord({ key: 'i', metaKey: true, altKey: true }))?.kind, 'inspect')
assert.equal(classifySittingHotkey(chord({ key: 'v', ctrlKey: true }))?.kind, 'paste')
assert.equal(classifySittingHotkey(chord({ key: 'v', metaKey: true }))?.chord, 'Cmd+V')
assert.equal(classifySittingHotkey(chord({ key: 'c', ctrlKey: true }))?.kind, 'copy')
assert.equal(classifySittingHotkey(chord({ key: 'c', ctrlKey: true, shiftKey: true }))?.kind, 'inspect')
assert.equal(classifySittingHotkey(chord({ key: 'u', ctrlKey: true }))?.kind, 'view_source')
assert.equal(classifySittingHotkey(chord({ key: 't', ctrlKey: true }))?.kind, 'new_surface')
assert.equal(classifySittingHotkey(chord({ key: 'p', ctrlKey: true }))?.kind, 'print')
assert.equal(classifySittingHotkey(chord({ key: 'a', ctrlKey: true })), null)
assert.equal(classifySittingHotkey(chord({ key: undefined })), null, 'IME / empty key is not a crash')
assert.equal(classifySittingHotkey(chord({ key: '' })), null, 'negative: blank key is not a chord')
assert.equal(formatSittingChord(chord({ key: undefined, ctrlKey: true })), 'Ctrl')

const overlaySrc = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'SittingPolicyOverlay.tsx'),
  'utf8',
)
assert.match(overlaySrc, /confirmLabel=\{copy\.confirm\}/)
assert.match(overlaySrc, /showCancel=\{false\}/)
assert.match(overlaySrc, /kind === 'stay'\) sittingPolicyAckStay\(\)/)
assert.match(overlaySrc, /kind === 'fullscreen'\) void sittingPolicyReturnFullscreen\(\)/)
assert.doesNotMatch(overlaySrc, /Leave/)
{
  const copyBlock = overlaySrc.slice(overlaySrc.indexOf('const COPY'), overlaySrc.indexOf('const TIMER_NOTE'))
  assert.match(copyBlock, /Stay on the interview/)
  assert.match(copyBlock, /This interview paused/)
  assert.doesNotMatch(
    copyBlock,
    /\bthe sitting\b|\bthis sitting\b|\bThe sitting\b|\bThis sitting\b/,
    'negative: candidate overlay copy must not name the interview "the sitting"',
  )
  assert.match(
    'Stay on the sitting',
    /\bthe sitting\b/,
    'negative: the jargon gate still matches the old overlay title',
  )
}

const landingSrc = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../../../components/InterviewLandingRequirements.tsx'),
  'utf8',
)
assert.match(landingSrc, /if the interview moved/)
assert.match(landingSrc, /What this interview needs/)
assert.match(landingSrc, /an interview fact/)
assert.doesNotMatch(
  landingSrc,
  /if the sitting moved/,
  'negative: landing copy must not name the interview "the sitting"',
)
assert.doesNotMatch(
  landingSrc,
  /What this sitting needs/,
  'negative: landing heading must not say "this sitting"',
)
assert.doesNotMatch(
  landingSrc,
  /a sitting fact/,
  'negative: landing detail must not say "sitting fact"',
)

const sessionSrc = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'session.ts'),
  'utf8',
)
assert.match(sessionSrc, /export function registerSittingPolicyLeaveHandler/)
assert.match(sessionSrc, /export function sittingPolicyLeaveToLanding/)

const pageSrc = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../../../pages/InterviewPage.tsx'),
  'utf8',
)
assert.match(pageSrc, /registerSittingPolicyLeaveHandler\(\(\) => policyLeaveRef\.current\(\)\)/)
assert.match(pageSrc, /flushSync\(\(\) => \{\s*applySnapshot/)

let leaveCalled = false
registerSittingPolicyLeaveHandler(() => {
  leaveCalled = true
})
sittingPolicyLeaveToLanding()
assert.equal(leaveCalled, true, 'registered leave handler must run on policy Leave')
registerSittingPolicyLeaveHandler(null)

console.log('sittingPolicy.unit.mjs: ok')

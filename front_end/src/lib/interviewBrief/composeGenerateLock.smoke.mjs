/**
 * Smoke: compose generate Stop must unlock UI and block immediate re-start
 * (Stop→Generate button-swap / form re-submit race).
 *
 * Run: npx tsx front_end/src/lib/interviewBrief/composeGenerateLock.smoke.mjs
 */
import assert from 'node:assert/strict'
import {
  COMPOSE_GENERATE_STOP_COOLDOWN_MS,
  createComposeGenerateLock,
} from './composeGenerateLock.ts'

let passed = 0
let failed = 0

async function step(name, fn) {
  try {
    await fn()
    passed += 1
    console.log(`  ok ${name}`)
  } catch (err) {
    failed += 1
    console.error(`  fail ${name}`)
    console.error(`    ${err instanceof Error ? err.message : String(err)}`)
  }
}

console.log('compose-generate stop smoke')

await step('start → stop unlocks and aborts signal', () => {
  const lock = createComposeGenerateLock(() => 1_000)
  const started = lock.beginStart()
  assert.equal(started.ok, true)
  if (!started.ok) return

  let aborted = false
  started.signal.addEventListener('abort', () => {
    aborted = true
  })

  const ui = { generating: true }
  lock.stop()
  const fin = lock.finallyUnlock(started.gen, started.abort)
  if (fin.clearGenerating) ui.generating = false
  if (fin.clearOwner) lock.releaseIfOwner(started.abort)

  assert.equal(aborted, true)
  assert.equal(started.signal.aborted, true)
  assert.equal(ui.generating, false)
  assert.equal(lock.snapshot().hasAbort, false)
  assert.ok(lock.snapshot().ignoreStartsUntil > 1_000)
})

await step('immediate beginStart after stop is blocked (button-swap race)', () => {
  let t = 5_000
  const lock = createComposeGenerateLock(() => t, COMPOSE_GENERATE_STOP_COOLDOWN_MS)
  const started = lock.beginStart()
  assert.equal(started.ok, true)

  lock.stop()
  // Same click / <1s later — must NOT restart generating.
  const blocked = lock.beginStart()
  assert.deepEqual(blocked, { ok: false, reason: 'cooldown' })
  assert.equal(lock.snapshot().hasAbort, false)

  t += COMPOSE_GENERATE_STOP_COOLDOWN_MS
  const again = lock.beginStart()
  assert.equal(again.ok, true)
  if (again.ok) {
    assert.equal(lock.snapshot().hasAbort, true)
    assert.ok(again.gen > (started.ok ? started.gen : 0))
  }
})

await step('stop then stale finally still clears generating; newer start keeps lock', () => {
  let t = 10_000
  const lock = createComposeGenerateLock(() => t, 100)
  const a = lock.beginStart()
  assert.equal(a.ok, true)
  if (!a.ok) return

  lock.stop()
  const ui = { generating: false }
  const finA = lock.finallyUnlock(a.gen, a.abort)
  assert.equal(finA.clearGenerating, true)
  if (finA.clearGenerating) ui.generating = false

  t += 100
  const b = lock.beginStart()
  assert.equal(b.ok, true)
  if (!b.ok) return
  ui.generating = true

  // Late finally from A must not clear B's generating.
  const finALate = lock.finallyUnlock(a.gen, a.abort)
  assert.equal(finALate.clearGenerating, false)
  assert.equal(ui.generating, true)
  assert.equal(lock.snapshot().hasAbort, true)

  const finB = lock.finallyUnlock(b.gen, b.abort)
  assert.equal(finB.clearGenerating, true)
  if (finB.clearOwner) lock.releaseIfOwner(b.abort)
  if (finB.clearGenerating) ui.generating = false
  assert.equal(ui.generating, false)
})

await step('natural success finally clears owner without cooldown', () => {
  const lock = createComposeGenerateLock(() => 20_000, 750)
  const started = lock.beginStart()
  assert.equal(started.ok, true)
  if (!started.ok) return

  const fin = lock.finallyUnlock(started.gen, started.abort)
  assert.equal(fin.clearGenerating, true)
  assert.equal(fin.clearOwner, true)
  if (fin.clearOwner) lock.releaseIfOwner(started.abort)

  assert.equal(lock.snapshot().hasAbort, false)
  assert.equal(lock.snapshot().ignoreStartsUntil, 0)

  const next = lock.beginStart()
  assert.equal(next.ok, true)
})

console.log(failed === 0 ? `ok — ${passed} steps` : `FAIL — ${failed}/${passed + failed} steps`)
process.exit(failed === 0 ? 0 : 1)

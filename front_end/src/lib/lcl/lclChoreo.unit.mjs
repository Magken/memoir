/**
 * LCL choreography: leave then enter, 0.2 overlap, latest-wins hover.
 * Run: npx tsx front_end/src/lib/lcl/lclChoreo.unit.mjs
 */
import assert from 'node:assert/strict'
import { createLclHoverIntent, lclSwap, runLclEnter, runLclLeave } from './lclChoreo.ts'

function stubHandle(log, key, phase, hang = false) {
  let resolveDone
  const done = hang
    ? new Promise(() => {})
    : new Promise((resolve) => {
        resolveDone = resolve
      })
  const ready = Promise.resolve().then(() => {
    log.push(`${phase}:${key}:ready`)
    if (hang) return
    queueMicrotask(() => {
      log.push(`${phase}:${key}:done`)
      resolveDone()
    })
  })
  return { ready, done }
}

function part(log, key, hangOut = false) {
  const el = /** @type {HTMLElement} */ ({})
  return {
    key,
    el,
    out: () => stubHandle(log, key, 'out', hangOut),
    in: () => stubHandle(log, key, 'in'),
  }
}

const gsap = {}
const leaveLog = []
await runLclLeave([part(leaveLog, 'stats'), part(leaveLog, 'rows')], gsap)
assert.deepEqual(leaveLog, [
  'out:stats:ready',
  'out:stats:done',
  'out:rows:ready',
  'out:rows:done',
])

const enterLog = []
await runLclEnter([part(enterLog, 'head'), part(enterLog, 'media')], gsap)
assert.ok(enterLog.indexOf('in:head:ready') < enterLog.indexOf('in:media:ready'))

let committed = false
const swapLog = []
await lclSwap(
  {
    leave: [part(swapLog, 'a')],
    commit: () => {
      committed = true
      swapLog.push('commit')
    },
    enter: () => [part(swapLog, 'b')],
  },
  gsap,
)
assert.ok(committed)
assert.ok(swapLog.indexOf('out:a:done') < swapLog.indexOf('commit'))
assert.ok(swapLog.indexOf('commit') < swapLog.indexOf('in:b:ready'))

let treeUp = false
const waitLog = []
await lclSwap(
  {
    leave: [part(waitLog, 'crumb')],
    commit: () => {
      waitLog.push('commit')
      Promise.resolve().then(() => {
        treeUp = true
        waitLog.push('tree')
      })
    },
    enter: () => {
      waitLog.push(treeUp ? 'enter-after-tree' : 'enter-too-soon')
      return []
    },
  },
  gsap,
)
assert.ok(treeUp, 'enter must wait until the committed trail is up')
assert.equal(waitLog.includes('enter-too-soon'), false)
assert.ok(waitLog.indexOf('tree') < waitLog.indexOf('enter-after-tree'))

function naiveSwap(commit, enter) {
  commit()
  enter()
}
let naiveTree = false
let sameTickEnter = ''
naiveSwap(
  () => {
    Promise.resolve().then(() => {
      naiveTree = true
    })
  },
  () => {
    sameTickEnter = naiveTree ? 'after' : 'too-soon'
  },
)
assert.equal(sameTickEnter, 'too-soon', 'negative: same-tick enter misses the new crumb tree')
assert.equal(naiveTree, false)

let hungCommit = false
const hangLog = []
const hung = lclSwap(
  {
    leave: [part(hangLog, 'stats', true)],
    commit: () => {
      hungCommit = true
    },
    enter: () => [],
  },
  gsap,
)
await new Promise((resolve) => setTimeout(resolve, 30))
assert.equal(hungCommit, false, 'negative: commit waits until every leave done')
void hung

const shown = []
const intent = createLclHoverIntent({
  intentMs: 20,
  restMs: 20,
  show: async (target) => {
    shown.push(target)
  },
})
intent.enter('a')
intent.enter('b')
intent.enter('c')
await new Promise((resolve) => setTimeout(resolve, 50))
assert.deepEqual(shown, ['c'])

const naive = []
function naiveEnter(target) {
  naive.push(target)
}
naiveEnter('a')
naiveEnter('b')
naiveEnter('c')
assert.equal(naive.length, 3, 'negative: without latest-wins every skim would show')
assert.notEqual(shown.length, naive.length)

intent.dispose()
console.log('lclChoreo: ok')

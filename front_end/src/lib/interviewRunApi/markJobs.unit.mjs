/**
 * Mark job generation abort.
 * Run: npx tsx front_end/src/lib/interviewRunApi/markJobs.unit.mjs
 */
import assert from 'node:assert/strict'
import {
  awaitMarkJobs,
  bumpMarkJobGeneration,
  currentMarkGeneration,
  enqueueMarkJob,
  markJobsInflightCount,
  subscribeMarkJobs,
} from './markJobs.ts'

const gen = currentMarkGeneration()
let ran = false
enqueueMarkJob(gen, async () => {
  await new Promise((r) => setTimeout(r, 40))
  ran = true
})
assert.equal(markJobsInflightCount() >= 1, true)
bumpMarkJobGeneration()
await new Promise((r) => setTimeout(r, 80))
assert.equal(ran, false)

let ran2 = false
const g2 = currentMarkGeneration()
enqueueMarkJob(g2, async () => {
  ran2 = true
})
await new Promise((r) => setTimeout(r, 20))
assert.equal(ran2, true)

{
  const g3 = currentMarkGeneration()
  const order = []
  enqueueMarkJob(g3, async () => {
    await new Promise((r) => setTimeout(r, 40))
    order.push(1)
  })
  enqueueMarkJob(g3, async () => {
    order.push(2)
  })
  await new Promise((r) => setTimeout(r, 80))
  assert.deepEqual(order, [1, 2], 'mark jobs must run in enqueue order')
}

{
  const g4 = currentMarkGeneration()
  let fires = 0
  const unsub = subscribeMarkJobs(() => {
    fires += 1
  })
  enqueueMarkJob(g4, async () => {})
  await new Promise((r) => setTimeout(r, 20))
  unsub()
  assert.ok(fires >= 1)
}

{
  const g5 = currentMarkGeneration()
  const seen = []
  enqueueMarkJob(g5, async () => {
    await new Promise((r) => setTimeout(r, 30))
    seen.push('a')
  })
  enqueueMarkJob(g5, async () => {
    seen.push('b')
  })
  await awaitMarkJobs()
  assert.deepEqual(seen, ['a', 'b'])
  assert.equal(markJobsInflightCount(), 0)
}

console.log('markJobs.unit.mjs: ok')

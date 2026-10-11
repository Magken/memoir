/**
 * Landing requirement gate — no DOM.
 * Run: npx tsx front_end/src/lib/interviewRunApi/sessionProbe/requirements.unit.mjs
 */
import assert from 'node:assert/strict'
import { canStartInterview } from './requirements.ts'

assert.equal(
  canStartInterview({
    agreed: true,
    mic: 'pass',
    probe: 'pass',
    gps: 'pass',
    probeAttempted: true,
    online: true,
  }),
  true,
)
assert.equal(
  canStartInterview({
    agreed: false,
    mic: 'pass',
    probe: 'pass',
    gps: 'pass',
    probeAttempted: true,
    online: true,
  }),
  false,
)
assert.equal(
  canStartInterview({
    agreed: true,
    mic: 'fail',
    probe: 'pass',
    gps: 'pass',
    probeAttempted: true,
    online: true,
  }),
  false,
)
assert.equal(
  canStartInterview({
    agreed: true,
    mic: 'pass',
    probe: 'fail',
    gps: 'pass',
    probeAttempted: true,
    online: true,
  }),
  true,
)
assert.equal(
  canStartInterview({
    agreed: true,
    mic: 'pass',
    probe: 'fail',
    gps: 'pass',
    probeAttempted: true,
    online: false,
  }),
  false,
)
assert.equal(
  canStartInterview({
    agreed: true,
    mic: 'pass',
    probe: 'idle',
    gps: 'pass',
    probeAttempted: false,
    online: true,
  }),
  false,
)
assert.equal(
  canStartInterview({
    agreed: true,
    mic: 'pass',
    probe: 'pass',
    gps: 'idle',
    probeAttempted: true,
    online: true,
  }),
  false,
)
assert.equal(
  canStartInterview({
    agreed: true,
    mic: 'pass',
    probe: 'pass',
    gps: 'fail',
    probeAttempted: true,
    online: true,
  }),
  false,
)

console.log('requirements.unit.mjs: ok')

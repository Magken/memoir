/**
 * FE VPN heuristic + GPS mismatch.
 * Run: npx tsx front_end/src/lib/interviewRunApi/sessionProbe/vpnHeuristic.unit.mjs
 */
import assert from 'node:assert/strict'
import { gpsMismatchReason, haversineKm, scoreVpnHeuristic } from './vpnHeuristic.ts'

const none = scoreVpnHeuristic({
  ip: '203.0.113.10',
  timezone: 'Africa/Lagos',
  clientTimezone: 'Africa/Lagos',
  isp: 'MTN Nigeria',
  org: 'MTN',
  webrtcIps: ['203.0.113.10'],
})
assert.equal(none.likely, false)

const cloud = scoreVpnHeuristic({ org: 'DigitalOcean', as: 'AS14061' })
assert.equal(cloud.likely, true)
assert.ok(cloud.reasons.includes('cloud_org'))

assert.ok(haversineKm({ lat: 6.5, lon: 3.4 }, { lat: 40.7, lon: -74 }) > 500)
assert.equal(
  gpsMismatchReason({ lat: 6.5, lon: 3.4 }, { lat: 40.7, lon: -74 }),
  'gps_mismatch',
)
assert.equal(
  gpsMismatchReason({ lat: 40.71, lon: -74.01 }, { lat: 40.72, lon: -74.0 }),
  null,
)

console.log('sessionProbe/vpnHeuristic.unit.mjs: ok')

#!/usr/bin/env node
/**
 * Deterministic contract: live-transcribe client must kill mic tracks + peer on stop.
 * Mirrors the FE start/stop lifecycle with mocks (no browser, no OpenAI, no Edge).
 *
 * Run: node front_end/src/lib/liveTranscribeApi/clientStop.unit.mjs
 */
import assert from 'node:assert/strict'

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
    console.error(`    ${err.message}`)
  }
}

function makeTrack(label) {
  let ended = false
  let enabled = true
  const listeners = new Map()
  return {
    kind: 'audio',
    label,
    get enabled() {
      return enabled
    },
    set enabled(v) {
      enabled = v
    },
    get readyState() {
      return ended ? 'ended' : 'live'
    },
    stop() {
      ended = true
      enabled = false
      for (const fn of listeners.get('ended') ?? []) fn()
    },
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, [])
      listeners.get(type).push(fn)
    },
  }
}

/**
 * Minimal copy of the FE stop/halt/close contract (kept in sync with index.ts).
 * If this drifts, the unit still encodes the required safety properties.
 */
function createSession({ delayGetUserMediaMs = 0, delaySdpMs = 0 } = {}) {
  let pc = null
  let media = null
  let dc = null
  let stopped = false
  let closingTimer = null
  const statuses = []
  const track = makeTrack('mic')
  let getUserMediaStarted = false
  let getUserMediaResolved = false
  let peerClosed = false
  let sdpPosted = false

  const haltMic = () => {
    if (pc) {
      for (const s of pc.getSenders()) {
        try {
          if (s.track) {
            s.track.enabled = false
            s.track.stop()
          }
        } catch {
          /* ignore */
        }
        try {
          pc.removeTrack(s)
        } catch {
          /* ignore */
        }
      }
    }
    if (media) {
      for (const t of media.getTracks()) {
        try {
          t.enabled = false
          t.stop()
        } catch {
          /* ignore */
        }
      }
    }
  }

  const closePeer = () => {
    try {
      dc?.close()
    } catch {
      /* ignore */
    }
    try {
      pc?.close()
    } catch {
      /* ignore */
    }
    peerClosed = true
    pc = null
    media = null
    dc = null
  }

  const teardown = () => {
    if (closingTimer != null) {
      clearTimeout(closingTimer)
      closingTimer = null
    }
    stopped = true
    haltMic()
    closePeer()
    statuses.push('stopped')
  }

  const stop = () => {
    stopped = true
    haltMic()
    if (closingTimer != null) {
      clearTimeout(closingTimer)
      closingTimer = null
    }
    // Immediate peer close — OpenAI realtime must not keep billing after stop.
    closePeer()
    statuses.push('stopped')
  }

  async function start() {
    statuses.push('connecting')
    // Fake Edge mint
    await Promise.resolve()
    if (stopped) {
      teardown()
      return { stop, track, getState }
    }

    getUserMediaStarted = true
    if (delayGetUserMediaMs > 0) {
      await new Promise((r) => setTimeout(r, delayGetUserMediaMs))
    }
    media = {
      getTracks: () => [track],
      getAudioTracks: () => [track],
    }
    getUserMediaResolved = true
    if (stopped) {
      teardown()
      return { stop, track, getState }
    }

    const senders = []
    pc = {
      addTrack(t) {
        const sender = { track: t }
        senders.push(sender)
        return sender
      },
      getSenders: () => senders.slice(),
      removeTrack(s) {
        const i = senders.indexOf(s)
        if (i >= 0) senders.splice(i, 1)
      },
      createDataChannel() {
        dc = { readyState: 'open', close() { this.readyState = 'closed' }, send() {} }
        return dc
      },
      async createOffer() {
        return { sdp: 'v=0', type: 'offer' }
      },
      async setLocalDescription() {},
      async setRemoteDescription() {},
      close() {
        peerClosed = true
      },
    }
    pc.addTrack(track, media)
    pc.createDataChannel('oai-events')

    if (delaySdpMs > 0) {
      await new Promise((r) => setTimeout(r, delaySdpMs))
    }
    sdpPosted = true
    if (stopped) {
      teardown()
      return { stop, track, getState }
    }
    statuses.push('listening')
    return { stop, track, getState }
  }

  function getState() {
    return {
      stopped,
      peerClosed,
      trackState: track.readyState,
      trackEnabled: track.enabled,
      getUserMediaStarted,
      getUserMediaResolved,
      sdpPosted,
      statuses: statuses.slice(),
      senderCount: pc ? pc.getSenders().length : 0,
    }
  }

  return { start, stop, track, getState }
}

/**
 * BoardComposer-style session gate — the UI must not rely on React `listening`
 * alone, or a second click before re-render starts another capture.
 */
function createComposerGate() {
  let session = 0
  let active = false
  let handle = null
  const leaked = []

  async function toggle(startFn) {
    if (active) {
      session += 1
      active = false
      handle?.stop()
      handle = null
      return 'stopped'
    }
    active = true
    const mySession = ++session
    const h = await startFn()
    if (session !== mySession) {
      h.stop()
      leaked.push('cancelled-start-stopped')
      return 'cancelled'
    }
    handle = h
    return 'listening'
  }

  /** Broken toggle that only checks a stale `listening` snapshot (the bug). */
  async function toggleStale(listeningSnapshot, startFn) {
    if (listeningSnapshot) {
      session += 1
      active = false
      handle?.stop()
      handle = null
      return 'stopped'
    }
    // BUG: second click while first is connecting also takes this branch
    active = true
    const mySession = ++session
    const h = await startFn()
    // Also buggy assign without cancel check:
    handle = h
    return 'listening'
  }

  return {
    toggle,
    toggleStale,
    get handle() {
      return handle
    },
    get leaked() {
      return leaked
    },
  }
}

console.log('\nlive-transcribe client stop contract\n')

await step('1 stop after listening → track ended + peer closed', async () => {
  const s = createSession()
  const h = await s.start()
  assert.equal(h.track.readyState, 'live')
  h.stop()
  const st = h.getState()
  assert.equal(st.trackState, 'ended', 'mic track must end')
  assert.equal(st.trackEnabled, false, 'mic track must disable')
  assert.equal(st.peerClosed, true, 'OpenAI peer must close immediately')
  assert.equal(st.senderCount, 0, 'senders removed')
})

await step('2 stop during getUserMedia → late stream still halted', async () => {
  const s = createSession({ delayGetUserMediaMs: 40 })
  const p = s.start()
  // Wait until getUserMedia is in flight, then stop (the mid-acquire race).
  for (let i = 0; i < 40; i++) {
    if (s.getState().getUserMediaStarted) break
    await new Promise((r) => setTimeout(r, 1))
  }
  assert.equal(s.getState().getUserMediaStarted, true, 'getUserMedia should have started')
  s.stop()
  const h = await p
  await new Promise((r) => setTimeout(r, 10))
  const st = h.getState()
  assert.equal(st.getUserMediaResolved, true, 'media did arrive after stop')
  assert.equal(st.trackState, 'ended', 'late media track must still be stopped')
  assert.equal(st.peerClosed, true)
})

await step('3 stop during SDP wait → peer never left open', async () => {
  const s = createSession({ delaySdpMs: 40 })
  const p = s.start()
  await new Promise((r) => setTimeout(r, 5))
  s.stop()
  const h = await p
  const st = h.getState()
  assert.equal(st.trackState, 'ended')
  assert.equal(st.peerClosed, true)
})

await step('4 stale listening double-start LEAKS first session (bug repro)', async () => {
  const gate = createComposerGate()
  const a = createSession({ delayGetUserMediaMs: 30 })
  const b = createSession({ delayGetUserMediaMs: 30 })

  // First click — listening still false
  const p1 = gate.toggleStale(false, () => a.start())
  // Second click before React re-renders — listening STILL false → starts again
  const p2 = gate.toggleStale(false, () => b.start())
  await Promise.all([p1, p2])

  // UI thinks it assigned the latest handle; stop only that one
  gate.handle?.stop()
  await new Promise((r) => setTimeout(r, 50))

  const aState = a.getState()
  const bState = b.getState()
  // Reproduce: first session can remain live after "stop"
  assert.equal(aState.trackState, 'live', 'repro: first mic still live')
  assert.equal(bState.trackState, 'ended', 'second session was stopped')
})

await step('5 session-active gate stops both (fix)', async () => {
  const gate = createComposerGate()
  const a = createSession({ delayGetUserMediaMs: 30 })
  const b = createSession({ delayGetUserMediaMs: 30 })

  const p1 = gate.toggle(() => a.start())
  // Second click while connecting → treated as stop
  const p2 = gate.toggle(() => b.start())
  await Promise.all([p1, p2])
  await new Promise((r) => setTimeout(r, 50))

  const aState = a.getState()
  // First start cancelled by session bump → must be halted
  assert.equal(aState.trackState, 'ended', 'cancelled start must halt mic')
  assert.equal(aState.peerClosed, true)
  assert.ok(gate.leaked.includes('cancelled-start-stopped'))
})

console.log(`\n${passed} passed, ${failed} failed\n`)
process.exit(failed ? 1 : 0)

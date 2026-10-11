/**
 * Wheel over the stage must beat page Lenis and native scroll.
 * Run: node front_end/src/lib/webgl/runtime/core/sceneWheelLock.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  SCENE_WHEEL_LISTENER_OPTIONS,
  bindSceneWheelLock,
  shouldLockSceneWheel,
} from './sceneWheelLock.ts'

const inside = { contains: (node) => node === 'canvas' }
assert.equal(shouldLockSceneWheel(inside, { target: 'canvas' }), true)
assert.equal(
  shouldLockSceneWheel(inside, { target: 'chrome' }),
  false,
  'negative: wheel outside the scene must not lock the page',
)
assert.equal(shouldLockSceneWheel(inside, { target: null }), false, 'negative: a null target must not lock')

const host = {
  contains(node) {
    return node === 'canvas'
  },
  listener: null,
  options: null,
  addEventListener(_type, listener, options) {
    this.listener = listener
    this.options = options
  },
  removeEventListener() {
    this.listener = null
  },
}
const root = {
  listener: null,
  options: null,
  addEventListener(_type, listener, options) {
    this.listener = listener
    this.options = options
  },
  removeEventListener() {
    this.listener = null
  },
}

assert.equal(SCENE_WHEEL_LISTENER_OPTIONS.passive, false)
assert.equal(SCENE_WHEEL_LISTENER_OPTIONS.capture, true)

const off = bindSceneWheelLock(host, true, root)
assert.equal(root.options?.capture, true, 'Lenis listens on window — lock must capture')
assert.equal(root.options?.passive, false, 'wheel lock must be non-passive so preventDefault sticks')
let prevented = false
root.listener({ target: 'canvas', preventDefault() { prevented = true } })
assert.equal(prevented, true, 'wheel over the scene must preventDefault')

let outsidePrevented = false
root.listener({ target: 'chrome', preventDefault() { outsidePrevented = true } })
assert.equal(outsidePrevented, false, 'negative: chrome / page wheel must still scroll')
off()

const idle = {
  contains() { return true },
  addEventListener() { this.bound = true },
  removeEventListener() {},
}
bindSceneWheelLock(idle, false, root)
assert.equal(idle.bound, undefined, 'negative: a disabled lock must not bind wheel')

const stageSrc = fs.readFileSync(fileURLToPath(new URL('./WebglStage.tsx', import.meta.url)), 'utf8')
assert.match(stageSrc, /bindSceneWheelLock\(host,/)
assert.match(stageSrc, /lockPageScroll = true/)
assert.match(stageSrc, /canvasReady && lockPageScroll/)
assert.match(stageSrc, /'data-lenis-prevent-wheel'/, 'Lenis ignores preventDefault without this attribute')
assert.match(stageSrc, /'data-lenis-prevent':/)
assert.doesNotMatch(
  stageSrc,
  /lockPageScroll = false/,
  'negative: toolkit stages must keep page-scroll lock on by default',
)

console.log('sceneWheelLock: ok')

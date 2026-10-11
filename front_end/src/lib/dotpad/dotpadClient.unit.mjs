/**
 * Dot Pad connect sends Ready, a border, and a buzz only after the pad answers.
 * Run: node --experimental-strip-types front_end/src/lib/dotpad/dotpadClient.unit.mjs
 */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  DOTPAD_READY_TEXT,
  borderGraphic,
  brailleLine,
  connectDotPad,
  createDotPadBridge,
  dotPadLiblouisUrl,
  repeatCell,
} from './dotpadClient.ts'

const here = dirname(fileURLToPath(import.meta.url))
const sdkPath = join(here, 'vendor/DotPadSDK-3.0.3.js')
const dataPath = join(here, '../../../public/dotpad/lib/liblouis.data')

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

assert.equal(sha256(sdkPath), '084cea52e8bae885bd6ec64f402e5906677a62c4a4bb6f8ed873b65f244a312a')
assert.equal(sha256(dataPath), '8475e6eaa539639c36353c10a2c38bcd8692ae0f8b47534ee2dd2d8b6fd00192')
const sdk = readFileSync(sdkPath, 'utf8')
assert.match(sdk, /DotPad320X/)
assert.match(sdk, /usbVendorId:1027/)
assert.match(sdk, /baudRate:115200/)

assert.equal(dotPadLiblouisUrl('http://127.0.0.1:5173'), 'http://127.0.0.1:5173/dotpad/lib/')
assert.equal(brailleLine('  Ready  '), 'Ready')
assert.equal(brailleLine('abcdefghijklmnopqrstu'), 'abcdefghijklmnopqrst')
assert.throws(() => brailleLine('   '), /No text/, 'negative: a blank line is not sent')
assert.equal(repeatCell(255, 2), 'ffff')
assert.throws(() => repeatCell(256, 1), /Bad cell/, 'negative: a cell is one byte')
const box = borderGraphic()
assert.equal(box.length, 600)
assert.equal(box.slice(0, 60), 'ff'.repeat(30))
assert.equal(box.slice(60, 64), 'ff00')

const device = {
  isConnect: true,
  numberBrailleCellColumns: 20,
  numberCellColumns: 30,
  numberCellRows: 10,
}

function fakeBridge(overrides = {}) {
  const calls = []
  const bridge = {
    calls,
    setCallBack() {},
    async scan() {
      calls.push('scan')
      return { port: 1 }
    },
    async connect() {
      calls.push('connect')
      return device
    },
    async showText(text) {
      calls.push(['text', text])
    },
    showGraphic(hex) {
      calls.push(['graphic', hex.length])
    },
    pinsUp() {
      calls.push('up')
    },
    pinsDown() {
      calls.push('down')
    },
    buzz() {
      calls.push('buzz')
    },
    disconnect() {
      calls.push('disconnect')
    },
    ...overrides,
  }
  return bridge
}

const ready = fakeBridge()
const live = await connectDotPad(ready, 'usb')
assert.equal(live, device)
assert.deepEqual(ready.calls, ['scan', 'connect', ['text', DOTPAD_READY_TEXT], ['graphic', 600], 'buzz'])

const cancelled = fakeBridge({
  async scan() {
    return undefined
  },
  async connect() {
    throw new Error('connect should not run')
  },
})
await assert.rejects(connectDotPad(cancelled, 'usb'), /No Dot Pad selected/)
assert.deepEqual(cancelled.calls, [], 'negative: a cancelled picker does not write the pad')

const refused = fakeBridge({
  async connect() {
    return null
  },
})
await assert.rejects(connectDotPad(refused, 'ble'), /Dot Pad did not connect/)
assert.equal(refused.calls.includes('buzz'), false, 'negative: a failed connect does not buzz')

const seen = []
const mod = {
  DisplayMode: { TextMode: 'TextMode', GraphicMode: 'GraphicMode' },
  BrailleLanguage: { English: { name: 'English' } },
  GradeOption: { Grade1: 1 },
  LiblouisManager: {
    setAssetBaseUrl(url) {
      seen.push(['asset', url])
    },
  },
  DotPadSDK: class {
    setCallBack(message) {
      this.message = message
    }
    setBrailleLanguage(language, grade) {
      seen.push(['language', language.name, grade])
    }
    setNumberOfBraillePerLine(count) {
      seen.push(['width', count])
    }
    connectUsbDevice(picked) {
      seen.push(['usb', picked])
      return Promise.resolve(device)
    }
    connectBleDevice(picked) {
      seen.push(['ble', picked])
      return Promise.resolve(device)
    }
    displayTextData(text, _device, mode, translate) {
      seen.push(['displayText', text, mode, translate])
      return Promise.resolve()
    }
    displayGraphicData() {}
    displayAllUp() {
      seen.push('all-up')
    }
    displayAllDown() {}
    requestVibrator() {}
    disconnect() {}
  },
  DotPadScanner: class {
    startUsbScan() {
      return Promise.resolve('port')
    }
    startBleScan() {
      return Promise.resolve('radio')
    }
  },
}

const bridge = createDotPadBridge(mod, 'http://localhost:5173/dotpad/lib/')
assert.deepEqual(seen, [
  ['asset', 'http://localhost:5173/dotpad/lib/'],
  ['language', 'English', 1],
  ['width', 20],
])
await bridge.scan('usb')
await bridge.connect('usb', 'port')
await bridge.showText('Hi', device)
bridge.pinsUp(device)
assert.deepEqual(seen.slice(3), [
  ['usb', 'port'],
  ['displayText', 'Hi', 'TextMode', true],
  'all-up',
])
const ble = await bridge.scan('ble')
assert.equal(ble, 'radio')

console.log('dotpadClient: ok')

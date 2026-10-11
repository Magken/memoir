/**
 * Dot Pad X client for `/WGLTOOLKIT?page=dotpad`.
 * Web SDK 3.0.3 (Chrome). USB is FTDI 115200; Bluetooth is the DotPad name.
 * The SDK is imported with the page so the connect click can open the picker immediately.
 */
import {
  BrailleLanguage,
  DisplayMode,
  DotPadSDK,
  DotPadScanner,
  GradeOption,
  LiblouisManager,
} from './vendor/DotPadSDK-3.0.3.js'

export const DOTPAD_TEXT_CELLS = 20
export const DOTPAD_GRAPHIC_COLUMNS = 30
export const DOTPAD_GRAPHIC_ROWS = 10
export const DOTPAD_READY_TEXT = 'Ready'
const CONNECT_TIMEOUT_MS = 8000

export type DotPadLink = 'usb' | 'ble'

export type DotPadDevice = {
  isConnect: boolean
  numberBrailleCellColumns: number
  numberCellColumns: number
  numberCellRows: number
}

export type DotPadMessage = (device: DotPadDevice, code: string) => void

/** Hardware keys: `PanningLeft`, `PanningRight`, `KeyFunction1`–`KeyFunction4`, chords like `KeyFunction14`. */
export type DotPadKeyHandler = (device: DotPadDevice, key: string) => void

export type DotPadBridge = {
  setCallBack(onMessage: DotPadMessage): void
  onKey(handler: DotPadKeyHandler): void
  scan(link: DotPadLink): Promise<unknown>
  connect(link: DotPadLink, picked: unknown): Promise<DotPadDevice | null>
  showText(text: string, device: DotPadDevice): Promise<void>
  showGraphic(hex: string, device: DotPadDevice): void
  pinsUp(device: DotPadDevice): void
  pinsDown(device: DotPadDevice): void
  buzz(device: DotPadDevice): void
  disconnect(device?: DotPadDevice): void
}

type DotPadModule = {
  DisplayMode: { TextMode: string; GraphicMode: string }
  BrailleLanguage: { English: unknown }
  GradeOption: { Grade1: number }
  LiblouisManager: { setAssetBaseUrl(url: string): void }
  DotPadSDK: new () => {
    setCallBack(
      message: (device: DotPadDevice, code: string, msg: string) => void,
      key: (device: DotPadDevice, code: string, msg: string) => void,
    ): void
    setBrailleLanguage(language: unknown, grade: number): void
    setNumberOfBraillePerLine(count: number): void
    connectBleDevice(device: unknown): Promise<DotPadDevice | null>
    connectUsbDevice(device: unknown): Promise<DotPadDevice | null>
    displayTextData(text: string, device: DotPadDevice | null, mode: string, needsTranslation: boolean): Promise<unknown>
    displayGraphicData(hex: string, device: DotPadDevice | null, mode: string): void
    displayAllUp(device: DotPadDevice | null): void
    displayAllDown(device: DotPadDevice | null): void
    requestVibrator(device: DotPadDevice | null): void
    disconnect(device?: DotPadDevice | null): void
  }
  DotPadScanner: new () => {
    startBleScan(): Promise<unknown>
    startUsbScan(): Promise<unknown>
  }
}

export function dotPadLiblouisUrl(origin: string): string {
  return new URL('/dotpad/lib/', origin).href
}

/** One braille line. The pad shows `cells` cells, so longer copy is cut before translation. */
export function brailleLine(text: string, cells = DOTPAD_TEXT_CELLS): string {
  const trimmed = text.trim()
  if (!trimmed) throw new Error('No text')
  if (!Number.isInteger(cells) || cells < 1) throw new Error('Bad cell count')
  return [...trimmed].slice(0, cells).join('')
}

/** Hex for `count` cells, each one byte. */
export function repeatCell(byte: number, count: number): string {
  if (!Number.isInteger(byte) || byte < 0 || byte > 255) throw new Error('Bad cell')
  if (!Number.isInteger(count) || count < 1) throw new Error('Bad cell count')
  return byte.toString(16).padStart(2, '0').repeat(count)
}

/** A box on the 30×10 graphic area. Each cell is two hex digits. */
export function borderGraphic(columns = DOTPAD_GRAPHIC_COLUMNS, rows = DOTPAD_GRAPHIC_ROWS): string {
  if (!Number.isInteger(columns) || !Number.isInteger(rows) || columns < 2 || rows < 2) {
    throw new Error('Bad graphic size')
  }
  const full = repeatCell(0xff, columns)
  const mid = repeatCell(0xff, 1) + repeatCell(0x00, columns - 2) + repeatCell(0xff, 1)
  return full + mid.repeat(rows - 2) + full
}

export function createDotPadBridge(mod: DotPadModule, liblouisUrl: string): DotPadBridge {
  mod.LiblouisManager.setAssetBaseUrl(liblouisUrl)
  const sdk = new mod.DotPadSDK()
  const scanner = new mod.DotPadScanner()
  sdk.setBrailleLanguage(mod.BrailleLanguage.English, mod.GradeOption.Grade1)
  sdk.setNumberOfBraillePerLine(DOTPAD_TEXT_CELLS)
  let onMessage: DotPadMessage = () => {}
  let onKey: DotPadKeyHandler = () => {}
  sdk.setCallBack(
    (device, code) => onMessage(device, code),
    (device, code) => onKey(device, code),
  )
  return {
    setCallBack(next) {
      onMessage = next
    },
    onKey(next) {
      onKey = next
    },
    scan(link) {
      return link === 'ble' ? scanner.startBleScan() : scanner.startUsbScan()
    },
    connect(link, picked) {
      return link === 'ble' ? sdk.connectBleDevice(picked) : sdk.connectUsbDevice(picked)
    },
    async showText(text, device) {
      await sdk.displayTextData(text, device, mod.DisplayMode.TextMode, true)
    },
    showGraphic(hex, device) {
      sdk.displayGraphicData(hex, device, mod.DisplayMode.GraphicMode)
    },
    pinsUp(device) {
      sdk.displayAllUp(device)
    },
    pinsDown(device) {
      sdk.displayAllDown(device)
    },
    buzz(device) {
      sdk.requestVibrator(device)
    },
    disconnect(device) {
      sdk.disconnect(device)
    },
  }
}

async function presentReady(bridge: DotPadBridge, device: DotPadDevice) {
  await bridge.showText(brailleLine(DOTPAD_READY_TEXT), device)
  bridge.showGraphic(borderGraphic(), device)
  bridge.buzz(device)
}

/** Open the picker, wait until the pad is ready, then raise a border and the word Ready. */
export async function connectDotPad(
  bridge: DotPadBridge,
  link: DotPadLink,
  onEvent?: DotPadMessage,
): Promise<DotPadDevice> {
  let resolveReady: (device: DotPadDevice) => void = () => {}
  let rejectReady: (error: Error) => void = () => {}
  const ready = new Promise<DotPadDevice>((resolve, reject) => {
    resolveReady = resolve
    rejectReady = reject
  })
  ready.catch(() => {})
  const timer = setTimeout(() => rejectReady(new Error('Dot Pad did not finish connecting')), CONNECT_TIMEOUT_MS)
  bridge.setCallBack((device, code) => {
    onEvent?.(device, code)
    if (code === 'Connected') {
      clearTimeout(timer)
      resolveReady(device)
    } else if (code === 'ConnectedFail') {
      clearTimeout(timer)
      rejectReady(new Error('Dot Pad connection failed'))
    }
  })
  try {
    const picked = await bridge.scan(link)
    if (picked == null) throw new Error('No Dot Pad selected')
    const device = await bridge.connect(link, picked)
    if (!device) throw new Error('Dot Pad did not connect')
    const live = device.isConnect ? device : await ready
    clearTimeout(timer)
    await presentReady(bridge, live)
    return live
  } catch (error) {
    clearTimeout(timer)
    throw error
  }
}

export function loadDotPadBridge(origin = window.location.origin): Promise<DotPadBridge> {
  return Promise.resolve(
    createDotPadBridge(
      {
        BrailleLanguage,
        DisplayMode,
        DotPadSDK,
        DotPadScanner,
        GradeOption,
        LiblouisManager,
      } as unknown as DotPadModule,
      dotPadLiblouisUrl(origin),
    ),
  )
}

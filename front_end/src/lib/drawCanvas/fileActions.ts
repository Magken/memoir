import {
  exportToBlob,
  exportToSvg,
  loadFromBlob,
  serializeAsJSON,
} from '@excalidraw/excalidraw'
import type { BinaryFiles, ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function serializeDrawScene(api: ExcalidrawImperativeAPI): string {
  return serializeAsJSON(api.getSceneElements(), api.getAppState(), api.getFiles(), 'local')
}

export function saveDrawSceneJson(api: ExcalidrawImperativeAPI, name = 'drawing') {
  const json = serializeDrawScene(api)
  downloadBlob(new Blob([json], { type: 'application/json' }), `${name}.excalidraw`)
}

export async function loadDrawSceneJson(
  api: ExcalidrawImperativeAPI,
  scene: unknown,
  meta?: Record<string, unknown>,
) {
  if (scene && typeof scene === 'object') {
    const record = scene as Record<string, unknown>
    if (typeof record.mermaid === 'string') {
      const { loadMermaidIntoDraw } = await import('../editorContext/drawMermaidImport')
      await loadMermaidIntoDraw(api, record.mermaid, (record.meta as Record<string, unknown>) ?? meta)
      return
    }
    if ('scene' in record) {
      scene = record.scene
    }
  }
  const text = typeof scene === 'string' ? scene : JSON.stringify(scene ?? {})
  const blob = new Blob([text], { type: 'application/json' })
  const file = new File([blob], 'scene.excalidraw', { type: 'application/json' })
  await loadDrawSceneFromFile(api, file)
}

export async function loadDrawSceneFromFile(api: ExcalidrawImperativeAPI, file: File) {
  const contents = await loadFromBlob(file, null, null)
  api.updateScene({
    elements: contents.elements ?? [],
    appState: {
      ...(contents.appState ?? {}),
    },
  })
  if (contents.files) {
    api.addFiles(Object.values(contents.files))
  }
}

export async function exportDrawPng(
  api: ExcalidrawImperativeAPI,
  opts: { withBackground?: boolean; scale?: number } = {},
) {
  const elements = api.getSceneElements()
  const appState = api.getAppState()
  const files = api.getFiles()
  const blob = await exportToBlob({
    elements,
    appState: {
      ...appState,
      exportBackground: opts.withBackground ?? true,
      exportScale: opts.scale ?? 1,
    },
    files: files as BinaryFiles,
    mimeType: 'image/png',
  })
  downloadBlob(blob, `${api.getName() || 'drawing'}.png`)
}

export async function exportDrawSvg(
  api: ExcalidrawImperativeAPI,
  opts: { withBackground?: boolean } = {},
) {
  const elements = api.getSceneElements()
  const appState = api.getAppState()
  const files = api.getFiles()
  const svg = await exportToSvg({
    elements,
    appState: {
      ...appState,
      exportBackground: opts.withBackground ?? true,
    },
    files: files as BinaryFiles,
  })
  const serializer = new XMLSerializer()
  const source = serializer.serializeToString(svg)
  downloadBlob(new Blob([source], { type: 'image/svg+xml' }), `${api.getName() || 'drawing'}.svg`)
}

export function clearDrawScene(api: ExcalidrawImperativeAPI) {
  api.resetScene()
}

function drawShortcutCode(key: string) {
  if (key.length === 1) return `Key${key.toUpperCase()}`
  switch (key) {
    case 'Delete':
      return 'Delete'
    case '=':
      return 'Equal'
    case '-':
      return 'Minus'
    case '0':
      return 'Digit0'
    case '[':
      return 'BracketLeft'
    case ']':
      return 'BracketRight'
    default:
      return key
  }
}

/** Dispatch a shortcut into Excalidraw (`handleKeyboardGlobally` listens on `document`). */
export function dispatchDrawShortcut(
  host: HTMLElement | null,
  key: string,
  mods: { ctrl?: boolean; shift?: boolean; alt?: boolean } = {},
  options: { global?: boolean } = { global: true },
) {
  const useGlobal = options.global !== false
  const target = useGlobal ? document : host
  if (!target) return
  if (host) host.focus()

  const keyLabel = key.length === 1 ? key.toLowerCase() : key
  const event = new KeyboardEvent('keydown', {
    key: keyLabel,
    code: drawShortcutCode(key),
    ctrlKey: Boolean(mods.ctrl),
    metaKey: Boolean(mods.ctrl),
    shiftKey: Boolean(mods.shift),
    altKey: Boolean(mods.alt),
    bubbles: true,
    cancelable: true,
  })
  target.dispatchEvent(event)
}

export function undoDrawScene(host: HTMLElement | null) {
  dispatchDrawShortcut(host, 'z', { ctrl: true })
}

export function redoDrawScene(host: HTMLElement | null) {
  const isWindows = typeof navigator !== 'undefined' && /Win/i.test(navigator.platform)
  if (isWindows) {
    dispatchDrawShortcut(host, 'y', { ctrl: true })
    return
  }
  dispatchDrawShortcut(host, 'z', { ctrl: true, shift: true })
}

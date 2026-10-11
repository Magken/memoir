import { codingCaptureAdapter } from './adapters/coding'
import { docCaptureAdapter } from './adapters/doc'
import { formCaptureAdapter } from './adapters/form'
import type { EditorCaptureAdapter } from './types'

const adapters = new Map<string, EditorCaptureAdapter>()

export function registerEditorCaptureAdapter(adapter: EditorCaptureAdapter): void {
  adapters.set(adapter.kind, adapter)
}

export function getEditorCaptureAdapter(kind: string): EditorCaptureAdapter | null {
  return adapters.get(kind) ?? null
}

export function listEditorCaptureKinds(): string[] {
  return [...adapters.keys()]
}

registerEditorCaptureAdapter(formCaptureAdapter)
registerEditorCaptureAdapter(codingCaptureAdapter)
registerEditorCaptureAdapter(docCaptureAdapter)

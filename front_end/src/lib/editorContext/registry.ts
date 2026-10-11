import { codeContextAdapter } from './adapters/codeContext'
import { docContextAdapter } from './adapters/docContext'
import { drawContextAdapter } from './adapters/drawContext'
import { gridContextAdapter } from './adapters/gridContext'
import { flowContextAdapter } from './adapters/flowContext'
import { markdownContextAdapter } from './adapters/markdownContext'
import { mermaidContextAdapter } from './adapters/mermaidContext'
import { forceContextAdapter } from './adapters/forceContext'
import { botContextAdapter } from './adapters/botContext'
import { dmContextAdapter } from './adapters/dmContext'
import { calendarContextAdapter } from './adapters/calendarContext'
import { testFormContextAdapter } from './adapters/testFormContext'
import type { EditorContextAdapter, EditorKind } from './types'

const ADAPTERS = {
  doc: docContextAdapter,
  grid: gridContextAdapter,
  draw: drawContextAdapter,
  markdown: markdownContextAdapter,
  mermaid: mermaidContextAdapter,
  code: codeContextAdapter,
  flow: flowContextAdapter,
  force: forceContextAdapter,
  bot: botContextAdapter,
  dm: dmContextAdapter,
  calendar: calendarContextAdapter,
  testform: testFormContextAdapter,
} as unknown as Record<EditorKind, EditorContextAdapter<unknown>>

export function getAdapter(kind: EditorKind): EditorContextAdapter<unknown> {
  return ADAPTERS[kind]
}

export function exportFormatsForKind(kind: EditorKind) {
  return getAdapter(kind).supportedFormats
}

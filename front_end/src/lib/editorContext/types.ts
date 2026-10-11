import type { PageSetup } from '../docEditor/pageSetup'
import type { DataGridSheet } from '../dataGridEditor/sheetModel'
import type { CompiledFlowMcpContext, FlowDocument } from '../flowEditor/types'
import type { BotEditorPayload, DmEditorPayload } from '../chat/types'
import type { CalendarEditorPayload } from '../calendar/types'
import type { TestFormEditorPayload as TestFormPayload } from '../testForm/types'

export const EDITOR_CONTEXT_SCHEMA = 'vurify/editor-context' as const

export type EditorKind =
  | 'doc'
  | 'grid'
  | 'draw'
  | 'markdown'
  | 'mermaid'
  | 'code'
  | 'flow'
  | 'force'
  | 'bot'
  | 'dm'
  | 'calendar'
  | 'testform'

export type FormatId =
  | 'envelope-json'
  | 'native-json'
  | 'csv'
  | 'markdown'
  | 'mermaid'
  | 'excalidraw'
  | 'html'
  | 'png'
  | 'svg'
  | 'md'
  | 'tex'
  | 'mmd'
  | 'pdf'
  | 'zip'

export type EditorContextEnvelope = {
  schema: typeof EDITOR_CONTEXT_SCHEMA
  version: 1
  kind: EditorKind
  title?: string
  exportedAt?: string
  meta?: Record<string, unknown>
  payload: unknown
}

export type DocEditorPayload = {
  lexical?: unknown
  pageSetup: PageSetup
  title?: string
  markdown?: string
}

export type GridEditorPayload = DataGridSheet

export type DrawEditorPayload = {
  scene: unknown
}

export type MarkdownEditorPayload = {
  mode: 'markdown' | 'latex'
  markdown: string
  latex?: string
}

export type MermaidEditorPayload = {
  source: string
  viewport?: { zoom: number; pan: { x: number; y: number } }
}

export type ForceGraphEditorPayload = {
  source: string
  viewport?: { zoom: number; pan: { x: number; y: number } }
}

export type CodeEditorPayload = {
  title?: string
  files: Array<{ path: string; language: string; content: string }>
  folders?: string[]
  openIds?: string[]
  activeId?: string | null
}

export type FlowEditorPayload = {
  title?: string
  flow: FlowDocument
  mcpContext?: CompiledFlowMcpContext
}

export type { BotEditorPayload, DmEditorPayload, CalendarEditorPayload }
export type TestFormEditorPayload = TestFormPayload

export type EditorPayloadByKind = {
  doc: DocEditorPayload
  grid: GridEditorPayload
  draw: DrawEditorPayload
  markdown: MarkdownEditorPayload
  mermaid: MermaidEditorPayload
  code: CodeEditorPayload
  flow: FlowEditorPayload
  force: ForceGraphEditorPayload
  bot: BotEditorPayload
  dm: DmEditorPayload
  calendar: CalendarEditorPayload
  testform: TestFormEditorPayload
}

export type EditorActionRequest = {
  kind: EditorKind | string
  actionId: string
  value?: string
  targetId?: string
  payload?: unknown
}

export type EditorActionResult = {
  ok: boolean
  actionId: string
  data?: unknown
  error?: string
}

export type EditorRuntimeHandle = {
  getContext: () => EditorPayloadByKind[EditorKind]
  loadContext: (payload: unknown) => void | Promise<void>
  invokeAction?: (request: EditorActionRequest) => EditorActionResult | Promise<EditorActionResult>
}

export type ImportResult = {
  ok: boolean
  warnings?: string[]
}

export type DemoScenario = {
  id: string
  label: string
  sourceKind: EditorKind
  sourceFormat: FormatId
  fixtureId: string
}

export type EditorContextAdapter<TPayload> = {
  kind: EditorKind
  serialize: (runtime: EditorRuntimeHandle) => TPayload
  deserialize: (payload: TPayload, runtime: EditorRuntimeHandle) => void | Promise<void>
  supportedFormats: FormatId[]
}

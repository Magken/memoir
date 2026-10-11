import type { EditorCatalog } from './types'
import { CODE_CATALOG } from './code'
import { DOC_CATALOG } from './doc'
import { DRAW_CATALOG } from './draw'
import { FILES_CATALOG } from './files'
import { GRID_CATALOG } from './grid'
import { MARKDOWN_CATALOG } from './markdown'
import { MERMAID_CATALOG } from './mermaid'
import { FLOW_CATALOG } from './flow'
import { FORCE_CATALOG } from './force'
import { BOT_CATALOG } from './bot'
import { DM_CATALOG } from './dm'
import { CALENDAR_CATALOG } from './calendar'
import { TESTFORM_CATALOG } from './testform'
import { CREATOR2_CATALOG } from './creator2'
import { COPILOT_CATALOG } from './copilot'

export type EditorCatalogKind =
  | 'doc'
  | 'code'
  | 'grid'
  | 'markdown'
  | 'draw'
  | 'mermaid'
  | 'flow'
  | 'force'
  | 'files'
  | 'bot'
  | 'dm'
  | 'calendar'
  | 'testform'
  | 'creator2'
  | 'copilot'

/** Registered editor catalogs. */
export const EDITOR_CATALOGS: Record<EditorCatalogKind, EditorCatalog> = {
  doc: DOC_CATALOG,
  code: CODE_CATALOG,
  grid: GRID_CATALOG,
  markdown: MARKDOWN_CATALOG,
  draw: DRAW_CATALOG,
  mermaid: MERMAID_CATALOG,
  flow: FLOW_CATALOG,
  force: FORCE_CATALOG,
  files: FILES_CATALOG,
  bot: BOT_CATALOG,
  dm: DM_CATALOG,
  calendar: CALENDAR_CATALOG,
  testform: TESTFORM_CATALOG,
  creator2: CREATOR2_CATALOG,
  copilot: COPILOT_CATALOG,
}

export function getEditorCatalog(kind: EditorCatalogKind): EditorCatalog {
  return EDITOR_CATALOGS[kind]
}

export function allCatalogFeatures(kind: EditorCatalogKind = 'doc') {
  return EDITOR_CATALOGS[kind].features
}

export function actionById(kind: EditorCatalogKind, id: string) {
  return EDITOR_CATALOGS[kind].actions.find((action) => action.id === id)
}

export * from './types'
export { CODE_CATALOG } from './code'
export { DOC_CATALOG } from './doc'
export { DRAW_CATALOG } from './draw'
export { FILES_CATALOG } from './files'
export { GRID_CATALOG } from './grid'
export { MARKDOWN_CATALOG } from './markdown'
export { MERMAID_CATALOG } from './mermaid'
export { FLOW_CATALOG } from './flow'
export { FORCE_CATALOG } from './force'
export { BOT_CATALOG } from './bot'
export { DM_CATALOG } from './dm'
export { CALENDAR_CATALOG } from './calendar'
export { TESTFORM_CATALOG } from './testform'
export { CREATOR2_CATALOG } from './creator2'
export { COPILOT_CATALOG } from './copilot'

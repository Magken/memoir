/**
 * Doc catalog allowlist — maps usable embed/layout IR nodes to Lexical nodes,
 * markdown transformers, and fixture coverage (regression checklist).
 */
export type DocAllowlistRow = {
  irNode: string
  lexicalNodeType?: string
  markdownTransformer?: string
  fixtureCovered: boolean
  notes?: string
}

export const DOC_CATALOG_ALLOWLIST: DocAllowlistRow[] = [
  { irNode: 'horizontal-rule', lexicalNodeType: 'horizontalrule', markdownTransformer: 'HORIZONTAL_RULE', fixtureCovered: true },
  { irNode: 'page-break', lexicalNodeType: 'page-break', markdownTransformer: 'DOC_PAGE_BREAK', fixtureCovered: true },
  { irNode: 'image', lexicalNodeType: 'image', markdownTransformer: 'IMAGE', fixtureCovered: true, notes: 'gif uses image node with gif variant' },
  { irNode: 'poll', lexicalNodeType: 'poll', markdownTransformer: 'DOC_POLL', fixtureCovered: true },
  { irNode: 'equation', lexicalNodeType: 'equation', markdownTransformer: 'DOC_EQUATION', fixtureCovered: true },
  { irNode: 'sticky-note', lexicalNodeType: 'sticky-note', markdownTransformer: 'DOC_STICKY', fixtureCovered: true },
  { irNode: 'collapsible', lexicalNodeType: 'collapsible-container', markdownTransformer: 'DOC_COLLAPSIBLE', fixtureCovered: true },
  { irNode: 'date', lexicalNodeType: 'date', markdownTransformer: 'DOC_DATE', fixtureCovered: true },
  { irNode: 'video', lexicalNodeType: 'video-embed', markdownTransformer: 'DOC_VIDEO', fixtureCovered: true, notes: 'youtube shares video node' },
  { irNode: 'diagram-mermaid', lexicalNodeType: 'code', markdownTransformer: 'DOC_DIAGRAM_FENCED', fixtureCovered: true, notes: 'language mermaid' },
  { irNode: 'diagram-excalidraw', lexicalNodeType: 'code', markdownTransformer: 'DOC_DIAGRAM_FENCED', fixtureCovered: true, notes: 'language excalidraw' },
  { irNode: 'layout', lexicalNodeType: 'layout-container', markdownTransformer: 'DOC_COLUMNS', fixtureCovered: true, notes: 'all column templates share layout node' },
  { irNode: 'table', lexicalNodeType: 'table', markdownTransformer: 'TABLE', fixtureCovered: true },
  { irNode: 'code-block', lexicalNodeType: 'code', markdownTransformer: 'CODE', fixtureCovered: true },
  { irNode: 'link', lexicalNodeType: 'link', markdownTransformer: 'LINK', fixtureCovered: true },
  { irNode: 'quote', lexicalNodeType: 'quote', markdownTransformer: 'QUOTE', fixtureCovered: true },
  { irNode: 'list', lexicalNodeType: 'list', markdownTransformer: 'LIST', fixtureCovered: true },
  { irNode: 'check-list', lexicalNodeType: 'list', markdownTransformer: 'CHECK_LIST', fixtureCovered: true },
  { irNode: 'heading', lexicalNodeType: 'heading', markdownTransformer: 'HEADING', fixtureCovered: true },
  { irNode: 'paragraph', lexicalNodeType: 'paragraph', markdownTransformer: 'PARAGRAPH', fixtureCovered: true },
  { irNode: 'text', lexicalNodeType: 'text', fixtureCovered: true, notes: 'inline formats — GFM + doc directives in fixture' },
  { irNode: 'meta', fixtureCovered: false, notes: 'title/pageSetup — payload chrome, not Lexical tree' },
]

export function allowlistRowForIrNode(irNode: string): DocAllowlistRow | undefined {
  return DOC_CATALOG_ALLOWLIST.find((row) => row.irNode === irNode)
}

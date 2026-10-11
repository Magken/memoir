import type { McpToolDescriptor } from '../types'

export const MCP_CONTEXT_TOOLS: McpToolDescriptor[] = [
  {
    name: 'editor_context_import',
    description: 'Import editor context into a workbench runtime (matches importExportManager.importContext).',
    parameters: [
      { name: 'kind', type: 'string', description: 'Target editor kind: doc | code | grid | draw | markdown | mermaid | flow | force | files', required: true },
      { name: 'format', type: 'string', description: 'Source format id (native-json, markdown, csv, mermaid, envelope-json, zip, excalidraw, md, tex, mmd, …)', required: true },
      { name: 'payload', type: 'string', description: 'Raw text or JSON string to import', required: true },
      { name: 'title', type: 'string', description: 'Optional document title for doc imports' },
    ],
  },
  {
    name: 'editor_context_export',
    description: 'Export editor context from a workbench runtime (matches importExportManager.exportContext).',
    parameters: [
      { name: 'kind', type: 'string', description: 'Editor kind: doc | code | grid | draw | markdown | mermaid | flow | force | files', required: true },
      { name: 'format', type: 'string', description: 'Export format id (envelope-json, native-json, zip, csv, md, tex, mmd, excalidraw, html, pdf, …)', required: true },
    ],
  },
]

export type McpContextImportParams = {
  kind: string
  format: string
  payload: string
  title?: string
}

export function invokeMcpContextImport(_params: McpContextImportParams): never {
  throw new Error('editor_context_import is a stub — wire to importExportManager in a future MCP server pass.')
}

export function invokeMcpContextExport(): never {
  throw new Error('editor_context_export is a stub — wire to importExportManager in a future MCP server pass.')
}

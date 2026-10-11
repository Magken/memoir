import { EDITOR_CATALOGS } from '../editorCatalog/manifest'
import { EDITOR_CONTEXT_SCHEMA } from '../editorContext/types'
import type { McpResourceDescriptor, McpToolDescriptor } from './types'
import { MCP_CATALOG_RESOURCES } from './resources/catalog'
import { MCP_ENVELOPE_RESOURCE, EDITOR_CONTEXT_VERSION } from './resources/envelope'
import { MCP_FIXTURE_RESOURCES } from './resources/fixtures'
import { MCP_ACTION_TOOLS } from './tools/actions'
import { MCP_CONTEXT_TOOLS } from './tools/context'

export const MCP_RESOURCES: McpResourceDescriptor[] = [
  MCP_ENVELOPE_RESOURCE,
  ...MCP_CATALOG_RESOURCES,
  ...MCP_FIXTURE_RESOURCES,
]

export const MCP_TOOLS: McpToolDescriptor[] = [...MCP_CONTEXT_TOOLS, ...MCP_ACTION_TOOLS]

export function listMcpManifest() {
  return {
    schema: EDITOR_CONTEXT_SCHEMA,
    version: EDITOR_CONTEXT_VERSION,
    catalogs: Object.keys(EDITOR_CATALOGS),
    resources: MCP_RESOURCES,
    tools: MCP_TOOLS,
  }
}

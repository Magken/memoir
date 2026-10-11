import { EDITOR_CONTEXT_SCHEMA } from '../../editorContext/types'
import type { McpResourceDescriptor } from '../types'

export const EDITOR_CONTEXT_VERSION = '1'

export const MCP_ENVELOPE_RESOURCE: McpResourceDescriptor = {
  uri: 'editor://schema/envelope',
  name: 'Editor context envelope schema',
  description: 'Envelope schema id and version for editor-context I/O.',
  mimeType: 'application/json',
}

export function readEnvelopeResource(): { schema: string; version: string } {
  return { schema: EDITOR_CONTEXT_SCHEMA, version: EDITOR_CONTEXT_VERSION }
}

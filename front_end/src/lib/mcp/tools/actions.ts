import type { McpToolDescriptor } from '../types'

export const MCP_ACTION_TOOLS: McpToolDescriptor[] = [
  {
    name: 'editor_action_invoke',
    description: 'Invoke a catalog action against a running editor (stub — not implemented).',
    parameters: [
      {
        name: 'kind',
        type: 'string',
        description: 'Editor kind: doc | code | grid | draw | markdown | mermaid | flow | force | files | bot | dm | calendar | testform',
        required: true,
      },
      {
        name: 'actionId',
        type: 'string',
        description: 'Catalog action id (e.g. doc.action.diagram.view-code, bot.action.send, dm.action.react)',
        required: true,
      },
      { name: 'value', type: 'string', description: 'Optional action value (e.g. draft text, emoji)' },
      { name: 'targetId', type: 'string', description: 'Optional target id — conversationId, messageId, attachmentId, participantId, or Lexical node key' },
      { name: 'payload', type: 'object', description: 'Optional structured payload for runtime actions (e.g. append-* message parts)' },
    ],
  },
]

export type McpActionInvokeParams = {
  kind: string
  actionId: string
  value?: string
  targetId?: string
  payload?: unknown
}

/**
 * Stub — not yet wired to a live MCP server. Once wired, this should call
 * `dispatchEditorAction` from `lib/editorContext/actionRegistry` with the
 * runtime handle for the target workbench.
 */
export function invokeMcpAction(_params: McpActionInvokeParams): never {
  throw new Error('editor_action_invoke is a stub — wire to actionRegistry.dispatchEditorAction in a future pass.')
}

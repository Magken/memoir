import { compileFlowMcpContext } from '../../flowEditor/compileFlowMcpContext'
import { ensureFlowLayout } from '../../flowEditor/reactFlowBridge'
import type { FlowDocument, FlowEditorPayload } from '../../flowEditor/types'

export function convertJsonToFlow(input: unknown): { payload: FlowEditorPayload; warnings?: string[] } {
  const parsed = input as FlowEditorPayload
  if (!parsed?.flow?.nodes) {
    throw new Error('Invalid flow payload')
  }
  const flow = ensureFlowLayout(parsed.flow as FlowDocument)
  return {
    payload: {
      title: parsed.title,
      flow,
      mcpContext: compileFlowMcpContext(flow),
    },
  }
}

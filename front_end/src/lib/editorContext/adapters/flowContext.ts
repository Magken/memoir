import { compileFlowMcpContext } from '../../flowEditor/compileFlowMcpContext'
import type { EditorContextAdapter, FlowEditorPayload } from '../types'

export const flowContextAdapter: EditorContextAdapter<FlowEditorPayload> = {
  kind: 'flow',
  supportedFormats: ['envelope-json', 'native-json', 'png'],
  serialize(runtime) {
    const payload = runtime.getContext() as FlowEditorPayload
    return {
      ...payload,
      mcpContext: compileFlowMcpContext(payload.flow),
    }
  },
  deserialize(payload, runtime) {
    return runtime.loadContext(payload)
  },
}

import type { EditorContextAdapter, MermaidEditorPayload } from '../types'

export const mermaidContextAdapter: EditorContextAdapter<MermaidEditorPayload> = {
  kind: 'mermaid',
  supportedFormats: ['envelope-json', 'native-json', 'mermaid', 'mmd', 'svg'],
  serialize(runtime) {
    return runtime.getContext() as MermaidEditorPayload
  },
  deserialize(payload, runtime) {
    return runtime.loadContext(payload)
  },
}

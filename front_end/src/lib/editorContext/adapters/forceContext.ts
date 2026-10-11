import type { EditorContextAdapter, ForceGraphEditorPayload } from '../types'

export const forceContextAdapter: EditorContextAdapter<ForceGraphEditorPayload> = {
  kind: 'force',
  supportedFormats: ['envelope-json', 'native-json', 'svg', 'png'],
  serialize(runtime) {
    return runtime.getContext() as ForceGraphEditorPayload
  },
  deserialize(payload, runtime) {
    return runtime.loadContext(payload)
  },
}

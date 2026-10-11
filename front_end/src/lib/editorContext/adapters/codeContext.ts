import type { CodeEditorPayload, EditorContextAdapter } from '../types'

export const codeContextAdapter: EditorContextAdapter<CodeEditorPayload> = {
  kind: 'code',
  supportedFormats: ['envelope-json', 'native-json', 'zip'],
  serialize(runtime) {
    return runtime.getContext() as CodeEditorPayload
  },
  deserialize(payload, runtime) {
    return runtime.loadContext(payload)
  },
}

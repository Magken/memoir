import type { DmEditorPayload, EditorContextAdapter } from '../types'

export const dmContextAdapter: EditorContextAdapter<DmEditorPayload> = {
  kind: 'dm',
  supportedFormats: ['envelope-json', 'native-json'],
  serialize(runtime) {
    return runtime.getContext() as DmEditorPayload
  },
  deserialize(payload, runtime) {
    return runtime.loadContext(payload)
  },
}

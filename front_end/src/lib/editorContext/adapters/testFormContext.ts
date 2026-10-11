import type { EditorContextAdapter, TestFormEditorPayload } from '../types'

export const testFormContextAdapter: EditorContextAdapter<TestFormEditorPayload> = {
  kind: 'testform',
  supportedFormats: ['envelope-json', 'native-json'],
  serialize(runtime) {
    return runtime.getContext() as TestFormEditorPayload
  },
  deserialize(payload, runtime) {
    return runtime.loadContext(payload)
  },
}

import type { DrawEditorPayload, EditorContextAdapter } from '../types'

export const drawContextAdapter: EditorContextAdapter<DrawEditorPayload> = {
  kind: 'draw',
  supportedFormats: ['envelope-json', 'native-json', 'excalidraw', 'png', 'svg'],
  serialize(runtime) {
    return runtime.getContext() as DrawEditorPayload
  },
  deserialize(payload, runtime) {
    return runtime.loadContext(payload)
  },
}

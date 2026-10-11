import type { BotEditorPayload, EditorContextAdapter } from '../types'

export const botContextAdapter: EditorContextAdapter<BotEditorPayload> = {
  kind: 'bot',
  supportedFormats: ['envelope-json', 'native-json'],
  serialize(runtime) {
    return runtime.getContext() as BotEditorPayload
  },
  deserialize(payload, runtime) {
    return runtime.loadContext(payload)
  },
}

import type { EditorContextAdapter, MarkdownEditorPayload } from '../types'

export const markdownContextAdapter: EditorContextAdapter<MarkdownEditorPayload> = {
  kind: 'markdown',
  supportedFormats: ['envelope-json', 'native-json', 'markdown', 'md', 'tex'],
  serialize(runtime) {
    return runtime.getContext() as MarkdownEditorPayload
  },
  deserialize(payload, runtime) {
    return runtime.loadContext(payload)
  },
}

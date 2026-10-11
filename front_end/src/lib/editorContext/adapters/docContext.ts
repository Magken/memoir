import { DEFAULT_PAGE_SETUP } from '../../docEditor/pageSetup'
import type { DocEditorPayload, EditorContextAdapter } from '../types'

export const docContextAdapter: EditorContextAdapter<DocEditorPayload> = {
  kind: 'doc',
  supportedFormats: ['envelope-json', 'native-json', 'markdown', 'html', 'pdf'],
  serialize(runtime) {
    const ctx = runtime.getContext() as DocEditorPayload & { title?: string }
    return {
      lexical: ctx.lexical,
      pageSetup: ctx.pageSetup ?? DEFAULT_PAGE_SETUP,
    }
  },
  deserialize(payload, runtime) {
    return runtime.loadContext(payload)
  },
}

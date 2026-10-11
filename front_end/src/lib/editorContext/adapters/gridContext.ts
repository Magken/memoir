import { normalizeSheet } from '../../dataGridEditor/sheetModel'
import type { EditorContextAdapter, GridEditorPayload } from '../types'

export const gridContextAdapter: EditorContextAdapter<GridEditorPayload> = {
  kind: 'grid',
  supportedFormats: ['envelope-json', 'native-json', 'csv'],
  serialize(runtime) {
    return normalizeSheet(runtime.getContext() as GridEditorPayload)
  },
  deserialize(payload, runtime) {
    return runtime.loadContext(normalizeSheet(payload as GridEditorPayload))
  },
}

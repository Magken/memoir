import type { CalendarEditorPayload, EditorContextAdapter } from '../types'

export const calendarContextAdapter: EditorContextAdapter<CalendarEditorPayload> = {
  kind: 'calendar',
  supportedFormats: ['envelope-json', 'native-json'],
  serialize(runtime) {
    return runtime.getContext() as CalendarEditorPayload
  },
  deserialize(payload, runtime) {
    return runtime.loadContext(payload)
  },
}

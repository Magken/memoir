import { normalizeTestFormPayload } from '../../testForm/parse'
import type { TestFormEditorPayload } from '../types'

export function convertJsonToTestForm(input: unknown): {
  payload: TestFormEditorPayload
  warnings?: string[]
} {
  return normalizeTestFormPayload(input)
}

import type { CodeEditorPayload, ImportResult } from '../types'

export async function convertJsonToCode(input: unknown): Promise<{
  payload: CodeEditorPayload
  warnings?: string[]
}> {
  const payload =
    typeof input === 'string' ? (JSON.parse(input) as CodeEditorPayload) : (input as CodeEditorPayload)
  return { payload }
}

export async function importCodePayload(
  payload: CodeEditorPayload,
  load: (payload: CodeEditorPayload) => void | Promise<void>,
): Promise<ImportResult> {
  await load(payload)
  return { ok: true }
}

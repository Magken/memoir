/**
 * Apply a tape checkpoint onto a Verify / live mount without leaking oracles.
 */
import type { CodeEditorPayload, DocEditorPayload } from '../../editorContext/types'
import { DEFAULT_PAGE_SETUP } from '../../docEditor/pageSetup'
import type { GateToolMount } from '../resolveGateToolMount'
import type { TestFormDocument } from '../../testForm/types'
import type { CodingFileSnap } from './adapters/coding'
import type { Checkpoint, EditorTape } from './types'

const PAGELESS = { ...DEFAULT_PAGE_SETUP, pageSize: 'pageless' as const }

export function codingPayloadFromCheckpoint(frame: Checkpoint): CodeEditorPayload {
  const files = Array.isArray(frame.files)
    ? (frame.files as CodingFileSnap[]).map((f) => ({
        path: String(f.path ?? ''),
        language: String(f.language ?? ''),
        content: String(f.content ?? ''),
      }))
    : []
  return {
    title: typeof frame.title === 'string' ? frame.title : undefined,
    files,
    openIds: Array.isArray(frame.openIds) ? frame.openIds.map(String) : files.map((f) => f.path),
    activeId: typeof frame.activeId === 'string' ? frame.activeId : files[0]?.path ?? null,
  }
}

export function docPayloadFromCheckpoint(frame: Checkpoint): DocEditorPayload {
  return {
    title: typeof frame.title === 'string' ? frame.title : undefined,
    markdown: typeof frame.markdown === 'string' ? frame.markdown : '',
    pageSetup: PAGELESS,
  }
}

export function formResponsesFromCheckpoint(frame: Checkpoint): TestFormDocument['attempt'] {
  const responses =
    frame.responses && typeof frame.responses === 'object' && !Array.isArray(frame.responses)
      ? (frame.responses as NonNullable<TestFormDocument['attempt']>['responses'])
      : {}
  return { responses }
}

export function overlayCodingMount(
  mount: Extract<GateToolMount, { kind: 'coding' }>,
  tape: EditorTape | null | undefined,
): Extract<GateToolMount, { kind: 'coding' }> {
  if (!tape || tape.kind !== 'coding') return mount
  const workspace = codingPayloadFromCheckpoint(tape.final)
  if (!workspace.files.length) return mount
  return {
    ...mount,
    workspace: {
      ...mount.workspace,
      ...workspace,
      folders: mount.workspace.folders,
    },
  }
}

export function overlayDocMount(
  mount: Extract<GateToolMount, { kind: 'doc' }>,
  tape: EditorTape | null | undefined,
): Extract<GateToolMount, { kind: 'doc' }> {
  if (!tape || tape.kind !== 'doc') return mount
  const document = docPayloadFromCheckpoint(tape.final)
  return {
    ...mount,
    document: {
      ...mount.document,
      ...document,
      pageSetup: mount.document.pageSetup ?? PAGELESS,
    },
  }
}

export function overlayFormDocument(
  document: TestFormDocument,
  tape: EditorTape | null | undefined,
): TestFormDocument {
  if (!tape || tape.kind !== 'form') return document
  const attempt = formResponsesFromCheckpoint(tape.final)
  return {
    ...document,
    attempt: {
      ...(document.attempt ?? {}),
      responses: attempt?.responses ?? {},
    },
  }
}

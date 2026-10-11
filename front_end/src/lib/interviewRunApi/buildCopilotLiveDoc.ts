import { snapshotHashFor, type CopilotLiveDoc } from './copilotApply'
import type { CodeEditorPayload, DocEditorPayload } from '../editorContext/types'
import type { TestFormDocument } from '../testForm/types'
import type { LastVisibleCodeRun } from './buildToolAssessBody'

export function diagnosticsFromCodeRun(
  run: LastVisibleCodeRun | null | undefined,
): CopilotLiveDoc['diagnostics'] {
  if (!run) return undefined
  const r = run.result
  const out: NonNullable<CopilotLiveDoc['diagnostics']> = []
  const compile = String(r.judge0?.compileOutput ?? r.judge0?.stderr ?? '').trim()
  if (compile) {
    out.push({ path: '_compile', line: 1, message: compile.slice(0, 240) })
  }
  const fail = r.cases.find((c) => !c.passed)
  const line = r.lines.find((l) => /error|fail|TypeError|ReferenceError/i.test(l))
  out.push({
    path: '_run',
    line: 1,
    message: `Run ${r.passedCount}/${r.total} passed${fail ? `; firstFail=${fail.id}` : ''}${
      r.status && r.status !== 'ok' ? `; status=${r.status}` : ''
    }${line ? `; ${line.slice(0, 120)}` : ''}`.slice(0, 240),
  })
  return out.slice(0, 4)
}

export function buildCopilotLiveDoc(input: {
  kind: 'form' | 'coding' | 'doc'
  generation: number
  context: unknown
  selection?: CopilotLiveDoc['selection']
  diagnostics?: CopilotLiveDoc['diagnostics']
}): CopilotLiveDoc {
  const base: CopilotLiveDoc = {
    kind: input.kind,
    generation: input.generation,
    snapshotHash: '',
    selection: input.selection,
    diagnostics: input.diagnostics,
  }
  if (input.kind === 'form') {
    const wrapped =
      input.context && typeof input.context === 'object' && 'document' in (input.context as object)
        ? (input.context as { document: TestFormDocument })
        : null
    base.form = (wrapped?.document ?? input.context) as Record<string, unknown>
  } else if (input.kind === 'coding') {
    base.coding = input.context as CodeEditorPayload as Record<string, unknown>
  } else {
    base.doc = input.context as DocEditorPayload as Record<string, unknown>
  }
  base.snapshotHash = snapshotHashFor(base)
  return base
}

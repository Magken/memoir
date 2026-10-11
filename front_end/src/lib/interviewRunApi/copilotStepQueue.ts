/**
 * Candidate Copilot pending-step queue — Keep / Discard / Keep all with dependsOn cascade.
 */
import type { CopilotOp } from './copilotApply'

export type CopilotQueueStepStatus = 'pending' | 'kept' | 'discarded' | 'skipped_dep' | 'failed'

export type CopilotQueueStep = {
  packageId: string
  locus: string
  summary: string
  dependsOn: string[]
  ops: CopilotOp[]
  status: CopilotQueueStepStatus
  /** Why a `failed` step is in the sheet and cannot be kept. */
  reason?: string
}

export type CopilotSheetRow = {
  id: string
  path: string
  label: string
  locked?: boolean
  skipped?: boolean
  reason?: string
}

function depsMet(step: CopilotQueueStep, byId: Map<string, CopilotQueueStep>): boolean {
  return (step.dependsOn ?? []).every((id) => {
    const dep = byId.get(id)
    // A package the candidate cannot act on — never shown, produced no ops, or reported
    // by the Edge as failed — can never reach 'kept'. Blocking on it left the second edit
    // permanently locked behind an earlier edit nobody could satisfy, so Keep was disabled
    // with no way out.
    if (!dep || dep.status === 'failed') return true
    return dep.status === 'kept'
  })
}

function isUnlocked(step: CopilotQueueStep, byId: Map<string, CopilotQueueStep>): boolean {
  if (step.status !== 'pending') return false
  return depsMet(step, byId)
}

function byIdMap(steps: CopilotQueueStep[]): Map<string, CopilotQueueStep> {
  return new Map(steps.map((s) => [s.packageId, s]))
}

function cascadeSkip(steps: CopilotQueueStep[], discardedId: string): CopilotQueueStep[] {
  const skip = new Set<string>([discardedId])
  let grew = true
  while (grew) {
    grew = false
    for (const s of steps) {
      if (s.status !== 'pending') continue
      if (skip.has(s.packageId)) continue
      if ((s.dependsOn ?? []).some((id) => skip.has(id))) {
        skip.add(s.packageId)
        grew = true
      }
    }
  }
  return steps.map((s) => {
    if (s.packageId === discardedId) return { ...s, status: 'discarded' as const }
    if (skip.has(s.packageId) && s.status === 'pending') return { ...s, status: 'skipped_dep' as const }
    return s
  })
}

/** Why a package the Edge could not settle is in the sheet but not clickable. */
const FAILED_STEP_REASON: Record<string, string> = {
  dry_fail: 'The edit could not be written after every retry. Nothing changed here.',
  editors_budget: 'The stage ran out of time before this edit. Ask again for this one.',
  skipped_dep: 'Skipped because the edit it depends on did not land.',
}

export function createCopilotStepQueue(
  raw: Array<{
    packageId?: string
    locus?: string
    summary?: string
    dependsOn?: string[]
    ops?: CopilotOp[]
    status?: string
  }>,
): CopilotQueueStep[] {
  // Failed packages used to be deleted here, before anything could render them. A package
  // that was attempted and lost simply was not in the sheet, which is exactly why the turn
  // read as "it did not even try". They stay, as rows that say what happened.
  return raw
    .filter((s) => Boolean(s))
    .map((s, i) => {
      const status = String(s.status ?? '')
      const failed = FAILED_STEP_REASON[status]
      return {
        packageId: String(s.packageId ?? `pkg.${i + 1}`),
        locus: String(s.locus ?? ''),
        summary: String(s.summary ?? s.locus ?? 'Edit'),
        dependsOn: Array.isArray(s.dependsOn) ? s.dependsOn.map((d) => String(d)) : [],
        ops: Array.isArray(s.ops) ? s.ops : [],
        status: failed ? ('failed' as const) : ('pending' as const),
        reason: failed,
      }
    })
}

/** The steps a candidate can Keep or Discard. Failed rows are shown, never acted on. */
export function actionableCopilotSteps(steps: CopilotQueueStep[]): CopilotQueueStep[] {
  return steps.filter((s) => s.status !== 'failed')
}

function stepFile(step: CopilotQueueStep): string {
  if (step.locus.trim()) return step.locus.trim()
  for (const op of step.ops) {
    const path = 'path' in op ? String((op as { path?: unknown }).path ?? '').trim() : ''
    if (path) return path
  }
  return step.packageId
}

/**
 * One proposal per file, not per planner package.
 *
 * Every package's ops are written against the same turn baseline. Kept one at a time, a
 * later package that rewrites the whole file restores that baseline and silently undoes the
 * package the candidate already accepted. Two rows for one file also collide in the chat
 * sheet, which carries only the path: Keep settles whichever row the editor happens to be
 * showing. Folding same-file packages into a single step means the file's ops are applied
 * together, against the text they were planned on, and the candidate accepts once.
 */
export function mergeCopilotStepsByFile(steps: CopilotQueueStep[]): CopilotQueueStep[] {
  const groupOf = new Map<string, string>()
  const order: string[] = []
  const groups = new Map<string, CopilotQueueStep>()
  // A failed package carries no ops the candidate can accept, so folding it into a
  // same-file proposal would hide a real edit behind a reason line.
  const failed = steps.filter((s) => s.status === 'failed')
  for (const step of steps) {
    if (step.status === 'failed') continue
    const file = stepFile(step)
    groupOf.set(step.packageId, file)
    const hit = groups.get(file)
    if (!hit) {
      order.push(file)
      groups.set(file, { ...step, locus: file, ops: [...step.ops], dependsOn: [...step.dependsOn] })
      continue
    }
    hit.ops.push(...step.ops)
    hit.dependsOn.push(...step.dependsOn)
    if (step.summary && !hit.summary.includes(step.summary)) hit.summary = `${hit.summary} · ${step.summary}`
  }
  const merged = order.map((file) => {
    const group = groups.get(file)!
    const deps = new Set<string>()
    for (const dep of group.dependsOn) {
      const target = groupOf.get(dep) ?? dep
      if (target !== file) deps.add(target)
    }
    return { ...group, packageId: file, dependsOn: [...deps] }
  })
  return [...merged, ...failed]
}

export function queueFromFlatOps(ops: CopilotOp[]): CopilotQueueStep[] {
  if (!ops.length) return []
  return [
    {
      packageId: 'pkg.single',
      locus: ('path' in ops[0]! && ops[0].path) || ('questionId' in ops[0]! && ops[0].questionId) || 'edit',
      summary: 'Proposed edit',
      dependsOn: [],
      ops,
      status: 'pending',
    },
  ]
}

export function keepCopilotStep(steps: CopilotQueueStep[], id: string): CopilotQueueStep[] {
  const byId = byIdMap(steps)
  const hit = byId.get(id)
  if (!hit || !isUnlocked(hit, byId)) return steps
  return steps.map((s) => (s.packageId === id ? { ...s, status: 'kept' as const } : s))
}

export function discardCopilotStep(steps: CopilotQueueStep[], id: string): CopilotQueueStep[] {
  const byId = byIdMap(steps)
  const hit = byId.get(id)
  if (!hit || hit.status !== 'pending') return steps
  if (!isUnlocked(hit, byId) && (hit.dependsOn ?? []).length) return steps
  return cascadeSkip(steps, id)
}

export function keepAllCopilotSteps(steps: CopilotQueueStep[]): {
  steps: CopilotQueueStep[]
  order: string[]
} {
  let next = steps
  const order: string[] = []
  let progressed = true
  while (progressed) {
    progressed = false
    const byId = byIdMap(next)
    const unlocked = next.filter((s) => isUnlocked(s, byId))
    if (!unlocked.length) break
    for (const s of unlocked) {
      next = keepCopilotStep(next, s.packageId)
      order.push(s.packageId)
      progressed = true
    }
  }
  return { steps: next, order }
}

export function discardAllCopilotSteps(steps: CopilotQueueStep[]): CopilotQueueStep[] {
  return steps.map((s) =>
    s.status === 'pending' ? { ...s, status: s.dependsOn.length ? 'skipped_dep' : 'discarded' } : s,
  )
}

export function copilotSheetRows(steps: CopilotQueueStep[]): CopilotSheetRow[] {
  const byId = byIdMap(steps)
  return steps
    .filter((s) => s.status === 'pending' || s.status === 'failed')
    .map((s) => ({
      id: s.packageId,
      path: s.locus || s.packageId,
      label: s.summary,
      locked: s.status === 'failed' ? false : !isUnlocked(s, byId),
      skipped: s.status === 'failed',
      reason: s.reason,
    }))
}

export function pendingCopilotCount(steps: CopilotQueueStep[]): number {
  return steps.filter((s) => s.status === 'pending').length
}

export function unlockedPendingIds(steps: CopilotQueueStep[]): string[] {
  const byId = byIdMap(steps)
  return steps.filter((s) => isUnlocked(s, byId)).map((s) => s.packageId)
}

export function stepById(steps: CopilotQueueStep[], id: string): CopilotQueueStep | undefined {
  return steps.find((s) => s.packageId === id || s.locus === id)
}

export function anyKept(steps: CopilotQueueStep[]): boolean {
  return steps.some((s) => s.status === 'kept')
}

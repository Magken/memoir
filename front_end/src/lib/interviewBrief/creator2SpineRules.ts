/**
 * Creator-2 spine rules for `when` / `onFail` / `references` authoring.
 * Earlier = before current in `phases[]` order; forward = after current.
 */

export type SpineRef = { id: string; title: string }

export type SpineStepRef = SpineRef & {
  kind?: string
  topicId?: string
  toolRef?: string
}

/** Index of `phaseId` in ordered spine ids (−1 if missing). */
export function spineIndexOf(orderedIds: readonly string[], phaseId: string): number {
  return orderedIds.indexOf(phaseId)
}

/** Phases strictly before `currentPhaseId` (for phaseCompleted / prior refs). */
export function earlierPhaseOptions(
  ordered: readonly SpineRef[],
  currentPhaseId: string,
): SpineRef[] {
  const idx = spineIndexOf(
    ordered.map((p) => p.id),
    currentPhaseId,
  )
  if (idx <= 0) return []
  return ordered.slice(0, idx)
}

/** Phases strictly after `currentPhaseId` (for onFail goToPhase — no loops / re-entry). */
export function forwardJumpOptions(
  ordered: readonly SpineRef[],
  currentPhaseId: string,
): SpineRef[] {
  const idx = spineIndexOf(
    ordered.map((p) => p.id),
    currentPhaseId,
  )
  if (idx < 0) return ordered.filter((p) => p.id !== currentPhaseId)
  return ordered.slice(idx + 1)
}

/**
 * Topics bound to discussion phases before `currentPhaseId`.
 * Target equals / filled may only reference these (after their topic_end).
 */
export function earlierTopicOptions(
  orderedTalk: readonly SpineStepRef[],
  currentPhaseId: string,
): SpineRef[] {
  const idx = spineIndexOf(
    orderedTalk.map((p) => p.id),
    currentPhaseId,
  )
  const prior = idx < 0 ? orderedTalk : orderedTalk.slice(0, idx)
  const seen = new Set<string>()
  const out: SpineRef[] = []
  for (const step of prior) {
    const topicId = step.topicId
    if (!topicId || seen.has(topicId)) continue
    seen.add(topicId)
    out.push({ id: topicId, title: step.title })
  }
  return out
}

/** Tool refs from tool phases before `currentPhaseId`. */
export function earlierToolOptions(
  orderedTools: readonly SpineStepRef[],
  currentPhaseId: string,
): SpineRef[] {
  const idx = spineIndexOf(
    orderedTools.map((p) => p.id),
    currentPhaseId,
  )
  const prior = idx < 0 ? orderedTools : orderedTools.slice(0, idx)
  const seen = new Set<string>()
  const out: SpineRef[] = []
  for (const step of prior) {
    const toolRef = step.toolRef
    if (!toolRef || seen.has(toolRef)) continue
    seen.add(toolRef)
    out.push({ id: toolRef, title: step.title })
  }
  return out
}

export function isForwardJump(
  orderedIds: readonly string[],
  fromPhaseId: string,
  toPhaseId: string,
): boolean {
  const from = spineIndexOf(orderedIds, fromPhaseId)
  const to = spineIndexOf(orderedIds, toPhaseId)
  if (from < 0 || to < 0) return false
  return to > from
}

/** Drop when-conditions that reference the current or later spine (self/future). */
export function scrubWhenToEarlier(
  when: { all?: Array<Record<string, unknown>>; any?: Array<Record<string, unknown>> } | null | undefined,
  prior: {
    phaseIds: ReadonlySet<string>
    topicIds: ReadonlySet<string>
    toolRefs: ReadonlySet<string>
  },
): typeof when {
  if (!when) return when
  const keep = (c: Record<string, unknown>) => {
    if (typeof c.toolPassed === 'string') {
      // Empty = authoring draft — keep so Always → All/Any can stick.
      if (!c.toolPassed.trim()) return true
      return prior.toolRefs.has(c.toolPassed)
    }
    if (typeof c.phaseCompleted === 'string') {
      if (!c.phaseCompleted.trim()) return true
      return prior.phaseIds.has(c.phaseCompleted)
    }
    const te = c.targetEquals as { topicId?: string } | undefined
    if (te && typeof te === 'object') {
      if (!te.topicId?.trim()) return true
      return prior.topicIds.has(te.topicId)
    }
    return false
  }
  const all = when.all?.filter(keep)
  const any = when.any?.filter(keep)
  if (!all?.length && !any?.length) return null
  return {
    ...(all?.length ? { all } : {}),
    ...(any?.length ? { any } : {}),
  }
}

/** Prior spine sets for scrubbing `when` on `currentPhaseId`. */
export function priorSpineSets(
  phases: readonly { id: string; topicId?: string; toolRef?: string }[],
  currentPhaseId: string,
): {
  phaseIds: Set<string>
  topicIds: Set<string>
  toolRefs: Set<string>
} {
  const idx = spineIndexOf(
    phases.map((p) => p.id),
    currentPhaseId,
  )
  const prior = idx < 0 ? [] : phases.slice(0, idx)
  return {
    phaseIds: new Set(prior.map((p) => p.id)),
    topicIds: new Set(prior.map((p) => p.topicId).filter(Boolean) as string[]),
    toolRefs: new Set(prior.map((p) => p.toolRef).filter(Boolean) as string[]),
  }
}

/** Author-facing default labels for seed Decision folder ids. Not a closed allowlist. */
import { countedGradeTemplateIds } from '../../../../back_end/supabase/functions/interview-brief-edit/templateRoster.ts'

export { countedGradeTemplateIds }

export const ROLLUP_WEIGHT_LABELS: Record<string, string> = {
  formMark: 'Form gate (not blended into soft score)',
  codingTests: 'Coding tests',
  codingMethod: 'Coding approach',
  essay: 'Written essay',
  interviewDelivery: 'Interview delivery',
  interviewContent: 'Interview content / ownership',
}

export const FE_ROLLUP_SOFT_KEYS = [
  'codingTests',
  'codingMethod',
  'essay',
  'interviewDelivery',
  'interviewContent',
] as const

export type RollupWeightValue = number | string

/** Prompt-1 / blank-slate Decision soft weights (formMark excluded from sum). */
export const PROMPT1_DECISION_WEIGHTS: Record<string, number | 'gate_only'> = {
  formMark: 'gate_only',
  codingTests: 0.25,
  codingMethod: 0.1,
  essay: 0.15,
  interviewDelivery: 0.2,
  interviewContent: 0.3,
}

export type SpineSectionRef = {
  id: string
  title?: string
  kind?: string
  toolType?: string
}

function isSoftNumeric(key: string, value: RollupWeightValue): boolean {
  if (key === 'formMark' || value === 'gate_only') return false
  if (typeof value === 'number') return Number.isFinite(value)
  const n = Number.parseFloat(String(value))
  return Number.isFinite(n)
}

function asNumber(value: RollupWeightValue): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const n = Number.parseFloat(String(value))
  return Number.isFinite(n) ? n : 0
}

/**
 * When the author edits one soft weight, redistribute the delta across other
 * numeric soft weights so the pool always sums to 1.0. formMark / gate_only
 * is never part of the pool.
 */
export function rebalanceSoftWeights(
  weights: Record<string, RollupWeightValue>,
  editedKey: string,
  nextValue: RollupWeightValue,
): Record<string, RollupWeightValue> {
  const next: Record<string, RollupWeightValue> = { ...weights }
  if (editedKey === 'formMark' || nextValue === 'gate_only') {
    next[editedKey] = nextValue
    return next
  }

  let edited = Math.max(0, Math.min(1, asNumber(nextValue)))
  const softKeys = Object.keys(next).filter((k) => isSoftNumeric(k, next[k]!))
  if (!softKeys.includes(editedKey)) softKeys.push(editedKey)

  const others = softKeys.filter((k) => k !== editedKey)
  if (!others.length) {
    next[editedKey] = edited
    return next
  }

  if (edited >= 1) {
    next[editedKey] = 1
    for (const k of others) next[k] = 0
    return next
  }

  const remain = 1 - edited
  const otherSum = others.reduce((s, k) => s + Math.max(0, asNumber(next[k]!)), 0)

  next[editedKey] = edited
  if (otherSum <= 1e-9) {
    const each = remain / others.length
    for (const k of others) next[k] = each
  } else {
    for (const k of others) {
      const share = Math.max(0, asNumber(next[k]!)) / otherSum
      next[k] = remain * share
    }
  }

  // Fix rounding residual on the largest other key.
  const softSum =
    asNumber(next[editedKey]!) + others.reduce((s, k) => s + asNumber(next[k]!), 0)
  const drift = 1 - softSum
  if (Math.abs(drift) > 1e-9) {
    const positive = others.filter((k) => asNumber(next[k]!) > 1e-9)
    const pool = positive.length ? positive : others
    let largest = pool[0]!
    for (const k of pool) {
      if (asNumber(next[k]!) > asNumber(next[largest]!)) largest = k
    }
    next[largest] = Math.max(0, asNumber(next[largest]!) + drift)
  }

  // Round to 4 decimals for stable UI/chips.
  for (const k of softKeys) {
    next[k] = Math.round(asNumber(next[k]!) * 10000) / 10000
  }
  return next
}

function asSectionWeight(raw: unknown): number | undefined {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 0) return raw
  if (typeof raw === 'string' && raw.trim()) {
    const n = Number.parseFloat(raw.trim())
    if (Number.isFinite(n) && n >= 0) return n
  }
  return undefined
}

/** Equal counted shares that sum to 1. Last id absorbs the rounding residual. */
export function evenSoftShares(ids: readonly string[]): Record<string, number> {
  const live = [...new Set(ids.map(String).filter(Boolean))]
  const n = live.length
  const out: Record<string, number> = {}
  if (!n) return out
  let allocated = 0
  live.forEach((id, i) => {
    const raw = n === 1 ? 1 : Math.round((1 / n) * 10000) / 10000
    const w = i === n - 1 ? Math.round((1 - allocated) * 10000) / 10000 : raw
    allocated += w
    out[id] = w
  })
  return out
}

function rescaleCountedShares(
  counted: readonly string[],
  current: Record<string, number | string> | null | undefined,
): Record<string, number> {
  const present = counted.map((id) => Math.max(0, asSectionWeight(current?.[id]) ?? 0))
  const sum = present.reduce((s, n) => s + n, 0)
  if (sum <= 1e-9) return evenSoftShares(counted)
  const shares: Record<string, number> = {}
  let allocated = 0
  counted.forEach((id, i) => {
    const raw = Math.round((present[i]! / sum) * 10000) / 10000
    const w = i === counted.length - 1 ? Math.round((1 - allocated) * 10000) / 10000 : raw
    allocated += w
    shares[id] = w
  })
  return shares
}

/**
 * Counted analysis chips on a section always sum to 1. `0` stays graded, not counted.
 * Missing keys or N>1 all at 1 even-split. A single counted chip may be 1.
 */
export function ensureSectionTemplateWeights(
  liveIds: readonly string[],
  current?: Record<string, number | string> | null,
): Record<string, number> {
  const live = countedGradeTemplateIds(liveIds)
  if (!live.length) return {}
  const zeros: string[] = []
  const counted: string[] = []
  for (const id of live) {
    if (asSectionWeight(current?.[id]) === 0) zeros.push(id)
    else counted.push(id)
  }
  if (!counted.length) {
    return Object.fromEntries(live.map((id) => [id, 0]))
  }
  const authored = counted.map((id) => asSectionWeight(current?.[id]))
  const missingSome = authored.some((v) => v === undefined)
  const allOnes = counted.length > 1 && authored.every((v) => v === undefined || v === 1)
  const shares =
    missingSome || allOnes ? evenSoftShares(counted) : rescaleCountedShares(counted, current)
  const out: Record<string, number> = { ...shares }
  for (const id of zeros) out[id] = 0
  return out
}

/**
 * Edit one section chip and shrink/grow the other counted chips so they still sum to 1.
 * Explicit `0` siblings stay 0. A single counted chip snaps to 1.
 */
export function rebalanceSectionTemplateWeights(
  liveIds: readonly string[],
  current: Record<string, number | string> | undefined,
  editedKey: string,
  nextValue: number,
): Record<string, number> {
  const live = countedGradeTemplateIds(liveIds)
  const key = String(editedKey ?? '').trim()
  if (!key || !live.includes(key)) {
    return ensureSectionTemplateWeights(live, current)
  }
  const edited = Math.max(0, Math.min(1, nextValue))
  const frozenZeros = live.filter((id) => id !== key && asSectionWeight(current?.[id]) === 0)
  const poolIds = live.filter((id) => !frozenZeros.includes(id))
  const pool: Record<string, RollupWeightValue> = {}
  for (const id of poolIds) {
    pool[id] = id === key ? edited : (asSectionWeight(current?.[id]) ?? 0)
  }
  const rebalanced = rebalanceSoftWeights(pool, key, edited)
  const out: Record<string, number> = {}
  for (const id of live) {
    if (frozenZeros.includes(id)) out[id] = 0
    else out[id] = asNumber(rebalanced[id] ?? 0)
  }
  const counted = live.filter((id) => (out[id] ?? 0) > 0)
  if (counted.length === 1) out[counted[0]!] = 1
  for (const id of live) {
    out[id] = Math.round((out[id] ?? 0) * 10000) / 10000
  }
  return out
}

/**
 * Default Decision weight → spine section map (Prompt-1 grouping).
 * - formMark → forms only
 * - codingTests + codingMethod → same coding section(s)
 * - essay → writing/doc
 * - interviewContent → opening + ownership/body (not closing)
 * - interviewDelivery → opening + ownership/body + closing
 */
export function inferWeightSections(input: {
  phases: Array<{
    id?: string
    kind?: string
    title?: string
    toolRef?: string
    isOpening?: boolean
    isClosing?: boolean
  }>
  tools?: Record<string, { type?: string; editorKind?: string; title?: string } | undefined>
}): Record<string, string[]> {
  const tools = input.tools ?? {}
  const formIds: string[] = []
  const codingIds: string[] = []
  const docIds: string[] = []
  const contentTalkIds: string[] = []
  const deliveryTalkIds: string[] = []

  for (const p of input.phases ?? []) {
    const id = String(p.id ?? '').trim()
    if (!id) continue
    if (p.kind === 'discussion') {
      const title = String(p.title ?? '')
      const closing =
        p.isClosing === true || /\b(clos|wrap.?up|candidate\s+questions|anything\s+left)\b/i.test(title)
      if (closing) {
        deliveryTalkIds.push(id)
        continue
      }
      contentTalkIds.push(id)
      deliveryTalkIds.push(id)
      continue
    }
    const tool = tools[String(p.toolRef ?? '')] ?? {}
    const t = String(tool.type ?? '')
    const ek = String(tool.editorKind ?? '')
    const hay = `${p.title ?? ''} ${tool.title ?? ''}`
    if (
      t === 'form_quiz' ||
      ek === 'testform' ||
      /form/i.test(t) ||
      /\b(eligibility|screening|authorization)\b/i.test(hay)
    ) {
      formIds.push(id)
    } else if (t === 'coding' || ek === 'code' || /cod/i.test(t) || /\bcoding|rate-?limiter\b/i.test(hay)) {
      codingIds.push(id)
    } else if (
      t === 'doc' ||
      ek === 'doc' ||
      /writ|essay/i.test(t) ||
      /\b(writing|essay|architecture|design\s+note)\b/i.test(hay)
    ) {
      docIds.push(id)
    }
  }

  const uniq = (ids: string[]) => [...new Set(ids)]
  const out: Record<string, string[]> = {}
  if (formIds.length) out.formMark = uniq(formIds)
  if (codingIds.length) {
    out.codingTests = uniq(codingIds)
    out.codingMethod = uniq(codingIds)
  }
  if (docIds.length) out.essay = uniq(docIds)
  if (contentTalkIds.length) out.interviewContent = uniq(contentTalkIds)
  if (deliveryTalkIds.length) out.interviewDelivery = uniq(deliveryTalkIds)
  return out
}

/** Drop weightSections entries for missing phases / dropped weight keys. */
export function scrubWeightSections(
  weightSections: Record<string, string[]> | null | undefined,
  livePhaseIds: ReadonlySet<string> | readonly string[],
  liveWeightKeys?: ReadonlySet<string> | readonly string[],
): Record<string, string[]> {
  const live =
    livePhaseIds instanceof Set ? livePhaseIds : new Set([...livePhaseIds].map(String))
  const keyAllow =
    liveWeightKeys == null
      ? null
      : liveWeightKeys instanceof Set
        ? liveWeightKeys
        : new Set([...liveWeightKeys].map(String))
  const src = weightSections && typeof weightSections === 'object' ? weightSections : {}
  const out: Record<string, string[]> = {}
  for (const [key, ids] of Object.entries(src)) {
    if (keyAllow && !keyAllow.has(key)) continue
    if (!Array.isArray(ids)) continue
    const next = ids.map(String).filter((id) => live.has(id))
    if (next.length) out[key] = next
  }
  return out
}

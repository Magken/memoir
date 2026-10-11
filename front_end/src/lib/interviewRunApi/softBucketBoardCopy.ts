/**
 * Board Soft Decision glance copy for soft-grade buckets — plugs into output cards.
 */
import { rollupFolderLabel } from '../interviewBrief/rollupFolders'
import { ordinalToUnit } from './ordinalMaps'
import type { AnalysisGrainStub, InterviewResponse } from './talkTypes'

export type SoftGradeAxis = {
  key: string
  label: string
  unit: number
}

type SoftGradeSourceRef = {
  templateId: string
  hostRef: string
  unit: number
}

type ToolPackageLike = {
  summary?: string
  boardSummary?: string
  boardSummaryDetail?: string
  kind?: string
  assessorNotes?: string[]
  gaps?: string[]
  metaReview?: { conflicts?: string[] }
  items?: Array<{ id?: string; label?: string; notes?: string; flaggedForReview?: boolean }>
}

function pct(unit: number | null | undefined): string {
  if (unit == null || !Number.isFinite(unit)) return '—'
  return `${Math.round(unit * 100)}%`
}

function grainForSource(
  response: InterviewResponse,
  source: SoftGradeSourceRef,
): AnalysisGrainStub | null {
  const row = response.analysis.tools?.[source.hostRef]
  if (row?.[source.templateId]) return row[source.templateId]!
  const topic = response.analysis.topics?.[source.hostRef]
  if (topic?.byTemplate?.[source.templateId]) return topic.byTemplate[source.templateId]!
  const turn = response.analysis.turns?.[source.hostRef]
  if (turn?.[source.templateId]) return turn[source.templateId]!
  for (const t of Object.values(response.analysis.turns ?? {})) {
    if (t[source.templateId]) return t[source.templateId]!
  }
  return null
}

function axisPrefix(templateId: string): { key: string; label: string } | null {
  const iv = templateId.match(/^iv\.([^.]+)/)
  if (iv) {
    const slug = iv[1]
    const titled = slug.replace(/[_-]+/g, ' ')
    return { key: slug, label: titled.charAt(0).toUpperCase() + titled.slice(1) }
  }
  if (templateId === 'mark.code.structure.v1') return { key: 'structure', label: 'Structure' }
  if (templateId.startsWith('custom.')) {
    const slug = templateId.replace(/^custom\./, '').replace(/\.v\d+$/, '').replace(/[_-]+/g, ' ')
    return { key: `custom.${slug}`, label: slug.charAt(0).toUpperCase() + slug.slice(1) }
  }
  return null
}

function axesFromGrain(grain: AnalysisGrainStub, templateId: string): SoftGradeAxis[] {
  const dims = grain.dimensions
  if (!Array.isArray(dims) || dims.length < 1) return []
  const prefix = axisPrefix(templateId)
  const out: SoftGradeAxis[] = []
  for (const d of dims) {
    const dimKey = String(d.key ?? '').trim()
    const dimLabel = String(d.label ?? dimKey).trim() || dimKey
    if (!dimKey) continue
    let unit = ordinalToUnit({
      templateId,
      dimKey,
      score: d.score,
    })
    if (unit == null && typeof d.max === 'number' && d.max > 1) {
      const head = String(d.score ?? '').trim().match(/^(\d+)/)
      if (head) {
        const n = Number(head[1])
        if (n >= 1 && n <= d.max) unit = (n - 1) / (d.max - 1)
      }
    }
    if (unit == null) continue
    out.push({
      key: prefix ? `${prefix.key}.${dimKey}` : dimKey,
      label: prefix ? `${prefix.label} · ${dimLabel}` : dimLabel,
      unit,
    })
  }
  return out
}

function boardFromGrainResult(grain: AnalysisGrainStub | null): {
  summary?: string
  detail?: string
} {
  if (!grain) return {}
  const r = grain.result as {
    boardSummary?: string
    boardSummaryDetail?: string
  } | null
  const summary = r?.boardSummary?.trim() || ''
  const detail = r?.boardSummaryDetail?.trim() || ''
  return {
    summary: summary || undefined,
    detail: detail || undefined,
  }
}

function packageForHost(
  response: InterviewResponse,
  hostRef: string,
): ToolPackageLike | null {
  const pkg = response.analysis.toolPackages?.[hostRef]
  return pkg && typeof pkg === 'object' ? (pkg as ToolPackageLike) : null
}

function fallbackSummary(key: string, unit: number | null, included: boolean): string {
  if (!included) {
    return 'This section was excluded from the overall score for this run.'
  }
  const score = pct(unit)
  switch (key) {
    case 'codingTests':
      return unit != null && unit >= 0.85
        ? `Cleared most of the suite (${score}). Tests read as a solid pass signal.`
        : unit != null && unit >= 0.5
          ? `Partial pass on the suite (${score}). Enough signal to continue, not enough to call it settled.`
          : `Coding tests landed low (${score}). Treat this as a hard miss unless environment noise applies.`
    case 'codingMethod':
      return `Coding approach scored ${score} overall. Read the axes under See more for approach, clarity, and complexity.`
    case 'essay':
      return `Written essay scored ${score} against the authored matrix. Glance the bands under See more.`
    case 'interviewDelivery':
      return `Interview delivery scored ${score}. Composure and structure notes sit under See more.`
    case 'interviewContent':
      return `Interview content / ownership scored ${score}. Specificity and ownership signals sit under See more.`
    default:
      return `Section scored ${score}.`
  }
}

function fallbackDetail(
  key: string,
  axes: SoftGradeAxis[],
  notes: string[],
): string | undefined {
  const parts: string[] = []
  if (axes.length) {
    parts.push(
      axes.map((a) => `${a.label} ${Math.round(a.unit * 100)}%`).join(' · '),
    )
  }
  for (const n of notes.slice(0, 3)) {
    if (n.trim()) parts.push(n.trim())
  }
  if (!parts.length) {
    if (key === 'codingTests') {
      return 'No case-level notes attached. This bucket only has the suite score for this run.'
    }
    return undefined
  }
  return parts.join(' ')
}

function firstSentence(text: string, max = 220): string {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (!cleaned) return ''
  const m = cleaned.match(/^(.+?[.!?])(?:\s|$)/)
  return (m?.[1] ?? cleaned).slice(0, max)
}

/**
 * Build board Soft Decision label + glance summary + See more detail + axes
 * for one soft-weight bucket. Prefers assessor `boardSummary` when present.
 */
export function buildSoftBucketBoardCopy(input: {
  key: string
  unit: number | null
  included: boolean
  sources: SoftGradeSourceRef[]
  response: InterviewResponse
  weightLabels?: Record<string, string> | null
}): {
  label: string
  summary: string
  summaryDetail?: string
  axes?: SoftGradeAxis[]
} {
  // formMark only reaches board copy when the author weighted it, so the catalogue's
  // "gate only" wording would read as a contradiction next to its share of the score.
  const label =
    input.key === 'formMark'
      ? 'Form answer key'
      : rollupFolderLabel(input.key, input.weightLabels)
  const axes: SoftGradeAxis[] = []
  const notes: string[] = []
  let boardSummary = ''
  let boardDetail = ''

  for (const source of input.sources) {
    const grain = grainForSource(input.response, source)
    if (grain) {
      for (const a of axesFromGrain(grain, source.templateId)) {
        if (!axes.some((x) => x.key === a.key)) axes.push(a)
      }
      const fromGrain = boardFromGrainResult(grain)
      if (!boardSummary && fromGrain.summary) boardSummary = fromGrain.summary
      if (!boardDetail && fromGrain.detail) boardDetail = fromGrain.detail
      if (grain.justification?.trim()) notes.push(grain.justification.trim())
    }
    const pkg = packageForHost(input.response, source.hostRef)
    if (pkg) {
      if (!boardSummary && pkg.boardSummary?.trim()) boardSummary = pkg.boardSummary.trim()
      if (!boardDetail && pkg.boardSummaryDetail?.trim()) {
        boardDetail = pkg.boardSummaryDetail.trim()
      }
      if (!boardSummary && pkg.summary?.trim() && input.sources.length === 1) {
        // Single-source tool bucket: package summary is ok as glance fallback
        boardSummary = pkg.summary.trim().slice(0, 220)
      }
      for (const n of pkg.assessorNotes ?? []) notes.push(String(n))
      for (const g of pkg.gaps ?? []) notes.push(`Gap: ${String(g)}`)
      for (const c of pkg.metaReview?.conflicts ?? []) notes.push(`Conflict: ${String(c)}`)
      for (const item of pkg.items ?? []) {
        if (item.flaggedForReview && item.notes?.trim()) {
          notes.push(`${item.label ?? item.id ?? 'item'}: ${item.notes.trim()}`)
        }
      }
    }
  }

  // Talk buckets: topic synthesis as glance + detail when present
  if (input.key === 'interviewDelivery' || input.key === 'interviewContent') {
    for (const source of input.sources) {
      const synth = input.response.analysis.topics?.[source.hostRef]?.synthesisText?.trim()
      if (!synth) continue
      if (!boardSummary) boardSummary = firstSentence(synth)
      if (!boardDetail) boardDetail = synth.slice(0, 500)
      break
    }
    if (!boardSummary && notes[0]) boardSummary = notes[0].slice(0, 220)
  }

  const summary =
    boardSummary || fallbackSummary(input.key, input.unit, input.included)
  const summaryDetail =
    boardDetail || fallbackDetail(input.key, axes, notes) || undefined

  return {
    label,
    summary: summary.slice(0, 280),
    summaryDetail: summaryDetail?.slice(0, 600),
    axes: axes.length >= 1 ? axes : undefined,
  }
}

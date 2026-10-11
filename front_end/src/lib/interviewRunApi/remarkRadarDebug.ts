/**
 * Copyable Remark radar DIAG — grain homes, axis scores, notes types, Why length.
 * Paste this after Remark so empty Why / Not scored / Weak-at-center is visible.
 */
import type { Creator2BriefDocument } from '../interviewBrief/creator2BriefTypes'
import {
  attachedTemplateIdsForStep,
  axisDisplayReading,
  axisDisplayWhy,
  grainCandidatesForPhaseTemplate,
  grainForPhaseTemplate,
  locusForPhaseId,
  radarFromAttachedTemplate,
} from './resultHomes'
import type { AnalysisGrainStub, InterviewResponse } from './talkTypes'

function clip(text: string, max: number): string {
  const t = String(text ?? '').trim().replace(/\s+/g, ' ')
  if (!t) return '—'
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`
}

function valueType(value: unknown): string {
  if (value == null) return String(value)
  if (Array.isArray(value)) return 'array'
  return typeof value
}

function preview(value: unknown, max = 96): string {
  if (value == null) return '—'
  if (typeof value === 'string') return clip(value, max)
  try {
    return clip(JSON.stringify(value), max)
  } catch {
    return valueType(value)
  }
}

function resultNotesBag(grain: AnalysisGrainStub | null | undefined): unknown {
  const result = grain?.result
  if (!result || typeof result !== 'object' || Array.isArray(result)) return null
  return (result as { notes?: unknown }).notes ?? null
}

function dimForKey(grain: AnalysisGrainStub | null | undefined, key: string) {
  return (grain?.dimensions ?? []).find((d) => String(d.key ?? '').trim() === key)
}

export function formatRemarkRadarDebug(input: {
  briefId?: string
  brief: Creator2BriefDocument
  response: InterviewResponse
}): string {
  const lines: string[] = [
    '======== Remark radar DIAG (copy) ========',
    `briefId=${input.briefId || input.response.briefId || '—'}  phases=${input.brief.phases.length}  completed=${input.response.completedPhaseIds.length}`,
  ]
  for (const phase of input.brief.phases) {
    const locus = locusForPhaseId(input.brief, phase.id)
    const ids = attachedTemplateIdsForStep(input.brief, phase.id)
    lines.push(
      `PHASE ${phase.id} kind=${phase.kind} toolRef=${locus.toolRef || '—'} topicId=${locus.topicId || '—'}`,
    )
    for (const templateId of ids) {
      const candidates = grainCandidatesForPhaseTemplate(input.response, locus, templateId)
      const picked = grainForPhaseTemplate(input.response, locus, templateId)
      const pickedRow = candidates.find((row) => row.grain === picked)
      const radar = radarFromAttachedTemplate({
        id: `${phase.id}:${templateId}`,
        templateId,
        grain: picked,
        brief: input.brief,
        toolRef: locus.toolRef,
      })
      const title = radar?.label ?? templateId
      if (!radar) continue
      lines.push(`  TEMPLATE ${templateId}  title=${title}`)
      lines.push(
        pickedRow
          ? `    PICKED: ${pickedRow.home}:${pickedRow.key} status=${picked?.status ?? '—'} grain=${picked?.grain ?? '—'} dims=${picked?.dimensions?.length ?? 0} just=${preview(picked?.justification, 80)}`
          : picked
            ? `    PICKED: (unlisted) status=${picked.status ?? '—'} dims=${picked.dimensions?.length ?? 0}`
            : '    PICKED: none',
      )
      if (!candidates.length) {
        lines.push('    CANDIDATES: (none)')
      } else {
        lines.push('    CANDIDATES:')
        for (const row of candidates) {
          const bag = resultNotesBag(row.grain)
          const dimNotes = (row.grain.dimensions ?? []).map((d) => {
            const n = d.notes
            return `${d.key}:${valueType(n)}`
          })
          lines.push(
            `      ${row.home}:${row.key} status=${row.grain.status ?? '—'} dims=${row.grain.dimensions?.length ?? 0} notesBag=${valueType(bag)} dimNotes=${dimNotes.join(',') || '—'} just=${preview(row.grain.justification, 72)}`,
          )
        }
      }
      if (!radar?.axes.length) {
        lines.push('    AXES: (none)')
        continue
      }
      lines.push('    AXES:')
      for (const axis of radar.axes) {
        const dim = dimForKey(picked, axis.key)
        const bag = resultNotesBag(picked)
        const bagHit =
          bag && typeof bag === 'object' && !Array.isArray(bag)
            ? (bag as Record<string, unknown>)[axis.key]
            : undefined
        const why = axisDisplayWhy(axis)
        lines.push(
          `      ${axis.key} score=${axis.score ?? '—'} reading=${axisDisplayReading(axis)} unit=${axis.unit.toFixed(2)} absent=${axis.absent ? 'yes' : 'no'} whyLen=${why.length} notes=${valueType(dim?.notes)}/${preview(dim?.notes, 48)} bag=${valueType(bagHit)}/${preview(bagHit, 48)}`,
        )
      }
    }
  }
  const trace = (input.response.analysis.markTrace ?? []).slice(-8)
  if (trace.length) {
    lines.push('TRACE (newest last 8):')
    for (const row of trace) {
      const stages = (row.stages ?? [])
        .map((s) => `${s.stage}:${s.status}${s.error ? `!${clip(s.error, 40)}` : ''}`)
        .join('→')
      lines.push(
        `  ${row.at} ${row.hostRef} kind=${row.kind} src=${row.source}${row.failed ? ` failed=${clip(row.failed, 60)}` : ''} ${stages || '—'}`,
      )
    }
  } else {
    lines.push('TRACE: (none)')
  }
  lines.push('======== end Remark radar DIAG ========')
  return lines.join('\n')
}

export function logRemarkRadarDebug(text: string): void {
  const chunks = text.split(/(?=PHASE )/)
  for (const chunk of chunks) {
    const block = chunk.trimEnd()
    if (block) console.log(block)
  }
}

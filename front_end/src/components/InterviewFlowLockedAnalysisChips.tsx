import { Lock } from 'lucide-react'
import { Chip } from './Chip'
import { Tooltip } from './Tooltip'
import { VurifyCountInput } from './VurifyCountInput'
import { labelTemplate, summarizeTemplate } from '../lib/interviewBrief/analysisLabels'
import { countsInDecision } from '../../../back_end/supabase/functions/interview-brief-edit/templateRoster.ts'
import {
  ensureSectionTemplateWeights,
  rebalanceSectionTemplateWeights,
} from '../lib/interviewBrief/rollupWeights'

type InterviewFlowLockedAnalysisChipsProps = {
  templateIds: readonly string[]
  /** Authored per-template weights. Missing / all-1s display as an even split summing to 1. */
  weights?: Record<string, number>
  onWeightsChange?: (weights: Record<string, number>) => void
  className?: string
  debug?: boolean
}

export function TemplateChipWeight({
  templateId: _templateId,
  value,
  onChange,
}: {
  templateId: string
  value: number
  onChange: (weight: number) => void
}) {
  return (
    <VurifyCountInput
      label="Weight"
      size="sm"
      min={0}
      max={1}
      step={0.05}
      maxDigits={4}
      allowDecimal
      className="theme-interview-flow-talk__template-weight-count"
      value={String(value)}
      onValueChange={(raw) => {
        const n = Number.parseFloat(raw)
        if (!Number.isFinite(n)) return
        onChange(Math.min(1, Math.max(0, n)))
      }}
    />
  )
}

/**
 * Display-only Analysis chips for Form / Coding / Writing — no Add, no dismiss.
 * Grey lock mark so authors can see these are implied, not shelf-attached.
 */
export function InterviewFlowLockedAnalysisChips({
  templateIds,
  weights,
  onWeightsChange,
  className = '',
  debug = false,
}: InterviewFlowLockedAnalysisChipsProps) {
  if (debug) {
    console.debug('[InterviewFlowLockedAnalysisChips]', { count: templateIds.length })
  }
  if (!templateIds.length) {
    return <p className="type-caption type-faint mb-0">No locked analysis for this tool</p>
  }
  const displayWeights = ensureSectionTemplateWeights(templateIds, weights)
  return (
    <div
      className={[
        'theme-chip-group theme-interview-flow-talk__attach-chips theme-interview-flow-talk__attach-weights theme-interview-flow-locked-chips',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="Locked analysis templates"
    >
      {templateIds.map((id) => (
        <div key={id} className="theme-interview-flow-talk__template-weight">
          <Tooltip
            content={`${summarizeTemplate(id)} (locked — implied for this tool)`}
            placement="top"
          >
            <Chip size="sm" className="theme-interview-flow-locked-chips__chip">
              <Lock className="theme-interview-flow-locked-chips__icon size-3 shrink-0" aria-hidden />
              <span>{labelTemplate(id)}</span>
            </Chip>
          </Tooltip>
          {onWeightsChange && countsInDecision(id) ? (
            <TemplateChipWeight
              templateId={id}
              value={displayWeights[id] ?? 0}
              onChange={(weight) =>
                onWeightsChange(
                  rebalanceSectionTemplateWeights(templateIds, displayWeights, id, weight),
                )
              }
            />
          ) : null}
        </div>
      ))}
    </div>
  )
}

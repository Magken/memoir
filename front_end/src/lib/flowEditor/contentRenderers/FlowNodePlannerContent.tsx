import { memo } from 'react'
import { Input } from '../../../components/Input'
import { Select } from '../../../components/Select'
import { useFlowEditorUi } from '../FlowEditorUiContext'
import type { FlowNodeContentProps } from './types'
import {
  PLANNER_STATUS_OPTIONS,
  type PlannerNodeConfig,
  type PlannerStatus,
} from '../../websitePlanner/types'

function asConfig(raw: Record<string, unknown> | undefined): PlannerNodeConfig {
  return (raw ?? {}) as PlannerNodeConfig
}

function FlowNodePlannerContentInner({ nodeId, data, expanded }: FlowNodeContentProps) {
  const { updateNodeConfig } = useFlowEditorUi()
  if (!expanded) return null

  const config = asConfig(data.config)
  const status = (config.status ?? 'planned') as PlannerStatus
  const phase = typeof config.phase === 'string' ? config.phase : ''
  const summary = typeof config.summary === 'string' ? config.summary : ''
  const continuesAs = typeof config.continuesAs === 'string' ? config.continuesAs : ''
  const hotWire = typeof config.hotWire === 'string' ? config.hotWire : ''
  const feLibs = typeof config.feLibs === 'string' ? config.feLibs : ''

  const patch = (next: Partial<PlannerNodeConfig>) => {
    updateNodeConfig(nodeId, { ...config, ...next })
  }

  return (
    <div
      className="theme-website-planner__node-fields"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <Select
        size="xs"
        label="Status"
        options={PLANNER_STATUS_OPTIONS}
        value={status}
        onChange={(value) => patch({ status: value as PlannerStatus })}
      />
      <Input
        size="xs"
        shadowless
        aria-label="Phase"
        placeholder="Phase (e.g. frontend)"
        value={phase}
        onChange={(e) => patch({ phase: e.target.value })}
      />
      <Input
        size="xs"
        shadowless
        aria-label="Summary"
        placeholder="Short responsibility"
        value={summary}
        onChange={(e) => patch({ summary: e.target.value })}
      />
      <Input
        size="xs"
        shadowless
        aria-label="Continues as"
        placeholder="Continues as (optional later-scene role)"
        value={continuesAs}
        onChange={(e) => patch({ continuesAs: e.target.value })}
      />
      {hotWire ? (
        <p className="type-caption type-muted theme-website-planner__node-hotwire mb-0">{hotWire}</p>
      ) : null}
      {feLibs ? (
        <p className="type-caption type-faint theme-website-planner__node-libs mb-0">{feLibs}</p>
      ) : null}
      <span
        className={`theme-website-planner__status theme-website-planner__status--${status}`}
        aria-hidden
      >
        {status}
      </span>
    </div>
  )
}

export const FlowNodePlannerContent = memo(FlowNodePlannerContentInner)

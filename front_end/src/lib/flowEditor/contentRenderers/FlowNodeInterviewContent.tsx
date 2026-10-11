import { memo } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '../../../components/Button'
import { Checkbox } from '../../../components/Checkbox'
import { Input } from '../../../components/Input'
import { NumberInput } from '../../../components/NumberInput'
import { Select } from '../../../components/Select'
import { Tag } from '../../../components/Tag'
import { Textarea } from '../../../components/Textarea'
import { useFlowEditorUi } from '../FlowEditorUiContext'
import type { FlowNodeContentProps } from './types'
import { INTERVIEW_KIND } from '../../interviewBrief/types'
import type {
  InterviewDiscussionConfig,
  InterviewMetaConfig,
  InterviewProbeConfig,
  InterviewToolConfig,
  InterviewTopicConfig,
  InterviewToolType,
} from '../../interviewBrief/types'

const TOOL_TYPE_OPTIONS: readonly { value: InterviewToolType; label: string }[] = [
  { value: 'coding', label: 'Coding' },
  { value: 'doc', label: 'Doc' },
  { value: 'form_quiz', label: 'Form quiz' },
]

function nextProbeId(probes: InterviewProbeConfig[]): string {
  let max = 0
  for (const probe of probes) {
    const match = /^p(\d+)$/i.exec(probe.id)
    if (match) max = Math.max(max, Number(match[1]))
  }
  return `p${max + 1}`
}

function MetaFields({
  nodeId,
  config,
  patch,
}: {
  nodeId: string
  config: InterviewMetaConfig
  patch: (next: Partial<InterviewMetaConfig>) => void
}) {
  void nodeId
  return (
    <>
      <Input
        size="xs"
        shadowless
        label="Title"
        value={config.title ?? ''}
        onChange={(e) => patch({ title: e.target.value })}
      />
      <Input
        size="xs"
        shadowless
        label="Role title"
        value={config.roleTitle ?? ''}
        onChange={(e) => patch({ roleTitle: e.target.value })}
      />
      <NumberInput
        size="xs"
        shadowless
        label="Minutes"
        value={typeof config.estimatedMinutes === 'number' ? config.estimatedMinutes : undefined}
        onValueChange={(next) => patch({ estimatedMinutes: next ?? undefined })}
      />
      <Input
        size="xs"
        shadowless
        label="Persona name"
        value={config.personaName ?? ''}
        onChange={(e) => patch({ personaName: e.target.value })}
      />
      <Input
        size="xs"
        shadowless
        label="Persona voice"
        value={config.personaVoice ?? ''}
        onChange={(e) => patch({ personaVoice: e.target.value })}
      />
      <div className="theme-interview-creator__node-status">
        <span className="type-caption type-muted">Status</span>
        <Tag size="xs">draft</Tag>
      </div>
    </>
  )
}

function TopicFields({
  config,
  patch,
}: {
  config: InterviewTopicConfig
  patch: (next: Partial<InterviewTopicConfig>) => void
}) {
  const probes = Array.isArray(config.probes) ? config.probes : []

  const setProbes = (next: InterviewProbeConfig[]) => patch({ probes: next })

  return (
    <>
      <Input
        size="xs"
        shadowless
        label="Topic label"
        value={config.label ?? ''}
        onChange={(e) => patch({ label: e.target.value })}
      />
      <div className="theme-interview-creator__probe-list">
        <p className="type-caption type-muted mb-0">Probes</p>
        {probes.map((probe, index) => (
          <div key={probe.id} className="theme-interview-creator__probe-row">
            <Input
              size="xs"
              shadowless
              aria-label={`Probe ${probe.id} goal`}
              value={probe.goal}
              onChange={(e) => {
                const next = probes.map((p, i) =>
                  i === index ? { ...p, goal: e.target.value } : p,
                )
                setProbes(next)
              }}
            />
            <Button
              size="xs"
              variant="ghost"
              aria-label={`Remove probe ${probe.id}`}
              onClick={() => setProbes(probes.filter((_, i) => i !== index))}
            >
              <Trash2 size={14} strokeWidth={2} aria-hidden />
            </Button>
          </div>
        ))}
        <Button
          size="xs"
          variant="ghost"
          onClick={() =>
            setProbes([
              ...probes,
              { id: nextProbeId(probes), goal: '', templateIds: [] },
            ])
          }
        >
          <Plus size={14} strokeWidth={2} aria-hidden />
          Add probe
        </Button>
      </div>
    </>
  )
}

function DiscussionFields({
  nodeId,
  config,
  patch,
}: {
  nodeId: string
  config: InterviewDiscussionConfig
  patch: (next: Partial<InterviewDiscussionConfig>) => void
}) {
  const { connectedTargetLabel } = useFlowEditorUi()
  const topicLabel = connectedTargetLabel(nodeId, 'topic')

  return (
    <>
      <p className="type-caption mb-0 theme-muted">
        {[
          config.isOpening ? 'Opening (first discussion)' : null,
          config.isClosing ? 'Closing (last discussion)' : null,
        ]
          .filter(Boolean)
          .join(' · ') || 'Middle discussion — move to start/end for opening/closing'}
      </p>
      <p className="type-caption mb-0">
        {topicLabel ? (
          <>
            Topic: <span className="type-accent">{topicLabel}</span>
          </>
        ) : (
          <span className="type-muted">Connect a topic</span>
        )}
      </p>
      <Textarea
        size="xs"
        shadowless
        label="Notes"
        rows={2}
        value={config.notes ?? ''}
        onChange={(e) => patch({ notes: e.target.value })}
      />
    </>
  )
}

function ToolFields({
  config,
  patch,
}: {
  config: InterviewToolConfig
  patch: (next: Partial<InterviewToolConfig>) => void
}) {
  const toolType = (config.toolType ?? 'coding') as InterviewToolType
  return (
    <>
      <Input
        size="xs"
        shadowless
        label="Tool ref"
        value={config.toolRef ?? ''}
        onChange={(e) => patch({ toolRef: e.target.value })}
      />
      <Select
        size="xs"
        label="Type"
        options={TOOL_TYPE_OPTIONS}
        value={toolType}
        onChange={(next) => patch({ toolType: next as InterviewToolType })}
      />
      <Input
        size="xs"
        shadowless
        label="Title"
        value={config.title ?? ''}
        onChange={(e) => patch({ title: e.target.value })}
      />
      <Checkbox
        size="xs"
        label="Required"
        checked={config.required !== false}
        onChange={(checked) => patch({ required: checked })}
      />
    </>
  )
}

function FlowNodeInterviewContentInner({ nodeId, data, expanded }: FlowNodeContentProps) {
  const { updateNodeConfig } = useFlowEditorUi()
  if (!expanded) return null

  const config = data.config ?? {}

  const patch = (next: Record<string, unknown>) => {
    updateNodeConfig(nodeId, { ...config, ...next })
  }

  return (
    <div
      className="theme-interview-creator__node-fields"
      onPointerDown={(e) => e.stopPropagation()}
    >
      {data.kind === INTERVIEW_KIND.meta ? (
        <MetaFields
          nodeId={nodeId}
          config={config as InterviewMetaConfig}
          patch={patch}
        />
      ) : null}
      {data.kind === INTERVIEW_KIND.topic ? (
        <TopicFields config={config as InterviewTopicConfig} patch={patch} />
      ) : null}
      {data.kind === INTERVIEW_KIND.discussion ? (
        <DiscussionFields
          nodeId={nodeId}
          config={config as InterviewDiscussionConfig}
          patch={patch}
        />
      ) : null}
      {data.kind === INTERVIEW_KIND.tool ? (
        <ToolFields config={config as InterviewToolConfig} patch={patch} />
      ) : null}
    </div>
  )
}

export const FlowNodeInterviewContent = memo(FlowNodeInterviewContentInner)

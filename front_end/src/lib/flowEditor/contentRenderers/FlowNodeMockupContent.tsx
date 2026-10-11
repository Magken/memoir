import { memo } from 'react'
import { Checkbox } from '../../../components/Checkbox'
import { Input } from '../../../components/Input'
import { MockupBlock } from '../../../components/MockupBlock'
import { Select } from '../../../components/Select'
import { useFlowEditorUi } from '../FlowEditorUiContext'
import type { FlowNodeContentProps } from './types'
import {
  MOCKUP_ICON_OPTIONS,
  mockupKindFromNode,
  parseMockupPills,
  readMockupConfig,
  type MockupIconId,
  type MockupNodeConfig,
} from '../../mockups/types'

function FlowNodeMockupContentInner({ nodeId, data, expanded }: FlowNodeContentProps) {
  const { updateNodeConfig } = useFlowEditorUi()
  const kind = mockupKindFromNode(data.kind)
  const config = readMockupConfig(data.config)

  if (!expanded) {
    return (
      <MockupBlock
        kind={kind}
        title={config.title || data.label}
        kicker={config.kicker}
        body={config.body}
        pills={parseMockupPills(config.pills)}
        iconId={config.iconId}
        gleam={config.gleam}
        defaultOpen={config.defaultOpen}
        step={config.step}
        metric={config.metric}
        compact
        embedded
      />
    )
  }

  const patch = (next: Partial<MockupNodeConfig>) => {
    updateNodeConfig(nodeId, { ...config, ...next })
  }

  return (
    <div className="theme-mockup__node-fields" onPointerDown={(event) => event.stopPropagation()}>
      <Input
        size="xs"
        shadowless
        aria-label="Kicker"
        placeholder="Kicker"
        value={config.kicker ?? ''}
        onChange={(event) => patch({ kicker: event.target.value })}
      />
      <Input
        size="xs"
        shadowless
        aria-label="Title"
        placeholder="Title"
        value={config.title ?? ''}
        onChange={(event) => patch({ title: event.target.value })}
      />
      <Input
        size="xs"
        shadowless
        aria-label="Body"
        placeholder="Body"
        value={config.body ?? ''}
        onChange={(event) => patch({ body: event.target.value })}
      />
      {kind === 'step' ? (
        <Input
          size="xs"
          shadowless
          aria-label="Step"
          placeholder="Step (01)"
          value={config.step ?? ''}
          onChange={(event) => patch({ step: event.target.value })}
        />
      ) : null}
      {kind === 'metric' ? (
        <Input
          size="xs"
          shadowless
          aria-label="Metric"
          placeholder="Metric"
          value={config.metric ?? ''}
          onChange={(event) => patch({ metric: event.target.value })}
        />
      ) : null}
      {kind === 'pills' || kind === 'callout' ? (
        <>
          <Select
            size="xs"
            label="Icon"
            options={[...MOCKUP_ICON_OPTIONS]}
            value={config.iconId ?? 'sparkles'}
            onChange={(value) => patch({ iconId: value as MockupIconId })}
          />
          {kind === 'pills' ? (
            <Input
              size="xs"
              shadowless
              aria-label="Pills"
              placeholder="Pills, comma separated"
              value={config.pills ?? ''}
              onChange={(event) => patch({ pills: event.target.value })}
            />
          ) : null}
        </>
      ) : null}
      {kind === 'gleam' || kind === 'title' || kind === 'hub' ? (
        <Checkbox
          size="xs"
          checked={Boolean(config.gleam) || kind === 'gleam'}
          disabled={kind === 'gleam'}
          onChange={(checked) => patch({ gleam: checked })}
          label="Gleam"
        />
      ) : null}
    </div>
  )
}

export const FlowNodeMockupContent = memo(FlowNodeMockupContentInner)

import { Input } from '../../../components/Input'
import { NumberInput } from '../../../components/NumberInput'
import { useFlowEditorUi } from '../FlowEditorUiContext'
import type { FlowNodeContentProps } from './types'

export function FlowNodeFieldsContent({ nodeId, data, expanded }: FlowNodeContentProps) {
  const { updateNodeConfig } = useFlowEditorUi()
  if (!expanded) return null

  const config = data.config ?? {}

  if (data.kind === 'input.number') {
    const value = typeof config.defaultValue === 'number' ? config.defaultValue : Number(config.defaultValue) || 0
    return (
      <div onPointerDown={(e) => e.stopPropagation()}>
        <NumberInput
          size="xs"
          shadowless
          aria-label="Default value"
          value={value}
          onValueChange={(next) => updateNodeConfig(nodeId, { ...config, defaultValue: next ?? 0 })}
        />
      </div>
    )
  }

  if (data.kind === 'flow.question') {
    const prompt = typeof config.prompt === 'string' ? config.prompt : ''
    return (
      <div onPointerDown={(e) => e.stopPropagation()}>
        <Input
          size="xs"
          shadowless
          aria-label="Question prompt"
          value={prompt}
          onChange={(e) => updateNodeConfig(nodeId, { ...config, prompt: e.target.value })}
        />
      </div>
    )
  }

  if (data.kind === 'flow.answer') {
    const value = typeof config.value === 'string' ? config.value : ''
    return (
      <div onPointerDown={(e) => e.stopPropagation()}>
        <Input
          size="xs"
          shadowless
          aria-label="Answer value"
          value={value}
          onChange={(e) => updateNodeConfig(nodeId, { ...config, value: e.target.value })}
        />
      </div>
    )
  }

  if (data.kind === 'solver.math') {
    const mode = typeof config.mode === 'string' ? config.mode : 'evaluate'
    return (
      <div onPointerDown={(e) => e.stopPropagation()}>
        <Input
          size="xs"
          shadowless
          aria-label="Solver mode"
          value={mode}
          onChange={(e) => updateNodeConfig(nodeId, { ...config, mode: e.target.value })}
        />
      </div>
    )
  }

  if (data.kind.startsWith('action.math.')) {
    const ports = data.ports.filter((p) => p.direction === 'in')
    return (
      <div className="theme-flow-editor__node-content--caps">
        {ports.map((port) => (
          <span key={port.id} className="type-caption type-muted">
            {port.label}
            {port.valueType ? ` · ${port.valueType}` : ''}
          </span>
        ))}
      </div>
    )
  }

  return null
}

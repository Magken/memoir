import { Textarea } from '../../../components/Textarea'
import { useFlowEditorUi } from '../FlowEditorUiContext'
import type { FlowNodeContentProps } from './types'

export function FlowNodeNoteContent({ nodeId, data, expanded }: FlowNodeContentProps) {
  const { updateNodeConfig } = useFlowEditorUi()
  if (!expanded) return null

  const text = typeof data.config?.text === 'string' ? data.config.text : ''

  return (
    <div onPointerDown={(e) => e.stopPropagation()}>
      <Textarea
        size="xs"
        shadowless
        aria-label="Note text"
        rows={6}
        value={text}
        onChange={(e) => updateNodeConfig(nodeId, { ...data.config, text: e.target.value })}
      />
    </div>
  )
}

import { memo } from 'react'
import { resolveContentRenderer } from '../../../lib/flowEditor/contentRenderers'
import type { FlowElementDefinition, FlowElementNodeData } from '../../../lib/flowEditor/types'

type FlowNodeContentProps = {
  nodeId: string
  data: FlowElementNodeData
  definition: FlowElementDefinition
  expanded: boolean
}

function FlowNodeContentInner({ nodeId, data, definition, expanded }: FlowNodeContentProps) {
  const Renderer = resolveContentRenderer(definition.contentRenderer)
  if (!Renderer) return null
  if (!expanded && !definition.previewWhenCollapsed) return null

  return (
    <div className="theme-flow-editor__node-content nodrag nopan">
      <Renderer nodeId={nodeId} data={data} expanded={expanded} />
    </div>
  )
}

export const FlowNodeContent = memo(FlowNodeContentInner)

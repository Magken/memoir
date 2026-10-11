import { useReactFlow } from '@xyflow/react'
import { ChevronDown, ChevronUp, Copy, GripVertical, Plus, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { EditableTitle } from '../../EditableTitle'
import { IconButton } from '../../IconButton'
import { Tooltip } from '../../Tooltip'
import { useFlowEditorUi } from '../../../lib/flowEditor/FlowEditorUiContext'
import type { FlowElementDefinition, FlowElementNodeData } from '../../../lib/flowEditor/types'

type FlowNodeHeaderProps = {
  nodeId: string
  data: FlowElementNodeData
  definition: FlowElementDefinition
  expanded: boolean
  canCollapse: boolean
  onExpand: () => void
  onCollapse: () => void
}

function Tip({ label, children }: { label: string; children: ReactNode }) {
  return <Tooltip content={label}>{children}</Tooltip>
}

export function FlowNodeHeader({
  nodeId,
  data,
  definition,
  expanded,
  canCollapse,
  onExpand,
  onCollapse,
}: FlowNodeHeaderProps) {
  const ui = useFlowEditorUi()
  const { setNodes } = useReactFlow()
  const Icon = definition.icon
  const quickActions = definition.quickActions

  const selectThisNode = () => {
    setNodes((nodes) =>
      nodes.map((n) => ({
        ...n,
        selected: n.id === nodeId,
      })),
    )
  }

  return (
    <div className="theme-flow-editor__node-header">
      <div className="theme-flow-editor__node-header-lead">
        <span className="theme-flow-editor__node-drag-grip" aria-hidden title="Drag">
          <GripVertical size={14} strokeWidth={2} />
        </span>
        {Icon ? (
          <span className="theme-flow-editor__node-icon" title={definition.kind} aria-hidden>
            <Icon size={14} strokeWidth={2} />
          </span>
        ) : null}
        <EditableTitle
          value={data.label}
          onChange={(next) => ui.updateNodeLabel(nodeId, next)}
          variant="borderless"
          isolatePointer
          onActivate={selectThisNode}
          controlClassName="nodrag nopan"
          className="theme-flow-editor__node-title"
          aria-label="Node name"
        />
      </div>

      <div
        className="theme-flow-editor__node-actions nodrag nopan"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {expanded ? (
          <>
            <Tip label="Duplicate">
              <IconButton
                type="button"
                size="xs"
                variant="ghost"
                icon={Copy}
                aria-label="Duplicate"
                onClick={(e) => {
                  e.stopPropagation()
                  ui.duplicateNode(nodeId)
                }}
              />
            </Tip>
            <Tip label="Delete">
              <IconButton
                type="button"
                size="xs"
                variant="ghost"
                icon={Trash2}
                aria-label="Delete"
                onClick={(e) => {
                  e.stopPropagation()
                  ui.deleteNode(nodeId)
                }}
              />
            </Tip>
            {canCollapse ? (
              <Tip label="Collapse">
                <IconButton
                  type="button"
                  size="xs"
                  variant="ghost"
                  icon={ChevronUp}
                  aria-label="Collapse"
                  onClick={(e) => {
                    e.stopPropagation()
                    onCollapse()
                  }}
                />
              </Tip>
            ) : null}
          </>
        ) : canCollapse ? (
          <Tip label="Expand">
            <IconButton
              type="button"
              size="xs"
              variant="ghost"
              icon={ChevronDown}
              aria-label="Expand"
              onClick={(e) => {
                e.stopPropagation()
                onExpand()
              }}
            />
          </Tip>
        ) : null}
        {quickActions?.map((action) => {
          const ActionIcon = action.icon ?? Plus
          return (
            <Tip key={action.id} label={action.label}>
              <IconButton
                type="button"
                size="xs"
                variant="action"
                className="theme-flow-editor__node-quick-action"
                icon={ActionIcon}
                aria-label={action.label}
                onClick={(e) => {
                  e.stopPropagation()
                  ui.runQuickAction(nodeId, action.id)
                }}
              />
            </Tip>
          )
        })}
      </div>
    </div>
  )
}

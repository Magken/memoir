import { NodeToolbar, Position, useReactFlow, type NodeProps } from '@xyflow/react'
import { GripVertical } from 'lucide-react'
import { memo, useEffect, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { useFlowEditorUi } from '../../../lib/flowEditor/FlowEditorUiContext'
import type { FlowGroupFrameData } from '../../../lib/flowEditor/types'

/**
 * Group frame — drag from the body (full frame). Rename lives in NodeToolbar (`nodrag`).
 * Grip is a visual affordance only.
 */
function FlowGroupFrameNodeInner({ id, data, selected }: NodeProps) {
  const ui = useFlowEditorUi()
  const { setNodes } = useReactFlow()
  const label = (data as FlowGroupFrameData)?.label || 'Group'
  const [draft, setDraft] = useState(label)

  useEffect(() => {
    setDraft(label)
  }, [label])

  const commit = () => {
    const next = draft.trim() || 'Group'
    setDraft(next)
    if (next !== label) ui.updateGroupLabel(id, next)
  }

  const selectThisGroup = () => {
    setNodes((nodes) =>
      nodes.map((n) => ({
        ...n,
        selected: n.id === id,
      })),
    )
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    event.stopPropagation()
    if (event.key === 'Enter') {
      event.preventDefault()
      event.currentTarget.blur()
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      setDraft(label)
      event.currentTarget.blur()
    }
  }

  const stopPanDrag = (event: PointerEvent<HTMLInputElement>) => {
    selectThisGroup()
    event.stopPropagation()
  }

  return (
    <>
      <NodeToolbar
        isVisible={Boolean(selected)}
        position={Position.Top}
        align="start"
        offset={4}
        className="theme-flow-editor__group-rename-toolbar"
        style={{ zIndex: 1000, pointerEvents: 'all' }}
      >
        <input
          type="text"
          className="theme-flow-editor__group-frame-title type-label nodrag nopan nowheel"
          value={draft}
          aria-label="Group name"
          spellCheck={false}
          onChange={(e) => setDraft(e.target.value)}
          onPointerDown={stopPanDrag}
          onFocus={selectThisGroup}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={onKeyDown}
          onBlur={commit}
        />
      </NodeToolbar>
      <div
        className={[
          'theme-flow-editor__group-frame',
          selected ? 'theme-flow-editor__group-frame--selected' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <span
          className="theme-flow-editor__group-frame-drag"
          aria-hidden
          title="Drag group"
        >
          <GripVertical size={12} strokeWidth={2} />
        </span>
      </div>
    </>
  )
}

export const FlowGroupFrameNode = memo(FlowGroupFrameNodeInner)

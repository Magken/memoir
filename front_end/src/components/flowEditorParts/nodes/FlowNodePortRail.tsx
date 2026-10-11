import { Handle, Position } from '@xyflow/react'
import { Minus, Plus } from 'lucide-react'
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { IconButton } from '../../IconButton'
import { Input } from '../../Input'
import { ThemeScroll } from '../../ThemeScroll'
import { Tooltip, type TooltipPlacement } from '../../Tooltip'
import { useFlowEditorUi } from '../../../lib/flowEditor/FlowEditorUiContext'
import { handlePositionForPort } from '../../../lib/flowEditor/handleLayout'
import type { FlowElementDefinition, FlowElementNodeData, FlowPort, FlowPortDirection } from '../../../lib/flowEditor/types'
import type { FlowLayoutMode } from '../../../lib/flowEditor/reactFlowBridge'

type FlowNodePortRailProps = {
  nodeId: string
  data: FlowElementNodeData
  definition: FlowElementDefinition
  selected: boolean
  /** Port sections — only when the node is fully expanded. */
  showChrome: boolean
}

function Tip({
  label,
  placement,
  children,
}: {
  label: string
  placement?: TooltipPlacement
  children: ReactNode
}) {
  return (
    <Tooltip content={label} placement={placement}>
      {children}
    </Tooltip>
  )
}

function handleOffsetStyle(position: Position, index: number, count: number): CSSProperties {
  const pct = `${((index + 1) / (count + 1)) * 100}%`
  if (position === Position.Left || position === Position.Right) return { top: pct }
  return { left: pct }
}

function tipPlacementForHandle(position: Position): TooltipPlacement {
  if (position === Position.Left) return 'left'
  if (position === Position.Right) return 'right'
  if (position === Position.Top) return 'top'
  return 'bottom'
}

function PortTabHandle({
  port,
  type,
  position,
  index,
  count,
}: {
  port: FlowPort
  type: 'source' | 'target'
  position: Position
  index: number
  count: number
}) {
  const side =
    position === Position.Left
      ? 'left'
      : position === Position.Right
        ? 'right'
        : position === Position.Top
          ? 'top'
          : 'bottom'

  return (
    <Handle
      type={type}
      position={position}
      id={port.id}
      className={[
        'theme-flow-editor__handle',
        'theme-flow-editor__handle--tab',
        `theme-flow-editor__handle--${port.direction}`,
        `theme-flow-editor__handle--side-${side}`,
      ].join(' ')}
      style={handleOffsetStyle(position, index, count)}
      isConnectable
    >
      <Tip label={port.label} placement={tipPlacementForHandle(position)}>
        <span className="theme-flow-editor__handle-tab-hit" aria-hidden />
      </Tip>
    </Handle>
  )
}

function PortHandles({
  ports,
  layoutMode,
  lastDirectedLayout,
}: {
  ports: FlowPort[]
  layoutMode: FlowLayoutMode
  lastDirectedLayout: Exclude<FlowLayoutMode, 'free'>
}) {
  const inputs = ports.filter((p) => p.direction === 'in')
  const outputs = ports.filter((p) => p.direction === 'out')
  const inPos = handlePositionForPort('in', layoutMode, lastDirectedLayout)
  const outPos = handlePositionForPort('out', layoutMode, lastDirectedLayout)

  return (
    <>
      {inputs.map((port, index) => (
        <PortTabHandle
          key={port.id}
          port={port}
          type="target"
          position={inPos}
          index={index}
          count={inputs.length}
        />
      ))}
      {outputs.map((port, index) => (
        <PortTabHandle
          key={port.id}
          port={port}
          type="source"
          position={outPos}
          index={index}
          count={outputs.length}
        />
      ))}
    </>
  )
}

/** Shared trailing column so header + lines up with row −. */
function PortActionSlot({ children }: { children?: ReactNode }) {
  return <div className="theme-flow-editor__port-action">{children}</div>
}

function PortNameRow({
  nodeId,
  port,
  canEdit,
  canRemove,
  removeBlockedReason,
  onRemove,
}: {
  nodeId: string
  port: FlowPort
  canEdit: boolean
  canRemove: boolean
  removeBlockedReason?: string
  onRemove: () => void
}) {
  const ui = useFlowEditorUi()
  const [draft, setDraft] = useState(port.label)

  useEffect(() => {
    setDraft(port.label)
  }, [port.label])

  const commit = () => {
    const next = draft.trim()
    if (next && next !== port.label) ui.updatePortLabel(nodeId, port.id, next)
    else setDraft(port.label)
  }

  return (
    <div className="theme-flow-editor__port-row">
      <div
        className="theme-flow-editor__port-field nodrag nopan"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <Input
          size="xs"
          shadowless
          aria-label={`${port.direction} port name`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              ;(e.target as HTMLInputElement).blur()
            }
            if (e.key === 'Escape') {
              e.preventDefault()
              setDraft(port.label)
              ;(e.target as HTMLInputElement).blur()
            }
          }}
        />
      </div>
      <PortActionSlot>
        {canEdit ? (
          canRemove ? (
            <Tip label={`Remove ${port.label}`}>
              <IconButton
                type="button"
                size="xxs"
                variant="ghost"
                className="theme-flow-editor__port-remove"
                icon={Minus}
                aria-label={`Remove ${port.label}`}
                onClick={(e) => {
                  e.stopPropagation()
                  onRemove()
                }}
              />
            </Tip>
          ) : (
            <Tip label={removeBlockedReason ?? 'Cannot remove'}>
              <span className="theme-flow-editor__port-remove-disabled">
                <IconButton
                  type="button"
                  size="xxs"
                  variant="ghost"
                  className="theme-flow-editor__port-remove"
                  icon={Minus}
                  disabled
                  aria-label={removeBlockedReason ?? `Cannot remove ${port.label}`}
                />
              </span>
            </Tip>
          )
        ) : null}
      </PortActionSlot>
    </div>
  )
}

function PortSection({
  nodeId,
  ports,
  direction,
  totalPortCount,
  canEdit,
}: {
  nodeId: string
  ports: FlowPort[]
  direction: FlowPortDirection
  totalPortCount: number
  canEdit: boolean
}) {
  const ui = useFlowEditorUi()
  const title = direction === 'in' ? 'In' : 'Out'
  const addLabel = direction === 'in' ? 'Add input' : 'Add output'

  return (
    <section className={`theme-flow-editor__port-section theme-flow-editor__port-section--${direction}`}>
      <div className="theme-flow-editor__port-section-header">
        <span className="theme-flow-editor__port-section-title type-caption">
          {title}
          <span className="theme-flow-editor__port-section-count type-tabular">{ports.length}</span>
        </span>
        <PortActionSlot>
          {canEdit ? (
            <Tip label={addLabel}>
              <IconButton
                type="button"
                size="xxs"
                variant="outline"
                className="theme-flow-editor__port-add"
                icon={Plus}
                aria-label={addLabel}
                onClick={(e) => {
                  e.stopPropagation()
                  ui.addPort(nodeId, direction)
                }}
              />
            </Tip>
          ) : null}
        </PortActionSlot>
      </div>
      <ThemeScroll
        axis="vertical"
        rail="mini"
        className="theme-flow-editor__port-section-scroll"
      >
        <div className="theme-flow-editor__port-section-body">
          {ports.length === 0 ? (
            <p className="theme-flow-editor__port-empty type-caption type-muted">None</p>
          ) : (
            ports.map((port) => {
              const blocked = ui.portHasEdges(nodeId, port.id)
              const canRemove = canEdit && totalPortCount > 1 && !blocked
              let removeBlockedReason: string | undefined
              if (canEdit && !canRemove) {
                removeBlockedReason = blocked
                  ? 'Disconnect edges first'
                  : 'At least one port is required'
              }
              return (
                <PortNameRow
                  key={port.id}
                  nodeId={nodeId}
                  port={port}
                  canEdit={canEdit}
                  canRemove={canRemove}
                  removeBlockedReason={removeBlockedReason}
                  onRemove={() => ui.removePort(nodeId, port.id)}
                />
              )
            })
          )}
        </div>
      </ThemeScroll>
    </section>
  )
}

export function FlowNodePortRail({ nodeId, data, definition, showChrome }: FlowNodePortRailProps) {
  const ui = useFlowEditorUi()
  const canEdit = Boolean(definition.allowPortEdit) && showChrome
  const inputs = data.ports.filter((p) => p.direction === 'in')
  const outputs = data.ports.filter((p) => p.direction === 'out')

  return (
    <>
      <PortHandles
        ports={data.ports}
        layoutMode={ui.layoutMode}
        lastDirectedLayout={ui.lastDirectedLayout}
      />

      {showChrome ? (
        <div
          className="theme-flow-editor__port-chrome nodrag nopan"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <PortSection
            nodeId={nodeId}
            ports={inputs}
            direction="in"
            totalPortCount={data.ports.length}
            canEdit={canEdit}
          />
          <PortSection
            nodeId={nodeId}
            ports={outputs}
            direction="out"
            totalPortCount={data.ports.length}
            canEdit={canEdit}
          />
        </div>
      ) : null}
    </>
  )
}

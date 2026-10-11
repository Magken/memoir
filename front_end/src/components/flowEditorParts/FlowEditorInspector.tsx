import type { Edge, Node } from '@xyflow/react'
import { Box, Layers, Link2, Minus, Plus, type LucideIcon } from 'lucide-react'
import { useEffect, useId, useState, type ReactNode } from 'react'
import { getFlowElementDefinition, resolveNodePorts } from '../../lib/flowEditor/flowElementRegistry'
import { useFlowEditorUi } from '../../lib/flowEditor/FlowEditorUiContext'
import { isFlowGroupRfNode } from '../../lib/flowEditor/reactFlowBridge'
import type {
  FlowDocument,
  FlowElementNodeData,
  FlowGroupFrameData,
  FlowPort,
  FlowPortDirection,
} from '../../lib/flowEditor/types'
import { EditableTitle } from '../EditableTitle'
import { IconButton } from '../IconButton'
import { Input } from '../Input'
import { Tag } from '../Tag'
import { Textarea } from '../Textarea'
import { ThemeScroll } from '../ThemeScroll'
import { Tooltip } from '../Tooltip'

type FlowEditorInspectorProps = {
  flow: FlowDocument
  selectedNodes: Node[]
  selectedEdges: Edge[]
  onUpdateEdgeLabel: (edgeId: string, label: string) => void
}

type StatItem = { label: string; value: string | number }

function nodeLabelInDoc(flow: FlowDocument, id: string): string {
  return flow.nodes.find((n) => n.id === id)?.label ?? id
}

function portsByDirection(ports: FlowPort[]) {
  return {
    ins: ports.filter((p) => p.direction === 'in'),
    outs: ports.filter((p) => p.direction === 'out'),
  }
}

function formatVarValue(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function parseVarValue(raw: string, previous: unknown): unknown {
  const trimmed = raw.trim()
  if (typeof previous === 'number') {
    const n = Number(trimmed)
    return Number.isFinite(n) ? n : trimmed
  }
  if (typeof previous === 'boolean') {
    if (trimmed === 'true') return true
    if (trimmed === 'false') return false
  }
  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      return JSON.parse(trimmed) as unknown
    } catch {
      return raw
    }
  }
  return raw
}

function StatTag({ label, value }: StatItem) {
  return (
    <Tag size="xs" className="theme-flow-editor__inspector-stat">
      <span className="theme-flow-editor__inspector-stat-label">{label}</span>
      <span className="theme-flow-editor__inspector-stat-value type-tabular">{value}</span>
    </Tag>
  )
}

function StatTagRow({ items }: { items: StatItem[] }) {
  return (
    <div className="theme-flow-editor__inspector-stats" role="list">
      {items.map((item) => (
        <div key={item.label} role="listitem" className="theme-flow-editor__inspector-stat-wrap">
          <StatTag label={item.label} value={item.value} />
        </div>
      ))}
    </div>
  )
}

function InspectorSector({
  id,
  title,
  count,
  children,
}: {
  id: string
  title: string
  count?: number | string
  children: ReactNode
}) {
  return (
    <section id={id} className="theme-flow-editor__inspector-sector">
      <div className="theme-flow-editor__inspector-sector-head">
        <p className="theme-flow-editor__inspector-sector-label type-caption type-accent">{title}</p>
        {count != null ? (
          <span className="theme-flow-editor__inspector-sector-count type-caption type-tabular type-accent">
            {count}
          </span>
        ) : null}
      </div>
      <div className="theme-flow-editor__inspector-sector-body">{children}</div>
    </section>
  )
}

function IdentityHeader({
  icon: Icon,
  title,
  onRename,
  ariaLabel,
  placeholder,
  allowEmpty = false,
}: {
  icon: LucideIcon
  title: string
  onRename: (next: string) => void
  ariaLabel: string
  placeholder?: string
  allowEmpty?: boolean
}) {
  return (
    <header className="theme-flow-editor__inspector-identity">
      <span className="theme-flow-editor__inspector-identity-icon" aria-hidden>
        <Icon size={16} strokeWidth={2} />
      </span>
      <EditableTitle
        value={title}
        onChange={onRename}
        variant="borderless"
        textClassName="type-label"
        className="theme-flow-editor__inspector-title-edit"
        aria-label={ariaLabel}
        placeholder={placeholder}
        allowEmpty={allowEmpty}
      />
    </header>
  )
}

function NotesEditor({
  value,
  onCommit,
}: {
  value: string
  onCommit: (next: string) => void
}) {
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    setDraft(value)
  }, [value])

  return (
    <Textarea
      size="xs"
      shadowless
      rows={3}
      aria-label="Notes"
      placeholder="Add notes…"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft !== value) onCommit(draft)
      }}
    />
  )
}

function TagList({ items, empty = 'None' }: { items: string[]; empty?: string }) {
  if (items.length === 0) {
    return <p className="type-caption type-muted theme-flow-editor__inspector-empty-line">{empty}</p>
  }
  return (
    <div className="theme-flow-editor__inspector-tag-list" role="list">
      {items.map((item, index) => (
        <span key={`${item}-${index}`} role="listitem">
          <Tag size="xs" className="theme-flow-editor__inspector-chip">
            {item}
          </Tag>
        </span>
      ))}
    </div>
  )
}

function EditablePortList({
  nodeId,
  direction,
  ports,
  totalPortCount,
  canEdit,
}: {
  nodeId: string
  direction: FlowPortDirection
  ports: FlowPort[]
  totalPortCount: number
  canEdit: boolean
}) {
  const ui = useFlowEditorUi()
  const title = direction === 'in' ? 'In' : 'Out'
  const addLabel = direction === 'in' ? 'Add input' : 'Add output'

  return (
    <section
      className={`theme-flow-editor__port-section theme-flow-editor__port-section--${direction}`}
    >
      <div className="theme-flow-editor__port-section-header">
        <span className="theme-flow-editor__port-section-title">
          {title}
          <span className="theme-flow-editor__port-section-count type-tabular">{ports.length}</span>
        </span>
        <div className="theme-flow-editor__port-action">
          {canEdit ? (
            <Tooltip content={addLabel}>
              <IconButton
                type="button"
                size="xxs"
                variant="outline"
                className="theme-flow-editor__port-add"
                icon={Plus}
                aria-label={addLabel}
                onClick={() => ui.addPort(nodeId, direction)}
              />
            </Tooltip>
          ) : null}
        </div>
      </div>
      <ThemeScroll
        axis="vertical"
        rail="mini"
        className="theme-flow-editor__port-section-scroll theme-flow-editor__inspector-port-scroll"
      >
        <div className="theme-flow-editor__port-section-body">
          {ports.length === 0 ? (
            <p className="theme-flow-editor__port-empty type-caption type-muted">None</p>
          ) : (
            <ul className="theme-flow-editor__inspector-port-list" aria-label={title}>
              {ports.map((port) => {
                const blocked = ui.portHasEdges(nodeId, port.id)
                const canRemove = canEdit && totalPortCount > 1 && !blocked
                let removeBlockedReason: string | undefined
                if (canEdit && !canRemove) {
                  removeBlockedReason = blocked
                    ? 'Disconnect edges first'
                    : 'At least one port is required'
                }
                return (
                  <PortEditRow
                    key={port.id}
                    nodeId={nodeId}
                    port={port}
                    canEdit={canEdit}
                    canRemove={canRemove}
                    removeBlockedReason={removeBlockedReason}
                    onRemove={() => ui.removePort(nodeId, port.id)}
                  />
                )
              })}
            </ul>
          )}
        </div>
      </ThemeScroll>
    </section>
  )
}

function PortEditRow({
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
    <li className="theme-flow-editor__port-row theme-flow-editor__inspector-port-row">
      {canEdit ? (
        <div className="theme-flow-editor__port-field theme-flow-editor__inspector-port-field">
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
      ) : (
        <span className="theme-flow-editor__inspector-port-name type-caption">{port.label}</span>
      )}
      {port.valueType ? (
        <Tag size="xs" className="theme-flow-editor__inspector-port-type">
          {port.valueType}
        </Tag>
      ) : null}
      <div className="theme-flow-editor__port-action">
        {canEdit ? (
          canRemove ? (
            <Tooltip content={`Remove ${port.label}`}>
              <IconButton
                type="button"
                size="xxs"
                variant="ghost"
                className="theme-flow-editor__port-remove"
                icon={Minus}
                aria-label={`Remove ${port.label}`}
                onClick={onRemove}
              />
            </Tooltip>
          ) : (
            <Tooltip content={removeBlockedReason ?? 'Cannot remove'}>
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
            </Tooltip>
          )
        ) : null}
      </div>
    </li>
  )
}

function VarsEditor({
  nodeId,
  config,
}: {
  nodeId: string
  config: Record<string, unknown>
}) {
  const ui = useFlowEditorUi()
  const entries = Object.entries(config)
  const [draftKey, setDraftKey] = useState('')
  const [draftValue, setDraftValue] = useState('')

  const commitConfig = (next: Record<string, unknown>) => {
    ui.updateNodeConfig(nodeId, next)
  }

  const addVar = () => {
    const key = draftKey.trim() || `var${entries.length + 1}`
    if (key in config) return
    commitConfig({ ...config, [key]: draftValue })
    setDraftKey('')
    setDraftValue('')
  }

  return (
    <div className="theme-flow-editor__inspector-vars">
      {entries.length === 0 ? (
        <p className="type-caption type-muted theme-flow-editor__inspector-empty-line">No vars yet</p>
      ) : (
        <ul className="theme-flow-editor__inspector-var-list" aria-label="Node variables">
          {entries.map(([key, value]) => (
            <VarRow
              key={key}
              entryKey={key}
              value={value}
              onRename={(nextKey, nextValue) => {
                if (!nextKey || (nextKey !== key && nextKey in config)) return
                const next = { ...config }
                delete next[key]
                next[nextKey] = nextValue
                commitConfig(next)
              }}
              onRemove={() => {
                const next = { ...config }
                delete next[key]
                commitConfig(next)
              }}
            />
          ))}
        </ul>
      )}
      <div className="theme-flow-editor__inspector-var-add">
        <Input
          size="xs"
          shadowless
          aria-label="New variable name"
          placeholder="key"
          value={draftKey}
          onChange={(e) => setDraftKey(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addVar()
            }
          }}
        />
        <Input
          size="xs"
          shadowless
          aria-label="New variable value"
          placeholder="value"
          value={draftValue}
          onChange={(e) => setDraftValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addVar()
            }
          }}
        />
        <Tooltip content="Add variable">
          <IconButton
            type="button"
            size="xxs"
            variant="outline"
            icon={Plus}
            aria-label="Add variable"
            onClick={addVar}
          />
        </Tooltip>
      </div>
    </div>
  )
}

function VarRow({
  entryKey,
  value,
  onRename,
  onRemove,
}: {
  entryKey: string
  value: unknown
  onRename: (key: string, value: unknown) => void
  onRemove: () => void
}) {
  const [keyDraft, setKeyDraft] = useState(entryKey)
  const [valueDraft, setValueDraft] = useState(formatVarValue(value))

  useEffect(() => {
    setKeyDraft(entryKey)
  }, [entryKey])

  useEffect(() => {
    setValueDraft(formatVarValue(value))
  }, [value])

  const commit = () => {
    const nextKey = keyDraft.trim()
    const nextValue = parseVarValue(valueDraft, value)
    if (!nextKey) {
      setKeyDraft(entryKey)
      setValueDraft(formatVarValue(value))
      return
    }
    if (nextKey !== entryKey || nextValue !== value) {
      onRename(nextKey, nextValue)
    }
  }

  return (
    <li className="theme-flow-editor__inspector-var-row">
      <Input
        size="xs"
        shadowless
        aria-label={`Variable key ${entryKey}`}
        value={keyDraft}
        onChange={(e) => setKeyDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            ;(e.target as HTMLInputElement).blur()
          }
          if (e.key === 'Escape') {
            e.preventDefault()
            setKeyDraft(entryKey)
            setValueDraft(formatVarValue(value))
            ;(e.target as HTMLInputElement).blur()
          }
        }}
      />
      <Input
        size="xs"
        shadowless
        aria-label={`Variable value ${entryKey}`}
        value={valueDraft}
        onChange={(e) => setValueDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            ;(e.target as HTMLInputElement).blur()
          }
          if (e.key === 'Escape') {
            e.preventDefault()
            setKeyDraft(entryKey)
            setValueDraft(formatVarValue(value))
            ;(e.target as HTMLInputElement).blur()
          }
        }}
      />
      <Tooltip content={`Remove ${entryKey}`}>
        <IconButton
          type="button"
          size="xxs"
          variant="ghost"
          icon={Minus}
          aria-label={`Remove ${entryKey}`}
          onClick={onRemove}
        />
      </Tooltip>
    </li>
  )
}

function DocumentPanel({ flow }: { flow: FlowDocument }) {
  const uid = useId()
  const ui = useFlowEditorUi()
  const connected = new Set(flow.edges.flatMap((e) => [e.source, e.target]))
  const orphans = flow.nodes.filter((n) => !connected.has(n.id)).length
  const orphanLabels = flow.nodes.filter((n) => !connected.has(n.id)).map((n) => n.label)
  const groupLabels = flow.groups.map((g) => g.label)
  const hasWorkflowId = Boolean(flow.meta?.workflowId)

  return (
    <>
      <InspectorSector id={`${uid}-overview`} title="Overview">
        <StatTagRow
          items={[
            { label: 'Nodes', value: flow.nodes.length },
            { label: 'Edges', value: flow.edges.length },
            { label: 'Groups', value: flow.groups.length },
            { label: 'Orphans', value: orphans },
          ]}
        />
      </InspectorSector>
      {hasWorkflowId ? (
        <InspectorSector id={`${uid}-workflow`} title="Workflow">
          <p className="theme-flow-editor__inspector-kv theme-flow-editor__inspector-kv--inline">
            <span className="type-caption type-muted">Id :</span>
            <Tag size="xs" className="theme-flow-editor__inspector-chip">
              {flow.meta?.workflowId}
            </Tag>
          </p>
        </InspectorSector>
      ) : null}
      <InspectorSector id={`${uid}-groups`} title="Groups" count={groupLabels.length}>
        <TagList items={groupLabels} />
      </InspectorSector>
      <InspectorSector id={`${uid}-orphans`} title="Orphans" count={orphanLabels.length}>
        <TagList items={orphanLabels} />
      </InspectorSector>
      <InspectorSector id={`${uid}-notes`} title="Notes">
        <NotesEditor
          value={flow.meta?.notes ?? ''}
          onCommit={(next) => ui.updateDocumentNotes(next)}
        />
      </InspectorSector>
    </>
  )
}

function NodePanel({
  flow,
  node,
  selectedCount,
}: {
  flow: FlowDocument
  node: Node<FlowElementNodeData>
  selectedCount: number
}) {
  const uid = useId()
  const ui = useFlowEditorUi()
  const docNode = flow.nodes.find((n) => n.id === node.id)
  const kind = docNode?.kind ?? node.data.kind
  const definition = getFlowElementDefinition(kind)
  const Icon = definition.icon ?? Box
  const label = docNode?.label ?? node.data.label
  const groupId = docNode?.groupId ?? node.data.groupId
  const group = groupId ? flow.groups.find((g) => g.id === groupId) : undefined
  const ports = docNode ? resolveNodePorts(docNode) : node.data.ports ?? []
  const config = docNode?.config ?? node.data.config ?? {}
  const notes = docNode?.notes ?? node.data.notes ?? ''
  const { ins, outs } = portsByDirection(ports)
  const linkedEdges = flow.edges.filter((e) => e.source === node.id || e.target === node.id)
  const neighborLabels = linkedEdges.map((e) =>
    e.source === node.id ? nodeLabelInDoc(flow, e.target) : nodeLabelInDoc(flow, e.source),
  )
  const canEditPorts = Boolean(definition.allowPortEdit)

  return (
    <>
      <IdentityHeader
        icon={Icon}
        title={label}
        ariaLabel="Node label"
        onRename={(next) => ui.updateNodeLabel(node.id, next)}
      />
      {selectedCount > 1 ? (
        <p className="theme-flow-editor__inspector-banner type-caption">
          {selectedCount} selected
        </p>
      ) : null}
      {group ? (
        <InspectorSector id={`${uid}-group`} title="Group">
          <TagList items={[group.label]} />
        </InspectorSector>
      ) : null}
      <InspectorSector id={`${uid}-ports`} title="Ports" count={ports.length}>
        <div className="theme-flow-editor__inspector-port-cards">
          <EditablePortList
            nodeId={node.id}
            direction="in"
            ports={ins}
            totalPortCount={ports.length}
            canEdit={canEditPorts}
          />
          <EditablePortList
            nodeId={node.id}
            direction="out"
            ports={outs}
            totalPortCount={ports.length}
            canEdit={canEditPorts}
          />
        </div>
      </InspectorSector>
      <InspectorSector
        id={`${uid}-vars`}
        title="Vars"
        count={Object.keys(config).length}
      >
        <VarsEditor nodeId={node.id} config={config} />
      </InspectorSector>
      <InspectorSector id={`${uid}-links`} title="Links" count={linkedEdges.length}>
        <TagList items={neighborLabels} />
      </InspectorSector>
      <InspectorSector id={`${uid}-notes`} title="Notes">
        <NotesEditor value={notes} onCommit={(next) => ui.updateNodeNotes(node.id, next)} />
      </InspectorSector>
    </>
  )
}

function GroupPanel({
  flow,
  node,
}: {
  flow: FlowDocument
  node: Node
}) {
  const uid = useId()
  const ui = useFlowEditorUi()
  const group = flow.groups.find((g) => g.id === node.id)
  const label = group?.label || (node.data as FlowGroupFrameData)?.label || 'Group'
  const memberLabels = (group?.nodeIds ?? []).map((id) => nodeLabelInDoc(flow, id))

  return (
    <>
      <IdentityHeader
        icon={Layers}
        title={label}
        ariaLabel="Group label"
        onRename={(next) => ui.updateGroupLabel(node.id, next)}
      />
      <InspectorSector id={`${uid}-members`} title="Members" count={memberLabels.length}>
        <TagList items={memberLabels} />
      </InspectorSector>
      <InspectorSector id={`${uid}-notes`} title="Notes">
        <NotesEditor
          value={group?.notes ?? (node.data as FlowGroupFrameData)?.notes ?? ''}
          onCommit={(next) => ui.updateGroupNotes(node.id, next)}
        />
      </InspectorSector>
    </>
  )
}

function EdgePanel({
  flow,
  edge,
  onUpdateEdgeLabel,
}: {
  flow: FlowDocument
  edge: Edge
  onUpdateEdgeLabel: (edgeId: string, label: string) => void
}) {
  const uid = useId()
  const sourceLabel = nodeLabelInDoc(flow, edge.source)
  const targetLabel = nodeLabelInDoc(flow, edge.target)
  const mapping = (edge.data as { mapping?: Record<string, string> } | undefined)?.mapping
  const mappingEntries = mapping ? Object.entries(mapping) : []
  const edgeLabel = typeof edge.label === 'string' ? edge.label : ''

  return (
    <>
      <IdentityHeader
        icon={Link2}
        title={edgeLabel}
        placeholder="Connector"
        allowEmpty
        ariaLabel="Edge label"
        onRename={(next) => onUpdateEdgeLabel(edge.id, next)}
      />
      <InspectorSector id={`${uid}-path`} title="Path">
        <div className="theme-flow-editor__inspector-path" aria-label="Edge path">
          <span className="type-caption">{sourceLabel}</span>
          <span className="theme-flow-editor__inspector-path-arrow type-caption type-muted" aria-hidden>
            →
          </span>
          <span className="type-caption">{targetLabel}</span>
        </div>
        <StatTagRow
          items={[
            { label: 'From', value: edge.sourceHandle ?? '—' },
            { label: 'To', value: edge.targetHandle ?? '—' },
          ]}
        />
      </InspectorSector>
      {mappingEntries.length > 0 ? (
        <InspectorSector id={`${uid}-map`} title="Map">
          <TagList items={mappingEntries.map(([from, to]) => `${from} → ${to}`)} />
        </InspectorSector>
      ) : null}
    </>
  )
}

/** Selection inspector — document overview, node/group/edge detail. Styles stay in Style tray. */
export function FlowEditorInspector({
  flow,
  selectedNodes,
  selectedEdges,
  onUpdateEdgeLabel,
}: FlowEditorInspectorProps) {
  const elementNodes = selectedNodes.filter(
    (n): n is Node<FlowElementNodeData> => !isFlowGroupRfNode(n),
  )
  const groupNodes = selectedNodes.filter(isFlowGroupRfNode)
  const primaryNode = elementNodes[0] ?? null
  const primaryGroup = elementNodes.length === 0 ? groupNodes[0] ?? null : null
  const primaryEdge =
    elementNodes.length === 0 && groupNodes.length === 0 ? selectedEdges[0] ?? null : null

  const mode =
    primaryNode != null
      ? 'Node'
      : primaryGroup != null
        ? 'Group'
        : primaryEdge != null
          ? 'Connector'
          : 'Document'

  const ariaLabel =
    mode === 'Node'
      ? 'Node inspector'
      : mode === 'Group'
        ? 'Group inspector'
        : mode === 'Connector'
          ? 'Connector inspector'
          : 'Document inspector'

  return (
    <aside className="theme-flow-editor__inspector" aria-label={ariaLabel}>
      <div className="theme-flow-editor__inspector-chrome">
        <p className="theme-flow-editor__inspector-heading type-label">Inspector</p>
        <Tag size="xs" className="theme-flow-editor__inspector-mode">
          {mode}
        </Tag>
      </div>
      <ThemeScroll axis="vertical" rail="nano" className="theme-flow-editor__inspector-scroll">
        <div
          key={primaryNode?.id ?? primaryGroup?.id ?? primaryEdge?.id ?? 'doc'}
          className="theme-flow-editor__inspector-panel theme-flow-editor__inspector-panel--enter"
        >
          {primaryNode ? (
            <NodePanel flow={flow} node={primaryNode} selectedCount={elementNodes.length} />
          ) : primaryGroup ? (
            <GroupPanel flow={flow} node={primaryGroup} />
          ) : primaryEdge ? (
            <EdgePanel flow={flow} edge={primaryEdge} onUpdateEdgeLabel={onUpdateEdgeLabel} />
          ) : (
            <DocumentPanel flow={flow} />
          )}
        </div>
      </ThemeScroll>
    </aside>
  )
}

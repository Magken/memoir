export const FLOW_SCHEMA_VERSION = 1

/** Palette / template profile — keeps domain toolkits from leaking into each other. */
export type FlowToolkitId = 'default' | 'website-plan' | 'interview-brief' | 'mockup'

export type FlowElementCategory = 'display' | 'action' | 'io' | 'flow'

export type FlowPortDirection = 'in' | 'out'

export type FlowPort = {
  id: string
  direction: FlowPortDirection
  label: string
  propertyKey?: string
  valueType?: string
}

export type FlowEdgeStyleType = 'default' | 'straight' | 'step' | 'smoothstep' | 'simplebezier'

export type FlowEdgeStyle = {
  type?: FlowEdgeStyleType
  animated?: boolean
  markerStart?: string
  markerEnd?: string
  stroke?: string
  strokeWidth?: number
}

export type FlowNodeBorderStyle = 'solid' | 'dashed' | 'dotted'

/** Visual chrome for Card nodes (toolbar Style menus). */
export type FlowNodeChrome = {
  fill?: string
  borderColor?: string
  borderStyle?: FlowNodeBorderStyle
  borderWidth?: number
}

export type FlowNode = {
  id: string
  kind: string
  label: string
  config?: Record<string, unknown>
  notes?: string
  groupId?: string | null
  x?: number
  y?: number
  ports?: FlowPort[]
  chrome?: FlowNodeChrome
}

export type FlowEdge = {
  id: string
  label?: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  mapping?: Record<string, string>
  style?: FlowEdgeStyle
}

export type FlowGroup = {
  id: string
  label: string
  nodeIds: string[]
  /** Direct parent group. Null/undefined means a top-level frame. */
  parentGroupId?: string | null
  notes?: string
}

export type FlowGroupFrameData = {
  label: string
  notes?: string
  parentGroupId?: string | null
}

export type FlowViewport = {
  x: number
  y: number
  zoom: number
}

export type FlowDocumentMeta = {
  schemaVersion?: number
  workflowId?: string
  prototype?: string
  notes?: string
}

export type FlowDocument = {
  nodes: FlowNode[]
  edges: FlowEdge[]
  groups: FlowGroup[]
  viewport?: FlowViewport
  meta?: FlowDocumentMeta
}

export type McpContributionKind = 'tool' | 'resource' | 'action'

export type McpContribution = {
  kind: McpContributionKind
  id: string
  label: string
  description?: string
  nodeId?: string
}

export type CompiledFlowMcpContext = {
  summary: string
  tools: McpContribution[]
  resources: McpContribution[]
  actions: McpContribution[]
}

export type FlowEditorPayload = {
  title?: string
  flow: FlowDocument
  mcpContext?: CompiledFlowMcpContext
}

export type ConnectionValidationContext = {
  sourceKind: string
  targetKind: string
  sourceHandle?: string | null
  targetHandle?: string | null
  /** Source node id when validating a live canvas connection. */
  sourceId?: string
  /** Target node id when validating a live canvas connection. */
  targetId?: string
  doc: FlowDocument
}

export type FlowContentRendererId = 'fields' | 'note' | 'planner' | 'interview' | 'mockup' | 'none'

export type FlowNodeSize = 'sm' | 'md' | 'lg'

/** Compact action on the node shell (e.g. spawn + connect a child). */
export type FlowNodeQuickAction = {
  id: string
  label: string
  /** Element kind to create and wire from this node. */
  childKind: string
  icon?: import('lucide-react').LucideIcon
}

export type FlowElementDefinition = {
  kind: string
  category: FlowElementCategory
  label: string
  paletteSection: string
  /** Toolkits that list this element. Omit → `default` only. */
  toolkits?: readonly FlowToolkitId[]
  defaultPorts?: FlowPort[]
  nodeComponent?: string
  defaultConfig?: Record<string, unknown>
  icon?: import('lucide-react').LucideIcon
  contentRenderer?: FlowContentRendererId
  collapsible?: boolean
  /** Keep a collapsed preview of `contentRenderer` (mockup cards stay visible on the canvas). */
  previewWhenCollapsed?: boolean
  defaultSize?: FlowNodeSize
  allowPortEdit?: boolean
  /** Optional action circles on the node (add daughter + connect, etc.). */
  quickActions?: FlowNodeQuickAction[]
  contributeMcp?: (node: FlowNode, doc: FlowDocument) => McpContribution[]
  validateConnection?: (ctx: ConnectionValidationContext) => boolean | string
}

export type FlowElementNodeData = {
  kind: string
  label: string
  config?: Record<string, unknown>
  notes?: string
  ports: FlowPort[]
  category: FlowElementCategory
  chrome?: FlowNodeChrome
  groupId?: string | null
}

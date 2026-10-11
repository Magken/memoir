import {
  Calculator,
  Divide,
  Hash,
  HelpCircle,
  MessageSquare,
  Plus,
  StickyNote,
  type LucideIcon,
} from 'lucide-react'
import type {
  ConnectionValidationContext,
  FlowDocument,
  FlowElementDefinition,
  FlowNode,
  FlowPort,
  FlowToolkitId,
} from './types'

const BUILTIN_ELEMENTS: FlowElementDefinition[] = [
  {
    kind: 'display.note',
    category: 'display',
    label: 'Note',
    paletteSection: 'Display',
    icon: StickyNote,
    contentRenderer: 'note',
    collapsible: true,
    defaultSize: 'lg',
    allowPortEdit: false,
    defaultConfig: { text: '' },
    contributeMcp: (node) => [
      {
        kind: 'resource',
        id: `flow.resource.note.${node.id}`,
        label: node.label,
        description: 'Display note node',
        nodeId: node.id,
      },
    ],
  },
  {
    kind: 'input.number',
    category: 'io',
    label: 'Number input',
    paletteSection: 'Inputs',
    icon: Hash,
    contentRenderer: 'fields',
    collapsible: true,
    defaultSize: 'sm',
    allowPortEdit: true,
    defaultPorts: [{ id: 'out', direction: 'out', label: 'value', propertyKey: 'value', valueType: 'number' }],
    defaultConfig: { defaultValue: 0 },
    quickActions: [
      {
        id: 'add-multiply',
        label: 'Add multiply child',
        childKind: 'action.math.multiply',
        icon: Plus,
      },
    ],
    contributeMcp: (node) => [
      {
        kind: 'resource',
        id: `flow.resource.input.${node.id}`,
        label: node.label,
        description: 'Numeric input port',
        nodeId: node.id,
      },
    ],
  },
  {
    kind: 'action.math.multiply',
    category: 'action',
    label: 'Multiply',
    paletteSection: 'Math',
    icon: Calculator,
    contentRenderer: 'fields',
    collapsible: true,
    defaultSize: 'md',
    allowPortEdit: true,
    defaultPorts: [
      { id: 'in-a', direction: 'in', label: 'a', propertyKey: 'a', valueType: 'number' },
      { id: 'in-b', direction: 'in', label: 'b', propertyKey: 'b', valueType: 'number' },
      { id: 'out', direction: 'out', label: 'product', propertyKey: 'result', valueType: 'number' },
    ],
    contributeMcp: (node) => [
      {
        kind: 'action',
        id: `flow.action.multiply.${node.id}`,
        label: `Multiply (${node.label})`,
        nodeId: node.id,
      },
    ],
    validateConnection: (ctx) => validatePortDirection(ctx, 'out', 'in'),
  },
  {
    kind: 'action.math.divide',
    category: 'action',
    label: 'Divide',
    paletteSection: 'Math',
    icon: Divide,
    contentRenderer: 'fields',
    collapsible: true,
    defaultSize: 'md',
    allowPortEdit: true,
    defaultPorts: [
      { id: 'in-a', direction: 'in', label: 'a', propertyKey: 'a', valueType: 'number' },
      { id: 'in-b', direction: 'in', label: 'b', propertyKey: 'b', valueType: 'number' },
      { id: 'out', direction: 'out', label: 'quotient', propertyKey: 'result', valueType: 'number' },
    ],
    contributeMcp: (node) => [
      {
        kind: 'action',
        id: `flow.action.divide.${node.id}`,
        label: `Divide (${node.label})`,
        nodeId: node.id,
      },
    ],
    validateConnection: (ctx) => validatePortDirection(ctx, 'out', 'in'),
  },
  {
    kind: 'solver.math',
    category: 'io',
    label: 'Math solver',
    paletteSection: 'Outputs',
    icon: Calculator,
    contentRenderer: 'fields',
    collapsible: true,
    defaultSize: 'md',
    allowPortEdit: true,
    defaultPorts: [{ id: 'in', direction: 'in', label: 'expression', propertyKey: 'expression' }],
    defaultConfig: { mode: 'evaluate' },
    contributeMcp: (node) => [
      {
        kind: 'tool',
        id: 'flow.math.evaluate',
        label: 'Evaluate math pipeline',
        description: `Solver terminus: ${node.label}`,
        nodeId: node.id,
      },
    ],
  },
  {
    kind: 'flow.question',
    category: 'flow',
    label: 'Question',
    paletteSection: 'Flow',
    icon: HelpCircle,
    contentRenderer: 'fields',
    collapsible: true,
    defaultSize: 'md',
    allowPortEdit: true,
    defaultPorts: [{ id: 'out', direction: 'out', label: 'answers' }],
    defaultConfig: { prompt: '' },
    quickActions: [
      {
        id: 'add-answer',
        label: 'Add answer',
        childKind: 'flow.answer',
        icon: Plus,
      },
    ],
    contributeMcp: (node) => [
      {
        kind: 'tool',
        id: 'flow.questionnaire.next',
        label: 'Advance questionnaire',
        description: node.label,
        nodeId: node.id,
      },
    ],
  },
  {
    kind: 'flow.answer',
    category: 'flow',
    label: 'Answer',
    paletteSection: 'Flow',
    icon: MessageSquare,
    contentRenderer: 'fields',
    collapsible: true,
    defaultSize: 'sm',
    allowPortEdit: true,
    defaultPorts: [
      { id: 'in', direction: 'in', label: 'question' },
      { id: 'out', direction: 'out', label: 'next' },
    ],
    defaultConfig: { value: '' },
    contributeMcp: (node) => [
      {
        kind: 'tool',
        id: `flow.questionnaire.answer.${node.id}`,
        label: `Answer: ${node.label}`,
        nodeId: node.id,
      },
    ],
    validateConnection: (ctx) => validatePortDirection(ctx, 'out', 'in'),
  },
]

const elementMap = new Map<string, FlowElementDefinition>(
  BUILTIN_ELEMENTS.map((definition) => [definition.kind, definition]),
)

function elementToolkits(definition: FlowElementDefinition): readonly FlowToolkitId[] {
  return definition.toolkits?.length ? definition.toolkits : (['default'] as const)
}

function matchesToolkit(definition: FlowElementDefinition, toolkit: FlowToolkitId): boolean {
  return elementToolkits(definition).includes(toolkit)
}

/** Register extra element definitions (e.g. website-plan toolkit). Idempotent by kind. */
export function registerFlowElements(definitions: readonly FlowElementDefinition[]): void {
  for (const definition of definitions) {
    elementMap.set(definition.kind, definition)
  }
}

function portDirection(kind: string, handleId: string | null | undefined): FlowPort['direction'] | null {
  const ports = getFlowElementDefinition(kind).defaultPorts ?? []
  const port = ports.find((p) => p.id === handleId)
  return port?.direction ?? null
}

function validatePortDirection(
  ctx: ConnectionValidationContext,
  expectedSource: FlowPort['direction'],
  expectedTarget: FlowPort['direction'],
): boolean {
  const sourceDir = portDirection(ctx.sourceKind, ctx.sourceHandle)
  const targetDir = portDirection(ctx.targetKind, ctx.targetHandle)
  if (!sourceDir || !targetDir) return true
  return sourceDir === expectedSource && targetDir === expectedTarget
}

export function getFlowElementDefinition(kind: string): FlowElementDefinition {
  return (
    elementMap.get(kind) ?? {
      kind,
      category: 'display',
      label: kind,
      paletteSection: 'Other',
      contentRenderer: 'none',
      defaultSize: 'md',
    }
  )
}

export function listFlowElements(toolkit: FlowToolkitId = 'default'): FlowElementDefinition[] {
  return [...elementMap.values()].filter((definition) => matchesToolkit(definition, toolkit))
}

export function listPaletteSections(toolkit: FlowToolkitId = 'default'): string[] {
  const sections = new Set<string>()
  for (const element of listFlowElements(toolkit)) sections.add(element.paletteSection)
  return [...sections]
}

export function resolveNodePorts(node: FlowNode): FlowPort[] {
  if (node.ports?.length) return node.ports
  return getFlowElementDefinition(node.kind).defaultPorts ?? []
}

export function contributeNodeMcp(node: FlowNode, doc: FlowDocument) {
  const definition = elementMap.get(node.kind)
  return definition?.contributeMcp?.(node, doc) ?? []
}

export function isValidFlowConnection(ctx: ConnectionValidationContext): boolean {
  if (ctx.sourceKind === ctx.targetKind && ctx.sourceHandle === ctx.targetHandle) return false

  const sourceDef = elementMap.get(ctx.sourceKind)
  const targetDef = elementMap.get(ctx.targetKind)

  const sourceResult = sourceDef?.validateConnection?.(ctx)
  if (sourceResult === false || typeof sourceResult === 'string') return false

  const targetResult = targetDef?.validateConnection?.(ctx)
  if (targetResult === false || typeof targetResult === 'string') return false

  const sourceDir = portDirection(ctx.sourceKind, ctx.sourceHandle)
  const targetDir = portDirection(ctx.targetKind, ctx.targetHandle)
  if (sourceDir && targetDir) {
    return sourceDir === 'out' && targetDir === 'in'
  }

  return true
}

export function createFlowNode(kind: string, id: string, position?: { x: number; y: number }): FlowNode {
  const def = getFlowElementDefinition(kind)
  return {
    id,
    kind,
    label: def.label,
    config: def.defaultConfig ? structuredClone(def.defaultConfig) : undefined,
    x: position?.x,
    y: position?.y,
    ports: def.defaultPorts ? structuredClone(def.defaultPorts) : undefined,
  }
}

export function resolveElementIcon(kind: string): LucideIcon | undefined {
  return getFlowElementDefinition(kind).icon
}

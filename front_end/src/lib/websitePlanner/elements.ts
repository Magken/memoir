import {
  AlertTriangle,
  AppWindow,
  Blocks,
  Boxes,
  Cable,
  CircleHelp,
  Database,
  Route,
  FormInput,
  Globe2,
  Layers,
  LayoutTemplate,
  ListChecks,
  Menu,
  Network,
  Puzzle,
  Server,
  SquareDashedMousePointer,
  StickyNote,
  Store,
} from 'lucide-react'
import { BACKEND_SYSTEMS } from '../backendCatalog/systems'
import { registerFlowElements } from '../flowEditor/flowElementRegistry'
import type { FlowElementDefinition, FlowNode, FlowPort } from '../flowEditor/types'
import type { PlannerNodeConfig, PlannerStatus } from './types'

const TOOLKIT = ['website-plan'] as const

const PLAN_PORTS: FlowPort[] = [
  { id: 'in', direction: 'in', label: 'from' },
  { id: 'out', direction: 'out', label: 'to' },
]

function baseConfig(
  status: PlannerStatus,
  summary: string,
  phase = '',
): PlannerNodeConfig {
  return { status, summary, phase }
}

function planElement(
  partial: Omit<FlowElementDefinition, 'toolkits' | 'category' | 'contentRenderer' | 'collapsible'> & {
    category?: FlowElementDefinition['category']
    contentRenderer?: FlowElementDefinition['contentRenderer']
    collapsible?: boolean
  },
): FlowElementDefinition {
  return {
    category: partial.category ?? 'flow',
    contentRenderer: partial.contentRenderer ?? 'planner',
    collapsible: partial.collapsible ?? true,
    defaultSize: 'md',
    allowPortEdit: false,
    defaultPorts: PLAN_PORTS,
    toolkits: TOOLKIT,
    ...partial,
  }
}

const STRUCTURE_ELEMENTS: FlowElementDefinition[] = [
  planElement({
    kind: 'plan.website',
    label: 'Website',
    paletteSection: 'Structure',
    icon: Globe2,
    defaultSize: 'lg',
    defaultConfig: baseConfig('planned', 'Site root / product shell'),
    contributeMcp: (node) => [
      { kind: 'resource', id: `plan.website.${node.id}`, label: node.label, nodeId: node.id },
    ],
  }),
  planElement({
    kind: 'plan.page',
    label: 'Page',
    paletteSection: 'Structure',
    icon: LayoutTemplate,
    defaultConfig: baseConfig('planned', 'Page wireframe unit', 'frontend'),
    quickActions: [
      { id: 'add-section', label: 'Add section', childKind: 'plan.section', icon: Layers },
      { id: 'add-route', label: 'Add route', childKind: 'plan.route', icon: Route },
    ],
    contributeMcp: (node) => [
      { kind: 'resource', id: `plan.page.${node.id}`, label: node.label, nodeId: node.id },
    ],
  }),
  planElement({
    kind: 'plan.section',
    label: 'Section',
    paletteSection: 'Structure',
    icon: Layers,
    defaultConfig: baseConfig('planned', 'Page section / band'),
  }),
  planElement({
    kind: 'plan.navigation',
    label: 'Navigation',
    paletteSection: 'Structure',
    icon: Menu,
    defaultConfig: baseConfig('planned', 'Header / menu / footer nav'),
  }),
  planElement({
    kind: 'plan.ui',
    label: 'UI component',
    paletteSection: 'Structure',
    icon: SquareDashedMousePointer,
    defaultConfig: baseConfig('planned', 'Reusable UI piece'),
  }),
  planElement({
    kind: 'plan.modal',
    label: 'Modal',
    paletteSection: 'Structure',
    icon: AppWindow,
    defaultConfig: baseConfig('planned', 'Dialog / overlay', 'frontend'),
    quickActions: [
      { id: 'add-form', label: 'Add form', childKind: 'plan.form', icon: FormInput },
    ],
  }),
]

const FRONTEND_ELEMENTS: FlowElementDefinition[] = [
  planElement({
    kind: 'plan.route',
    label: 'Route',
    paletteSection: 'Frontend',
    icon: Route,
    category: 'io',
    defaultConfig: baseConfig('planned', 'Client route path', 'frontend'),
  }),
  planElement({
    kind: 'plan.state',
    label: 'State / store',
    paletteSection: 'Frontend',
    icon: Store,
    category: 'io',
    defaultConfig: baseConfig('planned', 'Client state surface', 'frontend'),
  }),
  planElement({
    kind: 'plan.form',
    label: 'Form / validation',
    paletteSection: 'Frontend',
    icon: FormInput,
    category: 'io',
    defaultConfig: baseConfig('planned', 'Form + client validation', 'frontend'),
  }),
  planElement({
    kind: 'plan.api-client',
    label: 'API client',
    paletteSection: 'Frontend',
    icon: Cable,
    category: 'io',
    defaultConfig: baseConfig('planned', 'FE client wrapping RPCs', 'frontend'),
  }),
]

const DATA_ELEMENTS: FlowElementDefinition[] = [
  planElement({
    kind: 'plan.data-model',
    label: 'Data model',
    paletteSection: 'Data & platform',
    icon: Database,
    category: 'io',
    defaultConfig: baseConfig('planned', 'Resource / table shape', 'backend'),
  }),
  planElement({
    kind: 'plan.service-required',
    label: 'Required service',
    paletteSection: 'Data & platform',
    icon: Server,
    category: 'action',
    defaultConfig: baseConfig('missing', 'Needed capability not yet mapped', 'backend'),
  }),
]

const DELIVERY_ELEMENTS: FlowElementDefinition[] = [
  planElement({
    kind: 'plan.external',
    label: 'External service',
    paletteSection: 'Integrations & delivery',
    icon: Network,
    category: 'io',
    defaultConfig: baseConfig('external', 'Third-party integration'),
  }),
  planElement({
    kind: 'plan.step',
    label: 'Implementation step',
    paletteSection: 'Integrations & delivery',
    icon: ListChecks,
    category: 'action',
    defaultConfig: baseConfig('planned', 'Build step', 'implementation'),
  }),
  planElement({
    kind: 'plan.missing',
    label: 'Missing item',
    paletteSection: 'Integrations & delivery',
    icon: AlertTriangle,
    category: 'display',
    defaultConfig: baseConfig('missing', 'Gap to fill before ship'),
  }),
  planElement({
    kind: 'plan.decision',
    label: 'Decision',
    paletteSection: 'Integrations & delivery',
    icon: CircleHelp,
    category: 'display',
    defaultConfig: baseConfig('planned', 'Open product / tech decision'),
  }),
  planElement({
    kind: 'plan.note',
    label: 'Note',
    paletteSection: 'Integrations & delivery',
    icon: StickyNote,
    category: 'display',
    contentRenderer: 'note',
    defaultConfig: { text: '', status: 'planned', summary: 'Planning note' },
  }),
]

function backendSystemElements(): FlowElementDefinition[] {
  return BACKEND_SYSTEMS.map((system) =>
    planElement({
      kind: `plan.system.${system.id}`,
      label: system.title,
      paletteSection: 'Existing systems',
      icon: system.id === 'local-stack' ? Boxes : system.id === 'data-platform' ? Blocks : Puzzle,
      category: 'action',
      defaultSize: 'md',
      defaultConfig: {
        status: 'existing' as PlannerStatus,
        phase: 'backend',
        summary: system.summary,
        systemId: system.id,
        hotWire: system.hotWire,
        feLibs: system.feLibs.join(', '),
      } satisfies PlannerNodeConfig,
      contributeMcp: (node) => [
        {
          kind: 'resource',
          id: `plan.system.${system.id}.${node.id}`,
          label: system.title,
          description: system.hotWire,
          nodeId: node.id,
        },
      ],
    }),
  )
}

export const WEBSITE_PLANNER_ELEMENTS: FlowElementDefinition[] = [
  ...STRUCTURE_ELEMENTS,
  ...FRONTEND_ELEMENTS,
  ...DATA_ELEMENTS,
  ...backendSystemElements(),
  ...DELIVERY_ELEMENTS,
]

let registered = false

/** Idempotent registration into the shared flow element map. */
export function ensureWebsitePlannerElementsRegistered(): void {
  if (registered) return
  registerFlowElements(WEBSITE_PLANNER_ELEMENTS)
  registered = true
}

export function isPlannerKind(kind: string): boolean {
  return kind.startsWith('plan.')
}

export function readPlannerConfig(node: FlowNode): PlannerNodeConfig {
  const config = (node.config ?? {}) as PlannerNodeConfig
  return config
}

export function plannerStatusOf(node: FlowNode): PlannerStatus {
  const status = readPlannerConfig(node).status
  if (
    status === 'existing' ||
    status === 'planned' ||
    status === 'missing' ||
    status === 'blocked' ||
    status === 'external'
  ) {
    return status
  }
  if (node.kind.startsWith('plan.system.')) return 'existing'
  if (node.kind === 'plan.missing' || node.kind === 'plan.service-required') return 'missing'
  if (node.kind === 'plan.external') return 'external'
  return 'planned'
}

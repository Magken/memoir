import { F as CATALOG_FIDELITY } from '../catalogFidelity'
import type {
  FlowEditorFeature,
  FlowFeatureCategory,
  FlowFeatureFidelity,
  FlowFormatId,
} from './types'

export type { FlowEditorFeature, FlowFeatureCategory, FlowFormatId, FlowFeatureFidelity } from './types'

const F = CATALOG_FIDELITY as Record<
  Exclude<keyof typeof CATALOG_FIDELITY, 'native'>,
  FlowFeatureFidelity
>

export const FLOW_FEATURE_CATEGORY_LABELS: Record<FlowFeatureCategory, string> = {
  chrome: 'Flow chrome',
  interaction: 'Interaction',
  io: 'Context I/O',
}

export const FLOW_FORMAT_LABELS: Record<FlowFormatId, string> = {
  'native-json': 'Native JSON',
  png: 'PNG image',
}

export const FLOW_EDITOR_FEATURES: FlowEditorFeature[] = [
  {
    id: 'flow.chrome.canvas',
    label: 'React Flow canvas viewport',
    category: 'chrome',
    usable: true,
    notation: 'chrome.canvas=visible',
    import: { 'native-json': F.na, png: F.na },
    export: { 'native-json': F.na, png: F.na },
    actions: [
      'flow.action.zoom-in',
      'flow.action.zoom-out',
      'flow.action.zoom-fit',
      'flow.action.auto-layout',
    ],
    notes:
      'Select marquee / Pan; Shift multi-select; group frames from measured sizes; drop at pointer.',
  },
  {
    id: 'flow.chrome.controls',
    label: 'Canvas controls',
    category: 'chrome',
    usable: true,
    notation: 'chrome.controls',
    import: { 'native-json': F.na, png: F.na },
    export: { 'native-json': F.na, png: F.na },
    actions: ['flow.action.zoom-in', 'flow.action.zoom-out', 'flow.action.zoom-fit'],
  },
  {
    id: 'flow.chrome.minimap',
    label: 'Minimap',
    category: 'chrome',
    usable: true,
    notation: 'chrome.minimap',
    import: { 'native-json': F.na, png: F.na },
    export: { 'native-json': F.na, png: F.na },
    actions: ['flow.action.toggle-minimap'],
  },
  {
    id: 'flow.interaction.palette',
    label: 'Node palette (click + drag)',
    category: 'interaction',
    usable: true,
    notation: 'interaction.palette',
    import: { 'native-json': F.na, png: F.na },
    export: { 'native-json': F.na, png: F.na },
    notes: 'Drag from palette or click to insert at default position.',
  },
  {
    id: 'flow.interaction.inspector',
    label: 'Selection inspector',
    category: 'interaction',
    usable: true,
    notation: 'interaction.inspector',
    import: { 'native-json': F.na, png: F.na },
    export: { 'native-json': F.na, png: F.na },
    notes: 'Summary meta + edge label; chrome/styles live in the header Style tray.',
  },
  {
    id: 'flow.chrome.style-tray',
    label: 'Header Style + Group tray',
    category: 'chrome',
    usable: true,
    notation: 'chrome.style-tray',
    import: { 'native-json': F.na, png: F.na },
    export: { 'native-json': F.na, png: F.na },
    notes:
      'Select/Pan; Style+Group lane animates adjacent; group frames are selectable parents.',
  },
  {
    id: 'flow.interaction.card-nodes',
    label: 'Card node shell (zoned)',
    category: 'interaction',
    usable: true,
    notation: 'interaction.card-nodes',
    import: { 'native-json': F.na, png: F.na },
    export: { 'native-json': F.na, png: F.na },
    notes:
      'Compact unselected · expanded selected; registry content slot; layout-aware handles; hover port +/−.',
  },
  {
    id: 'flow.interaction.edge-style',
    label: 'Edge type and style',
    category: 'interaction',
    usable: true,
    notation: 'interaction.edge-style',
    import: { 'native-json': F.partial, png: F.na },
    export: { 'native-json': F.full, png: F.na },
    notes: 'Header Style tray — path, stroke, width, markers, animated.',
  },
  {
    id: 'flow.interaction.reconnect',
    label: 'Edge reconnect',
    category: 'interaction',
    usable: true,
    notation: 'interaction.reconnect',
    import: { 'native-json': F.na, png: F.na },
    export: { 'native-json': F.na, png: F.na },
  },
  {
    id: 'flow.interaction.auto-layout',
    label: 'Auto-layout (dagre)',
    category: 'interaction',
    usable: true,
    notation: 'interaction.auto-layout',
    import: { 'native-json': F.na, png: F.na },
    export: { 'native-json': F.na, png: F.na },
    actions: ['flow.action.auto-layout'],
  },
  {
    id: 'flow.interaction.prototype-switch',
    label: 'Prototype flow fixtures',
    category: 'interaction',
    usable: true,
    notation: 'interaction.prototype=math-solver|questionnaire',
    import: { 'native-json': F.na, png: F.na },
    export: { 'native-json': F.na, png: F.na },
    notes: 'Showcase toggles math-solver and questionnaire reference flows.',
  },
  {
    id: 'flow.interaction.interview-create',
    label: 'Interview create-bot patches',
    category: 'interaction',
    usable: true,
    notation: 'interaction.interview.create',
    import: { 'native-json': F.na, png: F.na },
    export: { 'native-json': F.na, png: F.na },
    actions: [
      'flow.action.interview-seed-starter',
      'flow.action.interview-stamp-meta',
      'flow.action.interview-add-discussion',
      'flow.action.interview-add-tool',
      'flow.action.interview-update-node',
      'flow.action.interview-attach-topic',
      'flow.action.interview-replace-flow',
    ],
    notes:
      'Pure applyCreateBotAction helpers; FlowEditor.invokeAction + chat approve→dispatch still to wire.',
  },

  {
    id: 'flow.io.mcp-derived',
    label: 'Flow-derived MCP context',
    category: 'io',
    usable: true,
    notation: 'payload.mcpContext',
    import: { 'native-json': F.partial, png: F.na },
    export: { 'native-json': F.full, png: F.na },
    notes: 'MCP tools/resources compiled from element registry and topology.',
  },
  {
    id: 'flow.io.native-json',
    label: 'Native flow JSON',
    category: 'io',
    usable: true,
    notation: 'envelope.payload.flow',
    import: { 'native-json': F.full, png: F.na },
    export: { 'native-json': F.full, png: F.na },
  },
  {
    id: 'flow.io.png',
    label: 'PNG export',
    category: 'io',
    usable: true,
    notation: 'export.png',
    import: { 'native-json': F.na, png: F.na },
    export: { 'native-json': F.na, png: F.full },
    notes: 'Rasterizes React Flow viewport via html-to-image.',
  },
]

export const USABLE_FLOW_EDITOR_FEATURES = FLOW_EDITOR_FEATURES.filter((feature) => feature.usable)

export function flowFeaturesByCategory(category: FlowFeatureCategory): FlowEditorFeature[] {
  return USABLE_FLOW_EDITOR_FEATURES.filter((feature) => feature.category === category)
}

export const FLOW_EDITOR_FEATURE_CATEGORIES = (
  Object.keys(FLOW_FEATURE_CATEGORY_LABELS) as FlowFeatureCategory[]
).filter((category) => flowFeaturesByCategory(category).length > 0)

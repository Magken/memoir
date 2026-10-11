import { registerFlowTemplates, type FlowTemplateDef } from '../flowEditor/flowTemplateCatalog'
import type { WireframeLayout } from '../wireframes/wireframeTypes'
import { createBlankMockupFlow, createVerifiedGradingMockupFlow } from './starters'

const BLANK_WIREFRAME = {
  id: 'mockup-tpl-blank',
  name: 'Blank mockup',
  tier: 'section',
  category: 'section-nav',
  purpose: 'Empty mockup canvas.',
  reference: 'Mockup flow blank',
  frame: 'section',
  columns: '1fr',
  rows: '1fr',
  areas: ['root'],
  blocks: {
    root: { label: 'Empty', tone: 'hero' },
  },
} as const satisfies WireframeLayout

const GRADING_WIREFRAME = {
  id: 'mockup-tpl-grading',
  name: 'Verified grading',
  tier: 'section',
  category: 'section-doc',
  purpose: 'Title into hub, then four beats with a kit branch.',
  reference: 'Mockup flow verified grading',
  frame: 'section',
  columns: '1fr',
  rows: '1fr',
  areas: ['map'],
  blocks: {
    map: {
      label: 'Grading',
      tone: 'aside',
      micro: {
        columns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)',
        rows: '1fr 1fr 1fr',
        areas: ['. title .', 'kit hub cap', '. score report'],
        blocks: {
          title: { label: 'Title', tone: 'hero' },
          kit: { label: 'Kit', tone: 'badge' },
          hub: { label: 'Hub', tone: 'cta' },
          cap: { label: '01', tone: 'card' },
          score: { label: '02–03', tone: 'card' },
          report: { label: '04', tone: 'form' },
        },
      },
    },
  },
} as const satisfies WireframeLayout

export const MOCKUP_TEMPLATES: FlowTemplateDef[] = [
  {
    id: 'mockup-blank',
    label: 'Blank mockup',
    description: 'Empty canvas — compose titles, gleam cards, and steps from the palette.',
    section: 'Mockups',
    tags: ['Blank'],
    document: createBlankMockupFlow(),
    wireframe: BLANK_WIREFRAME,
    toolkits: ['mockup'],
  },
  {
    id: 'mockup-verified-grading',
    label: 'Verified grading',
    description: 'Gleam title, hub, four beats, and a stage-kit pill row.',
    section: 'Mockups',
    tags: ['Grading', 'Presentation'],
    document: createVerifiedGradingMockupFlow(),
    wireframe: GRADING_WIREFRAME,
    toolkits: ['mockup'],
  },
]

let registered = false

export function ensureMockupTemplatesRegistered(): void {
  if (registered) return
  registerFlowTemplates(MOCKUP_TEMPLATES)
  registered = true
}

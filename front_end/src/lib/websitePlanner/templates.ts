import { registerFlowTemplates, type FlowTemplateDef } from '../flowEditor/flowTemplateCatalog'
import type { WireframeLayout } from '../wireframes/wireframeTypes'
import { createBlankWebsitePlan } from './starters'

const BLANK_WIREFRAME = {
  id: 'website-tpl-blank',
  name: 'Blank site',
  tier: 'section',
  category: 'section-nav',
  purpose: 'Empty planning canvas.',
  reference: 'Website planner blank',
  frame: 'section',
  columns: '1fr',
  rows: '1fr',
  areas: ['root'],
  blocks: {
    root: { label: 'Empty', tone: 'hero' },
  },
} as const satisfies WireframeLayout

export const WEBSITE_PLANNER_TEMPLATES: FlowTemplateDef[] = [
  {
    id: 'website-blank',
    label: 'Blank website',
    description: 'Empty canvas — build the plan from the palette.',
    section: 'Website planning',
    tags: ['Blank'],
    document: createBlankWebsitePlan(),
    wireframe: BLANK_WIREFRAME,
    toolkits: ['website-plan'],
  },
]

let registered = false

export function ensureWebsitePlannerTemplatesRegistered(): void {
  if (registered) return
  registerFlowTemplates(WEBSITE_PLANNER_TEMPLATES)
  registered = true
}

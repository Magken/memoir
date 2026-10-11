import { registerFlowTemplates, type FlowTemplateDef } from '../flowEditor/flowTemplateCatalog'
import type { WireframeLayout } from '../wireframes/wireframeTypes'
import { createBlankInterviewBrief, createStarterInterviewBrief } from './starters'

const BLANK_WIREFRAME = {
  id: 'interview-tpl-blank',
  name: 'Blank brief',
  tier: 'section',
  category: 'section-nav',
  purpose: 'Empty interview brief canvas.',
  reference: 'Interview brief blank',
  frame: 'section',
  columns: '1fr',
  rows: '1fr',
  areas: ['root'],
  blocks: {
    root: { label: 'Empty', tone: 'hero' },
  },
} as const satisfies WireframeLayout

const STARTER_WIREFRAME = {
  id: 'interview-tpl-starter',
  name: 'Starter brief',
  tier: 'section',
  category: 'section-nav',
  purpose: 'Opening · tool · closing with Warmup and Close topics.',
  reference: 'Interview brief starter',
  frame: 'section',
  columns: '1fr 1fr 1fr',
  rows: 'auto 1fr auto',
  areas: ['meta meta meta', 'open tool close', 'warm . end'],
  blocks: {
    meta: { label: 'Brief', tone: 'hero' },
    open: { label: 'Opening', tone: 'card' },
    tool: { label: 'Tool', tone: 'card' },
    close: { label: 'Closing', tone: 'card' },
    warm: { label: 'Warmup', tone: 'muted' },
    end: { label: 'Close', tone: 'muted' },
  },
} as const satisfies WireframeLayout

export const INTERVIEW_BRIEF_TEMPLATES: FlowTemplateDef[] = [
  {
    id: 'interview-brief.blank',
    label: 'Blank brief',
    description: 'Empty canvas — build the brief from the palette.',
    section: 'Interview briefs',
    tags: ['Blank'],
    document: createBlankInterviewBrief(),
    wireframe: BLANK_WIREFRAME,
    toolkits: ['interview-brief'],
  },
  {
    id: 'interview-brief.starter',
    label: 'Starter screen',
    description: 'Senior role screen with opening, coding tool, and closing.',
    section: 'Interview briefs',
    tags: ['Starter'],
    document: createStarterInterviewBrief(),
    wireframe: STARTER_WIREFRAME,
    toolkits: ['interview-brief'],
  },
]

let registered = false

export function ensureInterviewBriefTemplatesRegistered(): void {
  if (registered) return
  registerFlowTemplates(INTERVIEW_BRIEF_TEMPLATES)
  registered = true
}

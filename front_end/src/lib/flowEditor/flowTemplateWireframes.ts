import type { WireframeLayout } from '../wireframes/wireframeTypes'

/**
 * Hand-authored thumb wireframes for template cards — topology, not RF coords.
 * Same CSS Grid named-area pattern as `WireframePreview` / page wireframes.
 */
export const FLOW_TEMPLATE_WIREFRAMES = {
  'math-solver': {
    id: 'flow-tpl-math-solver',
    name: 'Math solver',
    tier: 'section',
    category: 'section-doc',
    purpose: 'Template thumb — inputs feed multiply/divide into a solver terminus.',
    reference: 'FlowEditor grouped pipeline',
    frame: 'section',
    columns: '1fr',
    rows: '1fr',
    areas: ['pipe'],
    blocks: {
      pipe: {
        label: 'Calculator',
        tone: 'aside',
        micro: {
          columns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)',
          rows: '1fr 1fr',
          areas: ['ina mul sol', 'inb div sol'],
          blocks: {
            ina: { label: 'In A', tone: 'form' },
            inb: { label: 'In B', tone: 'form' },
            mul: { label: '×', tone: 'card' },
            div: { label: '÷', tone: 'card' },
            sol: { label: 'Solver', tone: 'cta' },
          },
        },
      },
    },
  },
  questionnaire: {
    id: 'flow-tpl-questionnaire',
    name: 'Questionnaire',
    tier: 'section',
    category: 'section-doc',
    purpose: 'Template thumb — one question with parallel answer branches.',
    reference: 'FlowEditor grouped pipeline',
    frame: 'section',
    columns: '1fr',
    rows: '1fr',
    areas: ['survey'],
    blocks: {
      survey: {
        label: 'Survey',
        tone: 'aside',
        micro: {
          columns: 'minmax(0, 1.15fr) minmax(0, 1fr)',
          rows: '1fr 1fr',
          areas: ['q blue', 'q red'],
          blocks: {
            q: { label: 'Question', tone: 'hero' },
            blue: { label: 'Blue', tone: 'badge' },
            red: { label: 'Red', tone: 'badge' },
          },
        },
      },
    },
  },
} as const satisfies Record<string, WireframeLayout>

/**
 * Projects text-canvas LCL copy. Nested sections for catalog dive demos.
 * No em dashes in reader copy.
 */

export type ProjectsDetailLink = {
  href: string
  label: string
}

export type ProjectsDetailSection = {
  id: string
  label: string
  relation: string
  relationAfter?: string
  subsections?: readonly ProjectsDetailSection[]
  linkText?: string
  links?: readonly ProjectsDetailLink[]
}

export type ProjectsDetailDoc = {
  id: string
  /** Catalog name — root crumb and default s1 title. */
  name: string
  intro: string
  pillars: readonly ProjectsDetailSection[]
}

const GRAS_TO_TEXT: ProjectsDetailDoc = {
  id: 'gras-to-text',
  name: 'gras_to_text',
  intro:
    'Measure and steer prose toward a reading profile. Open a layer below, or follow an inline trail into Readings when you want the research thread.',
  pillars: [
    {
      id: 'overview',
      label: 'Overview',
      relation:
        'gras_to_text scores a passage against a profile, then suggests how to nudge the prose without flattening the voice. The package keeps the measure visible so a rewrite is a choice, not a black box.',
      subsections: [
        {
          id: 'readings',
          label: 'Readings',
          linkText: 'Readings',
          relation:
            'Readings collect the papers and notes that shaped the profile. Each card points at what was measured and what was left alone.',
        },
      ],
    },
    {
      id: 'pipeline',
      label: 'Pipeline',
      relation:
        'The pipeline is a short chain: ingest, score, propose, and report. Each stage is a function you can call alone, so a test can pin one hop without spinning the whole loop.',
      subsections: [
        {
          id: 'blind-batch',
          label: 'Blind batch',
          linkText: 'Blind batch',
          relation:
            'Blind batch runs fresh subjects with no repo access. Four new cases land as cards so an agent can prove the measure without peeking at prior answers.',
        },
      ],
    },
  ],
}

const WIRE_CAGE: ProjectsDetailDoc = {
  id: 'wire-cage',
  name: 'Wire cage',
  intro:
    'Ceramic pulse lamps and crest-following lighting for product scenes. Dive into Lamps for the hardware story, or Crest when the follow curve is the question.',
  pillars: [
    {
      id: 'lamps',
      label: 'Lamps',
      relation:
        'Lamps are ceramic shells with a pulse that reads as breath, not a strobe. Gain and color stay scene tokens so a product shot can dim with the Menu retreat.',
    },
    {
      id: 'crest',
      label: 'Crest',
      relation: 'Crest follow keeps the bright edge on the silhouette. Tuning lives one step deeper when the curve needs a hand.',
      subsections: [
        {
          id: 'tuning',
          label: 'Tuning',
          linkText: 'Tuning',
          relation:
            'Tuning is a small set of falloff and lag knobs. Keep them soft enough that the crest rides the mesh without swimming.',
        },
      ],
    },
  ],
}

const LCL_LAYOUT: ProjectsDetailDoc = {
  id: 'lcl-layout',
  name: 'LCL layout',
  intro:
    'Eight by eight viewport tiles, hairline enter, nest lists, and prose clip. Open Tiles for the grid, or Breadcrumb trail when the path is the point.',
  pillars: [
    {
      id: 'tiles',
      label: 'Tiles',
      relation:
        'Tiles paint sections from cell lists. Bounds stay normalized so a title band and a body panel can share one 8×8 without inventing a second host.',
      subsections: [
        {
          id: 'nest-rows',
          label: 'Nest rows',
          linkText: 'Nest rows',
          relation:
            'Nest rows are full-width Gras underline buttons. List in and out rides upright chars and eirene pills together so leave never strands a hairline.',
        },
      ],
    },
    {
      id: 'breadcrumb-trail',
      label: 'Breadcrumb trail',
      relation:
        'The trail only shows visited steps. Root sits at the top left of the body panel, above the 1px rule, never under a second title.',
    },
  ],
}

/** Docs keyed by catalog row id. Missing ids fall back to a thin stub. */
export const PROJECTS_DETAIL_DOCS: readonly ProjectsDetailDoc[] = [GRAS_TO_TEXT, WIRE_CAGE, LCL_LAYOUT]

function findSection(
  sections: readonly ProjectsDetailSection[],
  label: string,
): ProjectsDetailSection | undefined {
  for (const section of sections) {
    if (section.label === label) return section
    if (section.subsections) {
      const nested = findSection(section.subsections, label)
      if (nested) return nested
    }
  }
  return undefined
}

export function projectsDetailById(id: string): ProjectsDetailDoc | undefined {
  return PROJECTS_DETAIL_DOCS.find((doc) => doc.id === id)
}

export function projectsDetailSectionByLabel(
  doc: ProjectsDetailDoc,
  label: string,
): ProjectsDetailSection | undefined {
  return findSection(doc.pillars, label)
}

/** Thin stub when a catalog row has no deep fixture yet. */
export function projectsDetailStub(id: string, name: string, desc: string): ProjectsDetailDoc {
  return {
    id,
    name,
    intro: desc,
    pillars: [
      {
        id: 'notes',
        label: 'Notes',
        relation: `${desc} Deeper pages for this project will land here.`,
      },
    ],
  }
}

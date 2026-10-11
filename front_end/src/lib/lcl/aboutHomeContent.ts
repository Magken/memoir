/**

 * About Home stage-1 copy: collective intro, GRAS expansion, navigable sections.

 * No em dashes in reader copy. First person: we are the students and peers.

 */



import {

  GRAS_EXPAND_PREFIX,

  GRAS_EXPAND_SUFFIX,

  GRAS_LETTERS,

} from '../webgl/runtime/text/grasLetterLayout'



export const ABOUT_HOME_ROOT_LABEL = 'About'



/** Same stems as the Home hover expand: General Representation of Abstract Systems. */

export const ABOUT_HOME_GRAS_LETTERS = GRAS_LETTERS.map((letter) => ({

  letter,

  prefix: GRAS_EXPAND_PREFIX[letter],

  rest: GRAS_EXPAND_SUFFIX[letter],

}))



/** Visible G(eneral) R(epresentation) of A(bstract) S(ystems) for prose-inline links. */

export const ABOUT_HOME_GRAS_LABEL = ABOUT_HOME_GRAS_LETTERS.map((part, index) => {

  const gap = index > 0 ? ' ' : ''

  const prefix = part.prefix ? `${part.prefix} ` : ''

  return `${gap}${prefix}${part.letter}(${part.rest})`

}).join('')



/** Breadcrumb / path label for the GRAS section. */

export const ABOUT_HOME_GRAS_CRUMB = 'G R A S'



/** Breadcrumb / path label for the JEPA subsection (letter-spaced like GRAS). */

export const ABOUT_HOME_JEPA_CRUMB = 'J E P A'



export const ABOUT_HOME_INTRO_LEAD = 'We are a collective of'

export const ABOUT_HOME_INTRO_STUDENTS = 'Students'

export const ABOUT_HOME_INTRO_PEERS = 'Like Minded Individuals'

export const ABOUT_HOME_INTRO = 'exploring the front of research and industry through the'



export const ABOUT_HOME_INTRO_TAIL = 'in the following areas.'



export type AboutHomeLink = {

  href: string

  label: string

}



export type AboutHomeSection = {

  id: string

  label: string

  /** Body copy shown when this section is open. */

  relation: string

  /** Optional copy after inline subsection links (keeps JEPA mid-sentence). */

  relationAfter?: string

  /** Optional external references (e.g. Meta / Facebook Research). */

  links?: readonly AboutHomeLink[]

  /** Nested LCL subsections (breadcrumb path layers). */

  subsections?: readonly AboutHomeSection[]

}



/** Shared JEPA subsection: short definition + one Meta research link. */

export const ABOUT_HOME_JEPA_SECTION: AboutHomeSection = {

  id: 'jepa',

  label: ABOUT_HOME_JEPA_CRUMB,

  relation:

    'JEPA means the Joint Embedding Predictive Architecture, proposed by Yann LeCun as a way for machines to learn predictive world models in abstract representation space rather than by regenerating pixels or tokens.',

  links: [

    {

      href: 'https://ai.meta.com/blog/yann-lecun-ai-model-i-jepa/',

      label: 'Meta AI on I-JEPA and world models',

    },

  ],

}



/** Linguistics leaf layers under Media. */

export const ABOUT_HOME_LINGUISTICS_LEAVES: readonly AboutHomeSection[] = [

  {

    id: 'llms',

    label: 'LLMs',

    relation:

      'Large language models are one place we meet language at scale. We intend to learn how they form, fail, and help, by building and reading with them rather than treating them as finished answers.',

  },

  {

    id: 'nltk',

    label: 'NLTK',

    relation:

      'NLTK is a toolkit we can use to work with text step by step: tokens, structure, and small experiments. We intend to begin with the basics so the pipeline stays something we understand.',

  },

  {

    id: 'transcription',

    label: 'Transcription',

    relation:

      'Transcription is how spoken language becomes text we can study and share. We intend to explore it as a bridge between voice, writing, and the systems that carry both.',

  },

  {

    id: 'translation',

    label: 'Translation',

    relation:

      'Translation is how meaning moves between languages. We intend to treat it as careful work with sense and form, not only as an automatic swap of words.',

  },

]



export const ABOUT_HOME_LINGUISTICS_SECTION: AboutHomeSection = {

  id: 'linguistics',

  label: 'Linguistics',

  relation:

    'Linguistics is where we meet language as a system: structure, sound, and use. We intend to learn by building with tools and practices such as',

  relationAfter: '.',

  subsections: ABOUT_HOME_LINGUISTICS_LEAVES,

}



/** Semantics leaf layers under Media. */

export const ABOUT_HOME_SEMANTICS_LEAVES: readonly AboutHomeSection[] = [

  {

    id: 'lexical-semantics',

    label: 'Lexical meaning',

    relation:

      'Lexical meaning is how words carry sense on their own and in company. We intend to map that carefully so our builds do not blur what a term is meant to hold.',

  },

  {

    id: 'compositional-semantics',

    label: 'Composition',

    relation:

      'Composition is how smaller meanings combine into larger ones. We intend to follow that path when we design language and structure in the work.',

  },

  {

    id: 'contextual-semantics',

    label: 'Context',

    relation:

      'Context is how situation and use shift what a sign can mean. We intend to keep that in view so representation stays honest to how people actually speak and read.',

  },

]



export const ABOUT_HOME_SEMANTICS_SECTION: AboutHomeSection = {

  id: 'semantics',

  label: 'Semantics',

  relation:

    'Semantics is how we approach meaning: what signs carry, how sense shifts, and how we keep that meaning clear when we build. We look especially at',

  relationAfter: '.',

  subsections: ABOUT_HOME_SEMANTICS_LEAVES,

}



/** Ontology leaf layers under Media. */

export const ABOUT_HOME_ONTOLOGY_LEAVES: readonly AboutHomeSection[] = [

  {

    id: 'concepts',

    label: 'Concepts',

    relation:

      'Concepts are the named kinds we use to talk about a domain. We intend to choose them with care so the map of the work stays shareable.',

  },

  {

    id: 'relations',

    label: 'Relations',

    relation:

      'Relations are the links between concepts: how one thing depends on, contains, or differs from another. We intend to make those links explicit when we model a field.',

  },

  {

    id: 'hierarchies',

    label: 'Hierarchies',

    relation:

      'Hierarchies are how we nest kinds from general to specific. We intend to use them when they help, and to question them when a flat or networked view fits better.',

  },

]



export const ABOUT_HOME_ONTOLOGY_SECTION: AboutHomeSection = {

  id: 'ontology',

  label: 'Ontology',

  relation:

    'Ontology is how we name and relate what exists in a domain: concepts, types, and the links between them. We intend to work with',

  relationAfter: '.',

  subsections: ABOUT_HOME_ONTOLOGY_LEAVES,

}



/** Intro prose links: Students, peers, GRAS. */

export const ABOUT_HOME_LINK_SECTIONS: readonly AboutHomeSection[] = [

  {

    id: 'students',

    label: ABOUT_HOME_INTRO_STUDENTS,

    relation:

      'We are university students who learn by building together. Away from coursework we put projects together so we can explore what is out there and grow into the work ahead of us. Classrooms cannot always keep us at the front of what is happening in the world. The general representation of abstract systems is how we hope to venture out in our own right.',

  },

  {

    id: 'peers',

    label: ABOUT_HOME_INTRO_PEERS,

    relation:

      'We join as peers, not spectators: professors, assistants, and others who care about the same frontiers. We bring practice from labs, studios, and industry, and we build together so the collective can stay open, honest, and shared.',

  },

  {

    id: 'gras',

    label: ABOUT_HOME_GRAS_CRUMB,

    relation:

      'GRAS means the General Representation of Abstract Systems. We intend to build from scratch, starting with the basics, and to follow how complex, dynamic representations of these systems might grow out of simple ideas. That path from first principles to living models is what the name asks of us.',

  },

]



/** Nest list areas. */

export const ABOUT_HOME_AREAS: readonly AboutHomeSection[] = [

  {

    id: 'ai',

    label: 'Artificial intelligence',

    relation:

      'Through the general representation of abstract systems we hope to meet artificial intelligence from first principles: what a system is, how it represents the world, and how those representations might grow more complex over time. We intend to explore world models in that spirit, including ideas from',

    relationAfter:

      ', so learning can stay closer to structure than to surface prediction alone. We try models and tools together as a way to reach what labs and industry are doing and to learn with our own hands.',

    subsections: [ABOUT_HOME_JEPA_SECTION],

  },

  {

    id: 'robotics',

    label: 'Robotics',

    relation:

      'In robotics we intend to begin with sensing, control, and motion, and to explore world models that might help a machine predict and act as the environment changes. One of the ideas we look to is',

    relationAfter:

      ': learning what the world is doing at the level of representation, then connecting that understanding to machines that move. We work side by side so the hard parts stay shared.',

    subsections: [ABOUT_HOME_JEPA_SECTION],

  },

  {

    id: 'systems',

    label: 'Systems modeling',

    relation:

      'Systems modeling is where the general representation of abstract systems feels most literal. We intend to draw on system dynamics: feedback, stocks and flows, and how structure can shape behavior over time. The systems we hope to work with range from technical stacks to economic systems and other social, living, and engineered worlds. Working together helps keep those maps teachable and honest as they grow.',

  },

  {

    id: 'media',

    label: 'Media',

    relation:

      'Media is how we hope to show the path from basic concepts to living systems. Through essays, scenes, and builds we share what we find beyond the usual syllabus. We also explore',

    relationAfter:

      ' as ways of naming, structuring, and moving meaning through the work.',

    subsections: [

      ABOUT_HOME_LINGUISTICS_SECTION,

      ABOUT_HOME_SEMANTICS_SECTION,

      ABOUT_HOME_ONTOLOGY_SECTION,

    ],

  },

]



/** Top-level navigable sections (intro links + nest areas). */

export const ABOUT_HOME_SECTIONS: readonly AboutHomeSection[] = [

  ...ABOUT_HOME_LINK_SECTIONS,

  ...ABOUT_HOME_AREAS,

]



export type AboutHomeArea = AboutHomeSection



function findAboutHomeSection(

  sections: readonly AboutHomeSection[],

  label: string,

): AboutHomeSection | undefined {

  for (const section of sections) {

    if (section.label === label) return section

    if (section.subsections) {

      const nested = findAboutHomeSection(section.subsections, label)

      if (nested) return nested

    }

  }

  return undefined

}



export function aboutHomeSectionByLabel(label: string): AboutHomeSection | undefined {

  return findAboutHomeSection(ABOUT_HOME_SECTIONS, label)

}



/** @deprecated Prefer aboutHomeSectionByLabel. */

export function aboutHomeAreaByLabel(label: string): AboutHomeSection | undefined {

  return aboutHomeSectionByLabel(label)

}



/**

 * Split multi-word sideways titles into two stack lines (same nesting as who / are we?).

 * One word stays a single line; GRAS / JEPA letter crumbs stay one line; other two+ words balance.

 */

export function splitAboutDisplayTitle(title: string): readonly [string] | readonly [string, string] {

  const trimmed = title.trim() || title

  if (trimmed === ABOUT_HOME_GRAS_CRUMB || trimmed === ABOUT_HOME_JEPA_CRUMB) return [trimmed]



  const words = trimmed.split(/\s+/).filter(Boolean)

  if (words.length <= 1) return [trimmed]

  if (words.length === 2) return [words[0]!, words[1]!]



  let bestAt = 1

  let bestScore = Number.POSITIVE_INFINITY

  for (let at = 1; at < words.length; at += 1) {

    const left = words.slice(0, at).join(' ').length

    const right = words.slice(at).join(' ').length

    const score = Math.abs(left - right)

    if (score < bestScore) {

      bestScore = score

      bestAt = at

    }

  }

  return [words.slice(0, bestAt).join(' '), words.slice(bestAt).join(' ')]

}



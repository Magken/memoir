/**
 * About Text canvas copy: motto paragraph and the collaboration notes.
 * No em dashes in reader copy.
 */

export type AboutWorkLink = {
  href: string
  label: string
}

export type AboutWorkSection = {
  id: string
  label: string
  /** Body copy shown when this note is open. */
  relation: string
  /** Optional copy after an inline subsection link. */
  relationAfter?: string
  /** Nested breadcrumb pages opened from prose links, not from the root list. */
  subsections?: readonly AboutWorkSection[]
  /** Sentence form of a subsection link, when the crumb label should differ. */
  linkText?: string
  /** External places. These are links, not breadcrumb pages. */
  links?: readonly AboutWorkLink[]
}

export const ABOUT_WORK_INTRO_REST =
  'We believe creativity is just intelligence having fun, and we acknowledge that it takes courage to be creative. Here at GRAS we are creating a hub for passionate people who want to give their work a voice. It does not have to be perfect or groundbreaking. It has to be you.'

export const ABOUT_WORK_INTRO = `SEARCH, CREATE, CONNECT. ${ABOUT_WORK_INTRO_REST}`

/** Motto pages opened from the intro. They are not rows on the list. */
export const ABOUT_WORK_MOTTO: readonly AboutWorkSection[] = [
  {
    id: 'search',
    label: 'SEARCH',
    relation:
      'Look. Then look deeper, and look again. Searching is how we stay with a question long enough to notice what the first glance missed.',
  },
  {
    id: 'create',
    label: 'CREATE',
    relation:
      'Make the thing, even while it is still rough. Creation is how an idea leaves your head and becomes work someone else can meet.',
  },
  {
    id: 'connect',
    label: 'CONNECT',
    relation:
      'Explore the repositories. Connection is how your work meets what others are already doing, so it can travel instead of sitting alone.',
  },
]

/** Nest list: what makes the collaboration possible, plus how we use AI. */
export const ABOUT_WORK_PILLARS: readonly AboutWorkSection[] = [
  {
    id: 'repositories',
    label: 'Repositories',
    relation:
      'Our projects live in repositories so the work stays findable while we build it. Code and the history of a project live on GitHub. Models, and the datasets that travel with them, live on Hugging Face. Broader dataset work lives on Kaggle. We use these places because a peer should be able to open the same files, not piece them back together from memory. It does not have to be these three. Another kind of repository can be integrated, as long as it can be made public.',
    links: [
      { href: 'https://github.com', label: 'GitHub' },
      { href: 'https://huggingface.co', label: 'Hugging Face' },
      { href: 'https://huggingface.co/datasets', label: 'Hugging Face datasets' },
      { href: 'https://www.kaggle.com/datasets', label: 'Kaggle datasets' },
    ],
  },
  {
    id: 'web-media',
    label: 'Web media',
    relation:
      'We approach media and communication in two ways. One is this website, used as a canvas: story, image, and motion painted on the page. The other is pages we will integrate soon, on YouTube and places like it, for making the work and for sending it further out.',
  },
  {
    id: 'wiki',
    label: 'Wiki',
    relation: 'Through the website we keep a wiki of interconnected projects. We call that wiki',
    relationAfter:
      '. One page points to the next, so a build is not a dead end. We write what we tried, what it connects to, and where to go from here. A later reader should be able to find the thread without starting over.',
    subsections: [
      {
        id: 'repo-pedia',
        label: 'Repo-pedia',
        relation:
          'Repo came from repository, and pedia came from Wikipedia. The creator is notoriously bad at naming things.',
      },
    ],
  },
  {
    id: 'use-of-ai',
    label: 'Use of AI',
    relation:
      'Use of AI is a choice, not a rule. We reach for it when it helps us search, draft, or see a problem from another side. The work still has to be something we understand and can stand next to. We would rather show an honest attempt than a tidy answer we cannot explain. We do not create',
    relationAfter: '.',
    subsections: [
      {
        id: 'slop',
        label: 'Slop',
        linkText: 'slop',
        relation: 'Slop is work that looks finished and has no one behind it. We do not make that here.',
      },
    ],
  },
]

function findAboutWorkSection(
  sections: readonly AboutWorkSection[],
  label: string,
): AboutWorkSection | undefined {
  for (const section of sections) {
    if (section.label === label) return section
    if (section.subsections) {
      const nested = findAboutWorkSection(section.subsections, label)
      if (nested) return nested
    }
  }
  return undefined
}

export function aboutWorkSectionByLabel(label: string): AboutWorkSection | undefined {
  return findAboutWorkSection([...ABOUT_WORK_MOTTO, ...ABOUT_WORK_PILLARS], label)
}

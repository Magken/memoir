/**
 * How we work copy: motto, collaboration notes, no em dashes.
 * Run: npx tsx front_end/src/lib/lcl/aboutWorkContent.unit.mjs
 */
import assert from 'node:assert/strict'
import { ABOUT_WORK_INTRO, ABOUT_WORK_MOTTO, ABOUT_WORK_PILLARS, aboutWorkSectionByLabel } from './aboutWorkContent.ts'

function sectionCopy(sections) {
  return sections.flatMap((section) => [
    section.relation,
    section.relationAfter ?? '',
    ...(section.links?.map((link) => link.label) ?? []),
    ...(section.subsections?.flatMap((nested) => [nested.relation, nested.relationAfter ?? '']) ?? []),
  ])
}

const copy = [ABOUT_WORK_INTRO, ...sectionCopy([...ABOUT_WORK_MOTTO, ...ABOUT_WORK_PILLARS])].join('\n')

assert.match(ABOUT_WORK_INTRO, /^SEARCH, CREATE, CONNECT\./)
assert.match(ABOUT_WORK_INTRO, /creativity is just intelligence having fun/)
assert.match(ABOUT_WORK_INTRO, /courage to be creative/)
assert.match(ABOUT_WORK_INTRO, /passionate people who want to give their work a voice/)
assert.match(ABOUT_WORK_INTRO, /It does not have to be perfect or groundbreaking/)
assert.match(ABOUT_WORK_INTRO, /It has to be you/)
assert.doesNotMatch(
  ABOUT_WORK_INTRO,
  /slop|in the open|one tool among others/,
  'negative: the motto does not lecture about slop or park AI in the paragraph',
)
assert.deepEqual(
  ABOUT_WORK_PILLARS.map((section) => section.label),
  ['Repositories', 'Web media', 'Wiki', 'Use of AI'],
)
assert.match(aboutWorkSectionByLabel('Repositories')?.relation ?? '', /GitHub/)
assert.match(aboutWorkSectionByLabel('Repositories')?.relation ?? '', /Hugging Face/)
assert.match(aboutWorkSectionByLabel('Repositories')?.relation ?? '', /Kaggle/)
assert.match(aboutWorkSectionByLabel('Repositories')?.relation ?? '', /does not have to be these three/)
assert.match(aboutWorkSectionByLabel('Repositories')?.relation ?? '', /can be integrated/)
assert.match(aboutWorkSectionByLabel('Repositories')?.relation ?? '', /made public/)
assert.doesNotMatch(
  aboutWorkSectionByLabel('Repositories')?.relation ?? '',
  /only these three|must be GitHub/,
  'negative: other public repositories are allowed',
)
assert.deepEqual(
  aboutWorkSectionByLabel('Repositories')?.links?.map((link) => link.href),
  [
    'https://github.com',
    'https://huggingface.co',
    'https://huggingface.co/datasets',
    'https://www.kaggle.com/datasets',
  ],
)
assert.equal(aboutWorkSectionByLabel('GitHub'), undefined, 'negative: GitHub is a link, not a breadcrumb page')
assert.equal(aboutWorkSectionByLabel('Kaggle'), undefined, 'negative: Kaggle is a link, not a breadcrumb page')
assert.match(aboutWorkSectionByLabel('Web media')?.relation ?? '', /canvas/)
assert.match(aboutWorkSectionByLabel('Web media')?.relation ?? '', /YouTube/)
assert.match(aboutWorkSectionByLabel('Web media')?.relation ?? '', /two ways/)
assert.equal(aboutWorkSectionByLabel('YouTube'), undefined, 'negative: YouTube is mentioned, not a breadcrumb page')
assert.match(aboutWorkSectionByLabel('Wiki')?.relation ?? '', /interconnected projects/)
assert.equal(aboutWorkSectionByLabel('Wiki')?.subsections?.[0]?.label, 'Repo-pedia')
assert.match(aboutWorkSectionByLabel('Repo-pedia')?.relation ?? '', /repository/)
assert.match(aboutWorkSectionByLabel('Repo-pedia')?.relation ?? '', /Wikipedia/)
assert.match(aboutWorkSectionByLabel('Repo-pedia')?.relation ?? '', /notoriously bad at naming things/)
assert.equal(
  ABOUT_WORK_PILLARS.some((section) => section.label === 'Repo-pedia'),
  false,
  'negative: Repo-pedia is a wiki subpage, not a root row',
)
assert.deepEqual(
  ABOUT_WORK_MOTTO.map((section) => section.label),
  ['SEARCH', 'CREATE', 'CONNECT'],
)
assert.match(aboutWorkSectionByLabel('SEARCH')?.relation ?? '', /Searching is how/)
assert.match(aboutWorkSectionByLabel('CREATE')?.relation ?? '', /Creation is how/)
assert.doesNotMatch(
  aboutWorkSectionByLabel('CREATE')?.relation ?? '',
  /Create is how/,
  'negative: the page uses the noun creation',
)
assert.match(aboutWorkSectionByLabel('CONNECT')?.relation ?? '', /Connection is how/)
assert.match(aboutWorkSectionByLabel('CONNECT')?.relation ?? '', /repositories/)
assert.equal(
  ABOUT_WORK_PILLARS.some((section) => section.label === 'SEARCH'),
  false,
  'negative: SEARCH is a motto page, not a root row',
)
assert.match(aboutWorkSectionByLabel('Use of AI')?.relation ?? '', /choice, not a rule/)
assert.match(aboutWorkSectionByLabel('Use of AI')?.relation ?? '', /stand next to/)
assert.match(aboutWorkSectionByLabel('Use of AI')?.relation ?? '', /We do not create/)
assert.equal(aboutWorkSectionByLabel('Use of AI')?.subsections?.[0]?.label, 'Slop')
assert.equal(aboutWorkSectionByLabel('Use of AI')?.subsections?.[0]?.linkText, 'slop')
assert.match(aboutWorkSectionByLabel('Slop')?.relation ?? '', /no one behind it/)
assert.equal(
  ABOUT_WORK_PILLARS.some((section) => section.label === 'Slop'),
  false,
  'negative: Slop is a page under Use of AI, not a root row',
)
assert.equal(aboutWorkSectionByLabel('Media'), undefined, 'negative: About Home areas are not How we work notes')
assert.doesNotMatch(copy, /\u2014|\u2013/, 'negative: reader copy has no em or en dash')
assert.doesNotMatch(ABOUT_WORK_INTRO, /slop/, 'negative: the motto paragraph does not lecture about slop')

console.log('aboutWorkContent: ok')

/**

 * About Home copy: GRAS letters, intro link sections, nest areas, no em dashes.

 * Run: npx tsx front_end/src/lib/lcl/aboutHomeContent.unit.mjs

 */

import assert from 'node:assert/strict'

import {

  ABOUT_HOME_AREAS,

  ABOUT_HOME_GRAS_CRUMB,

  ABOUT_HOME_GRAS_LABEL,

  ABOUT_HOME_GRAS_LETTERS,

  ABOUT_HOME_INTRO,

  ABOUT_HOME_INTRO_LEAD,

  ABOUT_HOME_INTRO_PEERS,

  ABOUT_HOME_INTRO_STUDENTS,

  ABOUT_HOME_INTRO_TAIL,

  ABOUT_HOME_JEPA_CRUMB,

  ABOUT_HOME_JEPA_SECTION,

  ABOUT_HOME_LINGUISTICS_SECTION,

  ABOUT_HOME_LINK_SECTIONS,

  ABOUT_HOME_ONTOLOGY_SECTION,

  ABOUT_HOME_ROOT_LABEL,

  ABOUT_HOME_SECTIONS,

  ABOUT_HOME_SEMANTICS_SECTION,

  aboutHomeAreaByLabel,

  aboutHomeSectionByLabel,

  splitAboutDisplayTitle,

} from './aboutHomeContent.ts'

import {

  GRAS_EXPAND_PREFIX,

  GRAS_EXPAND_SUFFIX,

} from '../webgl/runtime/text/grasLetterLayout.ts'



assert.equal(ABOUT_HOME_ROOT_LABEL, 'About')

assert.equal(ABOUT_HOME_GRAS_CRUMB, 'G R A S')

assert.equal(ABOUT_HOME_JEPA_CRUMB, 'J E P A')

assert.equal(ABOUT_HOME_GRAS_LETTERS.length, 4)

assert.deepEqual(

  ABOUT_HOME_GRAS_LETTERS.map((part) => part.letter).join(''),

  'GRAS',

)

for (const part of ABOUT_HOME_GRAS_LETTERS) {

  assert.equal(part.rest, GRAS_EXPAND_SUFFIX[part.letter])

  assert.equal(part.prefix, GRAS_EXPAND_PREFIX[part.letter])

}

assert.equal(

  ABOUT_HOME_GRAS_LABEL,

  'G(eneral) R(epresentation) of A(bstract) S(ystems)',

)

assert.equal(ABOUT_HOME_INTRO_LEAD, 'We are a collective of')

assert.equal(ABOUT_HOME_INTRO_STUDENTS, 'Students')

assert.equal(ABOUT_HOME_INTRO_PEERS, 'Like Minded Individuals')

assert.match(ABOUT_HOME_INTRO, /through the$/)

assert.equal(ABOUT_HOME_INTRO_TAIL, 'in the following areas.')

assert.equal(ABOUT_HOME_LINK_SECTIONS.length, 3)

assert.equal(ABOUT_HOME_AREAS.length, 4)

assert.deepEqual(

  ABOUT_HOME_AREAS.map((area) => area.label),

  ['Artificial intelligence', 'Robotics', 'Systems modeling', 'Media'],

)



const media = aboutHomeSectionByLabel('Media')

assert.ok(media)

assert.match(media.relation, /We also explore$/)

assert.match(media.relationAfter ?? '', /as ways of naming/)

assert.deepEqual(

  media.subsections?.map((sub) => sub.label),

  ['Linguistics', 'Semantics', 'Ontology'],

)



assert.equal(ABOUT_HOME_LINGUISTICS_SECTION.label, 'Linguistics')

assert.deepEqual(

  ABOUT_HOME_LINGUISTICS_SECTION.subsections?.map((sub) => sub.label),

  ['LLMs', 'NLTK', 'Transcription', 'Translation'],

)

assert.equal(aboutHomeSectionByLabel('LLMs')?.id, 'llms')

assert.equal(aboutHomeSectionByLabel('NLTK')?.id, 'nltk')

assert.equal(aboutHomeSectionByLabel('Transcription')?.id, 'transcription')

assert.equal(aboutHomeSectionByLabel('Translation')?.id, 'translation')



assert.equal(ABOUT_HOME_SEMANTICS_SECTION.label, 'Semantics')

assert.deepEqual(

  ABOUT_HOME_SEMANTICS_SECTION.subsections?.map((sub) => sub.label),

  ['Lexical meaning', 'Composition', 'Context'],

)

assert.equal(aboutHomeSectionByLabel('Lexical meaning')?.id, 'lexical-semantics')



assert.equal(ABOUT_HOME_ONTOLOGY_SECTION.label, 'Ontology')

assert.deepEqual(

  ABOUT_HOME_ONTOLOGY_SECTION.subsections?.map((sub) => sub.label),

  ['Concepts', 'Relations', 'Hierarchies'],

)

assert.equal(aboutHomeSectionByLabel('Concepts')?.id, 'concepts')



assert.equal(aboutHomeSectionByLabel(ABOUT_HOME_JEPA_CRUMB)?.id, 'jepa')

assert.equal(aboutHomeSectionByLabel('Linguistics')?.id, 'linguistics')

assert.equal(aboutHomeSectionByLabel('Semantics')?.id, 'semantics')

assert.equal(aboutHomeSectionByLabel('Ontology')?.id, 'ontology')

assert.equal(aboutHomeSectionByLabel('Nowhere'), undefined)

assert.equal(aboutHomeAreaByLabel('Media')?.id, 'media')



const ai = aboutHomeSectionByLabel('Artificial intelligence')

assert.ok(ai?.subsections?.some((sub) => sub.id === 'jepa'))

assert.match(ai?.relation ?? '', /including ideas from$/)

assert.doesNotMatch((ai?.relation ?? '') + (ai?.relationAfter ?? ''), /\bJEPA\b|Students and peers/)



assert.equal(ABOUT_HOME_JEPA_SECTION.links?.length, 1)

assert.ok(ABOUT_HOME_JEPA_SECTION.relation.length < 320)



assert.deepEqual(splitAboutDisplayTitle('Lexical meaning'), ['Lexical', 'meaning'])

assert.deepEqual(splitAboutDisplayTitle('G R A S'), ['G R A S'])

assert.deepEqual(splitAboutDisplayTitle('J E P A'), ['J E P A'])



const blob = [

  ABOUT_HOME_INTRO_LEAD,

  ABOUT_HOME_INTRO,

  ABOUT_HOME_INTRO_TAIL,

  ...ABOUT_HOME_SECTIONS.map((section) => section.relation + (section.relationAfter ?? '')),

  ABOUT_HOME_JEPA_SECTION.relation,

  ...(ABOUT_HOME_LINGUISTICS_SECTION.subsections ?? []).map((s) => s.relation),

  ...(ABOUT_HOME_SEMANTICS_SECTION.subsections ?? []).map((s) => s.relation),

  ...(ABOUT_HOME_ONTOLOGY_SECTION.subsections ?? []).map((s) => s.relation),

].join('\n')

assert.doesNotMatch(blob, /\u2014|\u2013/)

assert.doesNotMatch(blob, /\bGRAS is\b/)

assert.doesNotMatch(

  blob,

  /Students and peers|students and peers|Student collaboration/,

  'negative: we are the students and peers â€” no third-person collective',

)



console.log('aboutHomeContent: ok')



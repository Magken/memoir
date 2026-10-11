/**
 * Creator Overview tags, peel chips, board PDF appendix, and timeline wiring.
 * Run: npx tsx front_end/src/lib/interviewBrief/creatorOverviewTags.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  appendBoardOverviewContext,
  CREATOR_OVERVIEW_SECTION_ID,
  creatorOverviewPeelTags,
  creatorOverviewSectionTags,
  truncateOverviewFilename,
} from './creatorOverviewTags.ts'
import {
  ANALYSIS_TEMPLATES_SECTION_ID,
  housingChromeTitle,
  RESULT_OVERVIEW_SECTION_ID,
  seedHousingChromeTitles,
} from './housingChrome.ts'
import { INTERVIEW_ROLE_CATEGORY_OPTIONS, normalizeInterviewRoleCategoryValue } from './roleCategories.ts'

{
  assert.equal(
    INTERVIEW_ROLE_CATEGORY_OPTIONS.every((o) => !/[\u2014\u2013]/.test(o.label)),
    true,
    'category labels must not use em/en dashes',
  )
  assert.equal(
    normalizeInterviewRoleCategoryValue('Engineering — Software'),
    'engineering-software',
    'legacy em-dash labels still resolve',
  )
}

{
  assert.equal(CREATOR_OVERVIEW_SECTION_ID, '__creator_overview__')
  assert.equal(ANALYSIS_TEMPLATES_SECTION_ID, '__analysis_templates__')
  assert.equal(housingChromeTitle(CREATOR_OVERVIEW_SECTION_ID), 'Overview')
  assert.equal(housingChromeTitle(ANALYSIS_TEMPLATES_SECTION_ID), 'Templates')
  assert.equal(
    housingChromeTitle(RESULT_OVERVIEW_SECTION_ID),
    undefined,
    'result Overview is not Creator housing chrome',
  )
  assert.equal(housingChromeTitle('ph.open'), undefined)
  const titles = seedHousingChromeTitles()
  assert.equal(titles.get(CREATOR_OVERVIEW_SECTION_ID), 'Overview')
  assert.equal(titles.get(ANALYSIS_TEMPLATES_SECTION_ID), 'Templates')
  const kept = seedHousingChromeTitles(
    new Map([[CREATOR_OVERVIEW_SECTION_ID, 'Introduction & Overview']]),
  )
  assert.equal(
    kept.get(CREATOR_OVERVIEW_SECTION_ID),
    'Introduction & Overview',
    'negative: existing titles are not overwritten',
  )
}

{
  const empty = creatorOverviewSectionTags({})
  assert.deepEqual(empty, [], 'empty facts → no tags')
  assert.equal(
    creatorOverviewSectionTags({ roleDescription: '   ' }).length,
    0,
    'blank description → no Description tag',
  )
  assert.equal(
    creatorOverviewSectionTags({ category: 'other' }).length,
    0,
    'other category is skipped',
  )
}

{
  const tags = creatorOverviewSectionTags({
    category: 'engineering-software',
    proposedMinutes: 12,
    opensAt: '2026-09-05T00:00:00.000Z',
    coverName: 'cover.png',
    roleDescription: 'Hire a backend owner.',
    rolePdfName: 'handoff.pdf',
    candidateDescription: 'Welcome.',
    maxInterviews: 25,
  })
  const labels = tags.map((t) => t.label)
  assert.ok(labels.includes('Engineering, Software'), `category: ${labels.join(' | ')}`)
  assert.ok(labels.includes('12m'), 'minutes')
  assert.ok(labels.includes('Thumbnail'), 'cover')
  assert.ok(labels.includes('Description'), 'description present')
  assert.ok(
    labels.some((l) => l.includes('handoff')),
    `PDF filename in tags, got ${labels.join(' | ')}`,
  )
  assert.ok(labels.includes('Intro'), 'intro')
  assert.ok(labels.includes('25 seats'), 'capacity')
  assert.ok(!labels.some((l) => /rolePdf|meta|chrome|Path A|agency notes/i.test(l)))
}

{
  assert.deepEqual(creatorOverviewPeelTags({}), [], 'negative: empty facts → no peel chips')
  assert.deepEqual(creatorOverviewPeelTags({ roleDescription: '  ' }), [])
  const withDesc = creatorOverviewPeelTags({ roleDescription: 'Hire a backend owner.' })
  assert.deepEqual(withDesc, [{ kind: 'notes', label: 'Notes' }])
  const withPdf = creatorOverviewPeelTags({ rolePdfName: 'handoff.pdf' })
  assert.deepEqual(withPdf, [{ kind: 'pdf', label: 'handoff.pdf' }])
  assert.ok(!withPdf[0].label.startsWith('PDF · '), 'PDF chip is filename, not PDF · prefix')
  const both = creatorOverviewPeelTags({
    roleDescription: 'notes',
    rolePdfName: 'very-long-role-brief-filename-that-should-truncate.pdf',
  })
  assert.equal(both.length, 2)
  assert.deepEqual(both[0], { kind: 'notes', label: 'Notes' })
  assert.equal(both[1].kind, 'pdf')
  assert.ok(!both[1].label.startsWith('PDF · '))
  assert.ok(!both[1].label.includes('Interview description'))
  assert.ok(both[1].label.includes('…'))
  assert.ok(both[1].label.length <= 16)
}

{
  assert.equal(truncateOverviewFilename('handoff.pdf'), 'handoff.pdf')
  const long = truncateOverviewFilename('a'.repeat(40) + '.pdf')
  assert.ok(long.includes('…'))
  assert.ok(long.endsWith('.pdf'))
  assert.ok(long.length <= 28)
}

{
  const msg = 'Add a form gate.'
  assert.equal(appendBoardOverviewContext(msg, {}), msg, 'no PDF → message unchanged')
  assert.equal(appendBoardOverviewContext(msg, { rolePdfText: '  ' }), msg)
  const withExtract = appendBoardOverviewContext(msg, { rolePdfText: 'Own the API surface.' })
  assert.ok(withExtract.startsWith(msg))
  assert.ok(withExtract.includes('Role description PDF extract:'))
  assert.ok(withExtract.includes('Own the API surface.'))
  assert.ok(!withExtract.includes('rolePdf'))
}

{
  const here = dirname(fileURLToPath(import.meta.url))
  const timeline = readFileSync(join(here, '../../components/InterviewFlowTimeline.tsx'), 'utf8')
  assert.match(
    timeline,
    /const OVERVIEW_SECTION_ID = '__result_overview__'/,
    'result Overview id stays __result_overview__',
  )
  const tocStart = timeline.indexOf('const tocEntries')
  const tocEnd = timeline.indexOf('const tocSortableIds')
  assert.ok(tocStart >= 0 && tocEnd > tocStart, 'tocEntries block')
  const toc = timeline.slice(tocStart, tocEnd)
  const creatorIdx = toc.indexOf('CREATOR_OVERVIEW_SECTION_ID')
  const templatesIdx = toc.indexOf('TEMPLATES_SECTION_ID')
  assert.ok(creatorIdx >= 0, 'Contents pushes creator Overview')
  assert.ok(templatesIdx > creatorIdx, 'Contents Overview comes before Templates')
  assert.ok(
    timeline.includes("ANALYSIS_TEMPLATES_SECTION_ID as TEMPLATES_SECTION_ID"),
    'Templates chrome id comes from housingChrome',
  )
  assert.ok(
    !timeline.includes('Interview notes'),
    'homemade Interview notes fold is gone',
  )
  assert.ok(
    !timeline.includes('About this interview'),
    'homemade About this interview fold is gone',
  )
  const enterIdx = timeline.indexOf('const enterEditStage')
  assert.ok(enterIdx >= 0, 'enterEditStage is declared')
  const enterBlock = timeline.slice(enterIdx, timeline.indexOf('const jumpOverviewCite'))
  assert.match(
    enterBlock,
    /if \(id === CREATOR_OVERVIEW_SECTION_ID\) \{[\s\S]*return/,
    'Open/Scroll on Overview scrolls the day row instead of opening __edit-stage',
  )
  assert.ok(
    !timeline.includes('editCreatorOverview'),
    'Overview is not a Theme-menu edit stage',
  )
  const overviewItem = timeline.slice(
    timeline.indexOf('id={CREATOR_OVERVIEW_SECTION_ID}'),
    timeline.indexOf('id={TEMPLATES_SECTION_ID}'),
  )
  assert.ok(
    overviewItem.includes('<InterviewFlowCreatorOverviewSection'),
    'day row mounts the Overview form',
  )
  assert.ok(
    !overviewItem.includes('expanded={false}'),
    'day Overview is not a collapsed Templates-style row',
  )
  assert.ok(
    !overviewItem.includes('enterEditStage(CREATOR_OVERVIEW'),
    'day Overview does not enter edit-stage on toggle',
  )
}

{
  const here = dirname(fileURLToPath(import.meta.url))
  const overview = readFileSync(
    join(here, '../../components/InterviewFlowCreatorOverviewSection.tsx'),
    'utf8',
  )
  const rowHits = overview.split('compose-brief-row').length - 1
  assert.equal(rowHits, 1, `one compose-brief-row, got ${rowHits}`)
  assert.ok(overview.includes('theme-interview-creator__compose-pair'), 'fields pair side by side')
  assert.ok(
    !overview.includes('compose-brief-rule'),
    'Overview is one column — no second-column divider',
  )
  assert.ok(
    !overview.includes('FilePreviewToggle'),
    'Overview file previews stay visible',
  )
  assert.ok(overview.includes('preview="rows"'), 'thumbnail preview is shown')
  assert.ok(overview.includes('preview="pdf"'), 'role PDF preview is shown')
  assert.ok(
    !overview.includes('InterviewFlowSectionToolbar'),
    'no Edit | Preview toolbar on Overview',
  )
  assert.ok(
    !overview.includes('expanded={false}'),
    'Overview is not a collapsed Templates-style section',
  )
  const headStart = overview.indexOf('export function InterviewFlowCreatorOverviewSectionHead')
  assert.ok(headStart >= 0, 'Head export')
  const head = overview.slice(headStart)
  assert.ok(!head.includes('brief.title'), 'Head does not repeat the interview title')
  assert.ok(!head.includes('personaName'), 'Head does not repeat the persona')
  assert.ok(!head.includes('roleTitle'), 'Head does not repeat the role')
  const windowAt = overview.indexOf('title="Window"')
  const introAt = overview.indexOf('title="What candidates see"')
  assert.ok(windowAt >= 0 && introAt > windowAt, 'Window sits with identity, not buried')
  assert.ok(overview.includes('Role description PDF'), 'PDF field uses human label')
  assert.ok(overview.includes('Interview description'), 'description uses compose label')
  assert.ok(!overview.includes('Interview notes'))
  const roleAt = overview.indexOf('label="Role"')
  const categoryAt = overview.indexOf('label="Category"')
  const personaHeadAt = overview.indexOf('title="Persona"')
  assert.ok(roleAt >= 0 && categoryAt > roleAt && categoryAt < windowAt, 'Category sits after Role in the header')
  assert.ok(
    personaHeadAt > categoryAt && personaHeadAt < windowAt,
    'Persona divider sits after the header, before Window',
  )
  assert.ok(overview.includes('layout="compact"'), 'persona uses paired field labels, not extra SettingsRows')
  assert.ok(!overview.includes('layout="settings"'), 'negative: Overview persona is not SettingsRow dialect')
  const personaEd = readFileSync(
    join(here, '../../components/InterviewPersonaEditor.tsx'),
    'utf8',
  )
  const compactAt = personaEd.indexOf('if (compact)')
  const settingsAt = personaEd.indexOf('if (settings)')
  const compact = personaEd.slice(compactAt, settingsAt)
  assert.ok(
    compact.includes('compose-pair">{voiceField}'),
    'Voice sits in a 2-col pair so it occupies one column',
  )
  assert.ok(
    !/<\/div>\s*\{voiceField\}/.test(compact),
    'negative: Voice must not stretch as a full-width compact sibling',
  )
  const introFieldAt = overview.indexOf('label="Candidate intro"')
  const descAt = overview.indexOf('label="Interview description"')
  const pdfAt = overview.indexOf('Role description PDF')
  assert.ok(
    introFieldAt >= 0 && descAt > introFieldAt && descAt < pdfAt,
    'intro and description sit together before the role PDF',
  )
  const ui = overview.replace(
    /rolePdfFile|rolePdfName|onRolePdfFileChange|ROLE_PDF_|rolePdfText/g,
    '',
  )
  assert.ok(!ui.includes('rolePdf'), 'UI copy must not say rolePdf')
  assert.ok(!/agency notes|Path A|\bchrome\b/i.test(overview))
}

{
  const here = dirname(fileURLToPath(import.meta.url))
  const talk = readFileSync(join(here, '../../components/InterviewFlowTalkEditor.tsx'), 'utf8')
  const locked = readFileSync(
    join(here, '../../components/InterviewFlowLockedAnalysisChips.tsx'),
    'utf8',
  )
  const css = readFileSync(
    join(here, '../../css/effects/interview-flow-timeline.css'),
    'utf8',
  )
  assert.ok(
    talk.includes('theme-interview-flow-talk__attach-weights'),
    'Talk attached templates use the full-width weight stack',
  )
  assert.ok(
    talk.includes('theme-interview-flow-talk__template-weight'),
    'Talk attached templates sit on chip+count rows',
  )
  assert.ok(
    locked.includes('theme-interview-flow-talk__attach-weights'),
    'Locked Form/Coding/Writing chips use the same weight stack',
  )
  assert.ok(locked.includes('allowDecimal'), 'chip weights keep 0.05 steps')
  const wrap = readFileSync(join(here, '../../components/InterviewFlowWrapEditor.tsx'), 'utf8')
  assert.ok(
    wrap.includes('theme-interview-flow-talk__attach-chips'),
    'Wrap still uses attach-chips for section membership',
  )
  assert.ok(
    !wrap.includes('theme-interview-flow-talk__attach-weights'),
    'negative: Wrap section chips are not stacked as weight rows',
  )
  assert.ok(
    css.includes('.theme-interview-flow-form__settings-control') &&
      css.includes('> .theme-interview-flow-talk__attach-weights'),
    'settings-control lifts the 24rem cap only for weight stacks',
  )
  assert.ok(
    css.includes('minmax(0, 1fr) 5.75rem'),
    'template tags take the majority; count sits in a fixed end column',
  )
  assert.ok(
    css.includes('text-overflow: ellipsis'),
    'long template tags ellipsize',
  )
}

{
  const here = dirname(fileURLToPath(import.meta.url))
  const editors = [
    'InterviewFlowFormEditor.tsx',
    'InterviewFlowTalkEditor.tsx',
    'InterviewFlowCodingEditor.tsx',
    'InterviewFlowDocEditor.tsx',
    'InterviewFlowWrapEditor.tsx',
    'InterviewFlowTemplatesSection.tsx',
  ]
  for (const name of editors) {
    const src = readFileSync(join(here, '../../components', name), 'utf8')
    assert.match(
      src,
      /const \[previewOpen, setPreviewOpen\] = useState\(true\)/,
      `${name} shows section preview on the day row`,
    )
  }
  const doc = readFileSync(join(here, '../../components/InterviewFlowDocEditor.tsx'), 'utf8')
  assert.ok(
    doc.includes('theme-interview-flow-doc__matrix-group--preview'),
    'essay marking table is the preview group that may span both columns',
  )
  assert.ok(
    doc.includes('theme-interview-flow-doc__matrix-bands'),
    'essay bands render as a bullet list',
  )
  assert.ok(
    !doc.includes('<td>{row.bands}</td>'),
    'negative: bands are not dumped as a text cell',
  )
  const css = readFileSync(
    join(here, '../../css/effects/interview-flow-timeline.css'),
    'utf8',
  )
  assert.ok(
    css.includes(':not(.theme-interview-flow-doc__matrix-group--preview)'),
    'essay settings besides the table stay 36rem',
  )
}

{
  const here = dirname(fileURLToPath(import.meta.url))
  const chat = readFileSync(join(here, '../../components/InterviewCreatorChat.tsx'), 'utf8')
  assert.ok(chat.includes('appendBoardOverviewContext'), 'board plan appends PDF extract')
  assert.ok(chat.includes('extractPdfText'), 'board plan extracts the uploaded PDF')
  assert.ok(
    chat.includes('theme-interview-creator-chat__composer-attach'),
    'peel chips sit inside the composer field',
  )
  assert.match(chat, /leading=\{/, 'chips use InterviewBoardComposer leading, like Copilot')
  assert.ok(chat.includes('FileText'), 'PDF chip uses a document icon')
  assert.ok(chat.includes('NotebookText'), 'notes chip uses a notes icon')
  assert.ok(
    !chat.includes('theme-interview-creator-chat__overview-tags'),
    'chips are not a strip above the composer',
  )
  assert.ok(
    chat.includes('seedHousingChromeTitles'),
    'Open/Scroll cards label Overview and Templates from housing chrome',
  )
  const creator = readFileSync(join(here, '../../components/InterviewCreator.tsx'), 'utf8')
  assert.ok(
    /rolePdfDirty|coverDirty/.test(creator) &&
      creator.includes('flushCreator2ForBotTurn'),
    'flush persists dirty files',
  )
  const flushBlock = creator.slice(
    creator.indexOf('const flushCreator2ForBotTurn'),
    creator.indexOf('const invokeCreator2Action'),
  )
  assert.ok(flushBlock.includes('rolePdfDirty'), 'flush checks PDF dirty')
  assert.ok(flushBlock.includes('coverDirty'), 'flush checks cover dirty')
}

{
  const here = dirname(fileURLToPath(import.meta.url))
  const overview = readFileSync(
    join(here, '../../components/InterviewFlowCreatorOverviewSection.tsx'),
    'utf8',
  )
  const mainAt = overview.indexOf('theme-interview-creator__compose-brief-main')
  const personaAt = overview.indexOf('title="Persona"')
  assert.ok(mainAt >= 0 && personaAt > mainAt, 'header before Persona')
  const header = overview.slice(mainAt, personaAt)
  assert.ok(
    !header.includes('theme-interview-creator__compose-pair--3'),
    'negative: Category is not on the Title|Role 3-col pair',
  )
  const titleAt = header.indexOf('label="Interview title"')
  const roleLabelAt = header.indexOf('label="Role"')
  const catLabelAt = header.indexOf('label="Category"')
  const firstPairClose = header.indexOf('</Pair>')
  assert.ok(titleAt >= 0 && roleLabelAt > titleAt && roleLabelAt < firstPairClose, 'Title|Role share the first pair')
  assert.ok(
    catLabelAt > firstPairClose,
    'Category sits on the row below Title|Role',
  )
  assert.ok(
    header.slice(firstPairClose).includes('</Pair>'),
    'Category is in its own 2-col pair (one occupied cell)',
  )
  const docEditor = readFileSync(
    join(here, '../../components/InterviewFlowDocEditor.tsx'),
    'utf8',
  )
  assert.ok(
    docEditor.includes('matrix-group--preview'),
    'negative: essay matrix-group--preview untouched',
  )
}

{
  const here = dirname(fileURLToPath(import.meta.url))
  const timeline = readFileSync(join(here, '../../components/InterviewFlowTimeline.tsx'), 'utf8')
  const tocAddAt = timeline.indexOf('theme-interview-flow-timeline__toc-add')
  const tocAddEnd = timeline.indexOf('contentsToc =') > tocAddAt
    ? timeline.indexOf('return (', tocAddAt)
    : timeline.length
  const tocFooter = timeline.slice(tocAddAt, tocAddEnd)
  assert.ok(tocFooter.includes('INTERVIEW_FLOW_SECTION_ADD_KINDS.map'), 'Contents footer maps four kinds')
  assert.ok(tocFooter.includes('theme-interview-flow-timeline__add-rule'), 'Contents add kinds have hairline dividers')
  assert.ok(tocFooter.includes('index > 0'), 'divider skips the first kind')
  assert.ok(tocFooter.includes('<Tooltip'), 'Contents add icons have tooltips')
  assert.ok(tocFooter.includes('Add ${row.label}'), 'icon-only Add Form label')
  assert.ok(!tocFooter.includes('CascadeMenuButton'), 'no Plus cascade in Contents footer')
  assert.ok(!/\bPlus\b/.test(tocFooter), 'no Plus icon in Contents footer')
  const addBar = readFileSync(
    join(here, '../../components/InterviewFlowSectionAddBar.tsx'),
    'utf8',
  )
  assert.ok(addBar.includes('{row.label}'), 'day footer add bar still has word labels')
  assert.ok(
    /pendingFocusAddedRef\.current = true/.test(timeline),
    'pendingFocusAddedRef still set in addSection',
  )
}

console.log('creatorOverviewTags.unit.mjs ok')

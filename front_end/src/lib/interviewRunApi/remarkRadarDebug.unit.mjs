/**
 * Remark radar DIAG — grain homes, notes types, Why length.
 * Run: npx tsx front_end/src/lib/interviewRunApi/remarkRadarDebug.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { formatRemarkRadarDebug } from './remarkRadarDebug.ts'

const assistBrief = {
  schemaVersion: 1,
  kind: 'interview_brief',
  definition: {},
  topicLibrary: [{ id: 'topic.a', label: 'Opening', probes: [], analysis: { attachPack: 'pack.talk' } }],
  phases: [
    { id: 'ph.talk', kind: 'discussion', topicId: 'topic.a', title: 'Opening' },
    { id: 'ph.code', kind: 'tool', toolRef: 'tool.code', title: 'Two-sum' },
  ],
  tools: {
    'tool.code': {
      type: 'coding',
      title: 'Two-sum',
      assist: { chat: true },
      analysis: {
        templateIds: [
          'mark.code.tests.v1',
          'mark.code.method.v1',
          'mark.code.structure.v1',
          'mark.code.approach.v1',
          'mark.code.authorship.v1',
          'mark.assist.use.v1',
          'synth.tool.v1',
        ],
      },
    },
  },
  analysis: {},
}

function emptyAnalysis() {
  return { turns: {}, tools: {}, topics: {}, rollup: null, partial: null, markTrace: [] }
}

{
  const dump = formatRemarkRadarDebug({
    briefId: 'fixture:remark-debug-assist',
    brief: assistBrief,
    response: {
      briefId: 'fixture:remark-debug-assist',
      completedPhaseIds: ['ph.code'],
      messages: [
        {
          id: 'm-assist',
          phaseId: 'ph.code',
          role: 'candidate',
          kind: 'answer',
          text: 'rename the helper',
          at: '',
          topicId: null,
          probeId: null,
        },
      ],
      analysis: {
        ...emptyAnalysis(),
        tools: {
          'tool.code': {
            'mark.assist.use.v1': {
              templateId: 'mark.assist.use.v1',
              hostRef: 'tool.code',
              grain: 'after_tool',
              order: 22,
              status: 'skipped',
              result: null,
              justification: 'No assist messages on this stage.',
            },
          },
        },
        turns: {
          'm-assist': {
            'mark.assist.use.v1': {
              templateId: 'mark.assist.use.v1',
              hostRef: 'tool.code',
              grain: 'after_turn',
              order: 1,
              status: 'filled',
              justification: 'Pointed ask.',
              dimensions: [
                { key: 'asked_well', label: 'Asked well', score: 'strong', notes: 'Named the helper.' },
                { key: 'over_reliance', label: 'Over-reliance', score: 'weak' },
              ],
            },
          },
        },
      },
    },
  })
  assert.match(dump, /======== Remark radar DIAG \(copy\) ========/)
  assert.match(dump, /PICKED: turns:m-assist/)
  assert.match(dump, /CANDIDATES:[\s\S]*tools:tool\.code status=skipped/)
  assert.match(dump, /asked_well[\s\S]*whyLen=17[\s\S]*notes=string/)
  // whyLen is the mark justification, not 0: an axis with no notes of its own
  // inherits the leftover justification as its Why (interviewRunApi.md — Radar
  // Why), which is what this mark's 'Pointed ask.' is doing here.
  const INHERITED_WHY_LEN = 'Pointed ask.'.length
  assert.match(
    dump,
    new RegExp(
      `over_reliance score=weak reading=Weak unit=0\\.20 absent=no whyLen=${INHERITED_WHY_LEN}`,
    ),
    'scored Weak plots on the first ring, not the origin',
  )
  assert.match(dump, /PHASE ph\.talk[\s\S]*TEMPLATE iv\.content\.v1[\s\S]*PICKED: none/)
  assert.match(dump, /CANDIDATES: \(none\)/)
}

{
  const dump = formatRemarkRadarDebug({
    briefId: 'fixture:remark-debug-object-notes',
    brief: assistBrief,
    response: {
      briefId: 'fixture:remark-debug-object-notes',
      completedPhaseIds: ['ph.code'],
      messages: [],
      analysis: {
        ...emptyAnalysis(),
        tools: {
          'tool.code': {
            'mark.assist.use.v1': {
              templateId: 'mark.assist.use.v1',
              hostRef: 'tool.code',
              grain: 'after_tool',
              order: 22,
              status: 'filled',
              dimensions: [
                {
                  key: 'asked_well',
                  label: 'Asked well',
                  score: 'weak',
                  notes: { asked_well: 'Named the helper rather than dumping a rewrite.' },
                },
              ],
            },
          },
        },
      },
    },
  })
  assert.match(
    dump,
    /asked_well[\s\S]*whyLen=0[\s\S]*notes=object/,
    'object notes on the axis must show as whyLen=0 so Remark debug names the Why miss',
  )
  assert.match(dump, /PICKED: tools:tool\.code/)
  assert.match(dump, /notes=object/)
  assert.doesNotMatch(dump, /TEMPLATE mark\.form\.key\.v1/)
}

{
  const src = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '../../components/InterviewFinishedScene.tsx'),
    'utf8',
  )
  assert.match(src, /formatRemarkRadarDebug/)
  assert.match(src, /Copy radar debug/)
  assert.match(src, /handleCopyRadarDebug/)
  assert.match(src, /remarkWatch/)
}

console.log('remarkRadarDebug.unit.mjs: ok')

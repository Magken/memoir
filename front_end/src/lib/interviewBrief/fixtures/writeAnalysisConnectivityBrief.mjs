/**
 * One-shot: persist the Staff 80m loop with every analysis output kind attached.
 * Writes staffSecurityEngineer80mAnalysisConnectivity.json beside this file.
 * Run: npx tsx front_end/src/lib/interviewBrief/fixtures/writeAnalysisConnectivityBrief.mjs
 */
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import staff from './staffSecurityEngineer80mHardenedLoop.json' with { type: 'json' }
import {
  resolveTemplateCardMeta,
  serializeTemplateCardMeta,
} from '../analysisLabels.ts'
import { patchCreator2TemplateLibrary } from '../patchCreator2TemplateLibrary.ts'

const IMPACT_ID = 'custom.impact'
const SCALAR_ID = 'custom.incident-count'
const TOPIC_ID = 'topic.890lut'

const impactAuthored = {
  title: 'Impact evidence rubric CANARY',
  subtitle: 'Runs on end of section',
  details: 'Score named impact evidence on this discussion.',
  outputKind: 'dimensions',
  storageKey: IMPACT_ID,
  justificationPolicy: 'always_required',
  dimensions: [
    {
      key: 'impact',
      label: 'Impact',
      options: ['absent', 'emerging', 'consistent'],
      defaultOption: 'mixed',
      optionNotes: [
        'Not shown in the answer.',
        'One named instance of a metric they moved.',
        'Several named instances.',
      ],
      evidenceModel: 'accumulative',
    },
  ],
  taxonomy: [],
  maxPerTurn: 3,
  enumValues: [],
}

const scalarAuthored = {
  title: 'Incident count score CANARY',
  subtitle: 'Runs on end of section',
  details: 'Count distinct named incidents in the story.',
  criterion: 'Named distinct incidents, not vibes.',
  outputKind: 'scalar',
  storageKey: SCALAR_ID,
  justificationPolicy: 'always_required',
  dimensions: [],
  taxonomy: [],
  maxPerTurn: 3,
  enumValues: [],
}

const staffClone = structuredClone(staff)
const libraryIds = [
  ...new Set([
    ...(staffClone.analysis?.overrides?.libraryIds ?? []),
    'iv.delivery.v1',
    'iv.content.v1',
    IMPACT_ID,
    SCALAR_ID,
  ]),
]
const templateMeta = {}
for (const id of libraryIds) {
  if (id === IMPACT_ID) {
    templateMeta[id] = serializeTemplateCardMeta(id, impactAuthored)
    continue
  }
  if (id === SCALAR_ID) {
    templateMeta[id] = serializeTemplateCardMeta(id, scalarAuthored)
    continue
  }
  const stored = staffClone.analysis?.overrides?.templateCards?.[id]
  templateMeta[id] = serializeTemplateCardMeta(
    id,
    stored ? resolveTemplateCardMeta(id, stored) : resolveTemplateCardMeta(id),
  )
}

const { doc } = patchCreator2TemplateLibrary(staffClone, { libraryIds, templateMeta })
const ownershipTopic = doc.topicLibrary.find((t) => t.id === TOPIC_ID)
if (!ownershipTopic) throw new Error('missing ownership topic')
ownershipTopic.analysis = {
  ...ownershipTopic.analysis,
  templateIds: [
    ...new Set([
      ...(ownershipTopic.analysis?.templateIds ?? []),
      'iv.ownership.v1',
      IMPACT_ID,
      SCALAR_ID,
    ]),
  ],
}

const out = join(dirname(fileURLToPath(import.meta.url)), 'staffSecurityEngineer80mAnalysisConnectivity.json')
writeFileSync(out, `${JSON.stringify(doc, null, 2)}\n`)
console.log('wrote', out)

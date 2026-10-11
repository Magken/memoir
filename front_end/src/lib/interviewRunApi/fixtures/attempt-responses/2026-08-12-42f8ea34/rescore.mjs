/**
 * Re-score fixture 42f8ea34 with template_role_v1 soft grade.
 * Run: npx tsx front_end/src/lib/interviewRunApi/fixtures/attempt-responses/2026-08-12-42f8ea34/rescore.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { scoreAttempt } from '../../../scoreAttempt.ts'
import { assembleAttemptReport } from '../../../attemptReport.ts'

const here = dirname(fileURLToPath(import.meta.url))
const response = JSON.parse(readFileSync(join(here, 'interview-response.json'), 'utf8'))
const rollupResult = response.analysis?.rollup?.result ?? {}
const brief = {
  analysis: {
    rollup: {
      weights: rollupResult.weights ?? {
        formMark: 'gate_only',
        codingTests: 0.25,
        codingMethod: 0.1,
        essay: 0.15,
        interviewDelivery: 0.2,
        interviewContent: 0.3,
      },
      weightSections: rollupResult.weightSections ?? {},
    },
  },
}
const scored = scoreAttempt({ brief, response })
writeFileSync(join(here, 'soft-grade-v1.json'), JSON.stringify(scored, null, 2))
const summary = {
  overall: scored.softGrade.overall,
  excluded: scored.softGrade.excludedBuckets,
  byWeight: Object.fromEntries(
    Object.entries(scored.softGrade.byWeight).map(([k, v]) => [
      k,
      { unit: v.unit, included: v.included, weight: v.weight, sources: v.sources.length },
    ]),
  ),
  formGate: scored.formGate,
  artifacts: {
    topicSynths: Object.keys(scored.artifacts.topicSynths).length,
    toolSynths: Object.keys(scored.artifacts.toolSynths).length,
    histograms: Object.keys(scored.artifacts.histograms),
    targetMisses: scored.artifacts.targetMisses.length,
  },
}
writeFileSync(join(here, 'soft-grade-v1.summary.json'), JSON.stringify(summary, null, 2))
const report = assembleAttemptReport({ brief, response, scored })
writeFileSync(join(here, 'attempt-report.json'), JSON.stringify(report, null, 2))
console.log(JSON.stringify(summary, null, 2))

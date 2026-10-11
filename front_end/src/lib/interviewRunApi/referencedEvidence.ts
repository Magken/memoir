/**
 * Section-reference evidence — lean index + capped candidate-safe / assessor packs.
 * Off (no phaseIds) → empty. Never includes hidden oracles or form answerKey.
 */
import type { Creator2BriefDocument } from '../interviewBrief/creator2BriefTypes'
import type { InterviewResponse } from './talkTypes'

export type ReferencedLookIn = 'utterances' | 'artifact' | 'run' | 'scores'

export type ReferencedStageIndex = {
  phaseId: string
  title: string
  kind: 'talk' | 'form' | 'coding' | 'doc' | 'unknown'
  hostRef: string | null
  available: ReferencedLookIn[]
}

export type ReferencedToolRun = {
  phaseId: string
  passed: boolean | null
  passedCount?: number
  total?: number
  failingIds: string[]
}

export type ReferencedArtifactDigest = {
  phaseId: string
  kind: ReferencedStageIndex['kind']
  digest: string
}

export type ReferencedToolSynth = {
  phaseId: string
  boardSummary: string
}

export type ReferencedEvidencePack = {
  index: ReferencedStageIndex[]
  candidateSafe: {
    artifacts: ReferencedArtifactDigest[]
    runs: ReferencedToolRun[]
    synths: ReferencedToolSynth[]
  }
  assessor: {
    artifacts: ReferencedArtifactDigest[]
    runs: ReferencedToolRun[]
    synths: ReferencedToolSynth[]
    grainNotes: Array<{ phaseId: string; templateId: string; note: string }>
  }
}

const DIGEST_CHARS = 280
const SYNTH_CHARS = 220
const GRAIN_NOTE_CHARS = 180
const MAX_FAILING = 6
const MAX_GRAINS = 6
const BANNED_RE =
  /\b(answer\s*key|expected\s*[:=]|oracle|hidden\s+case\s+expected)\b/i

function clip(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1).trim()}…`
}

function scrub(text: string, max: number): string {
  const cleaned = text.replace(BANNED_RE, '[redacted]')
  return clip(cleaned, max)
}

function phaseKind(
  brief: Creator2BriefDocument,
  phaseId: string,
): ReferencedStageIndex['kind'] {
  const phase = brief.phases.find((p) => p.id === phaseId)
  if (!phase) return 'unknown'
  if (phase.kind === 'discussion') return 'talk'
  const tool = phase.toolRef ? brief.tools[phase.toolRef] : undefined
  const t = String(tool?.type ?? '').toLowerCase()
  const ek = String(tool?.editorKind ?? '').toLowerCase()
  if (t === 'coding' || ek === 'code') return 'coding'
  if (t === 'doc' || ek === 'doc') return 'doc'
  if (t.includes('form') || ek === 'testform') return 'form'
  return 'unknown'
}

function hostRefFor(
  brief: Creator2BriefDocument,
  phaseId: string,
): string | null {
  const phase = brief.phases.find((p) => p.id === phaseId)
  if (!phase) return null
  if (phase.kind === 'discussion') return phase.topicId ?? null
  return phase.toolRef ?? null
}

function rec(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null
}

function packageFor(response: InterviewResponse, hostRef: string | null): Record<string, unknown> | null {
  if (!hostRef) return null
  return rec(response.analysis.toolPackages?.[hostRef])
}

function readRun(
  phaseId: string,
  pkg: Record<string, unknown> | null,
  grains: Record<string, { result?: unknown; justification?: string }> | undefined,
): ReferencedToolRun | null {
  const tests = grains?.['mark.code.tests.v1']
  const result = rec(tests?.result)
  const overall = rec(pkg?.overall)
  const passedCount =
    typeof result?.passedCount === 'number'
      ? result.passedCount
      : typeof overall?.score === 'number'
        ? overall.score
        : undefined
  const total =
    typeof result?.total === 'number'
      ? result.total
      : typeof overall?.max === 'number'
        ? overall.max
        : undefined
  const passed =
    typeof overall?.passed === 'boolean'
      ? overall.passed
      : typeof result?.passed === 'boolean'
        ? result.passed
        : null
  const failingRaw = Array.isArray(result?.failing)
    ? result!.failing
    : Array.isArray(result?.failingIds)
      ? result!.failingIds
      : []
  const failingIds = failingRaw
    .map((row) => {
      if (typeof row === 'string') return row.trim()
      const o = rec(row)
      return typeof o?.id === 'string' ? o.id.trim() : ''
    })
    .filter(Boolean)
    .slice(0, MAX_FAILING)
  if (passed == null && passedCount == null && !failingIds.length) return null
  return { phaseId, passed, passedCount, total, failingIds }
}

function boardSynth(
  phaseId: string,
  pkg: Record<string, unknown> | null,
  grains: Record<string, { justification?: string; result?: unknown }> | undefined,
  assessor: boolean,
): ReferencedToolSynth | null {
  const glance =
    typeof pkg?.boardSummary === 'string' && pkg.boardSummary.trim()
      ? pkg.boardSummary.trim()
      : ''
  if (glance) return { phaseId, boardSummary: scrub(glance, SYNTH_CHARS) }
  if (!assessor) return null
  const fromPkg =
    typeof pkg?.summary === 'string' && pkg.summary.trim() ? pkg.summary.trim() : ''
  const synthGrain = grains?.['synth.tool.v1']
  const fromGrain =
    typeof synthGrain?.justification === 'string' && synthGrain.justification.trim()
      ? synthGrain.justification.trim()
      : ''
  const text = scrub(fromPkg || fromGrain, SYNTH_CHARS)
  return text ? { phaseId, boardSummary: text } : null
}

function artifactDigest(
  phaseId: string,
  kind: ReferencedStageIndex['kind'],
  pkg: Record<string, unknown> | null,
  response: InterviewResponse,
): ReferencedArtifactDigest | null {
  const items = Array.isArray(pkg?.items) ? pkg!.items : []
  const labels = items
    .map((row) => {
      const o = rec(row)
      const label = typeof o?.label === 'string' ? o.label.trim() : ''
      const notes = typeof o?.notes === 'string' ? o.notes.trim() : ''
      return [label, notes].filter(Boolean).join(': ')
    })
    .filter((line) => line && !BANNED_RE.test(line))
    .slice(0, 4)
  const fromPkg = labels.join(' · ')
  const turns = response.messages
    .filter(
      (m) =>
        m.phaseId === phaseId &&
        (m.role === 'assistant' || m.role === 'candidate') &&
        m.text.trim(),
    )
    .slice(-4)
    .map((m) => `${m.role}: ${clip(m.text, 80)}`)
  const digest = scrub(fromPkg || turns.join(' | '), DIGEST_CHARS)
  if (!digest) return null
  return { phaseId, kind, digest }
}

export function referencedPhaseIdsFromBrief(
  brief: Creator2BriefDocument | null | undefined,
  consumingPhaseId: string,
): string[] {
  if (!brief) return []
  const phase = brief.phases.find((p) => p.id === consumingPhaseId)
  const ids = (phase?.references?.phaseIds ?? [])
    .map((id) => String(id ?? '').trim())
    .filter(Boolean)
  const idx = brief.phases.findIndex((p) => p.id === consumingPhaseId)
  const earlier = new Set(
    (idx > 0 ? brief.phases.slice(0, idx) : []).map((p) => p.id),
  )
  return [...new Set(ids.filter((id) => earlier.has(id)))].slice(0, 3)
}

export function indexReferencedStages(
  brief: Creator2BriefDocument,
  phaseIds: readonly string[],
  response?: InterviewResponse | null,
): ReferencedStageIndex[] {
  const out: ReferencedStageIndex[] = []
  for (const phaseId of phaseIds) {
    const phase = brief.phases.find((p) => p.id === phaseId)
    if (!phase) continue
    const kind = phaseKind(brief, phaseId)
    const hostRef = hostRefFor(brief, phaseId)
    const available: ReferencedLookIn[] = ['utterances']
    if (kind !== 'talk') available.push('artifact', 'scores')
    if (kind === 'coding') available.push('run')
    if (kind === 'talk') available.push('scores')
    if (response) {
      const hasTurns = response.messages.some((m) => m.phaseId === phaseId)
      if (!hasTurns) {
        const i = available.indexOf('utterances')
        if (i >= 0 && kind !== 'talk') available.splice(i, 1)
      }
    }
    out.push({
      phaseId,
      title: (phase.title || '').trim() || phaseId,
      kind,
      hostRef,
      available,
    })
  }
  return out
}

export function emptyReferencedEvidence(): ReferencedEvidencePack {
  return {
    index: [],
    candidateSafe: { artifacts: [], runs: [], synths: [] },
    assessor: { artifacts: [], runs: [], synths: [], grainNotes: [] },
  }
}

export function buildReferencedEvidence(input: {
  brief: Creator2BriefDocument
  consumingPhaseId: string
  response: InterviewResponse
  phaseIds?: readonly string[]
}): ReferencedEvidencePack {
  const phaseIds =
    input.phaseIds ??
    referencedPhaseIdsFromBrief(input.brief, input.consumingPhaseId)
  if (!phaseIds.length) return emptyReferencedEvidence()
  const index = indexReferencedStages(input.brief, phaseIds, input.response)
  const artifacts: ReferencedArtifactDigest[] = []
  const runs: ReferencedToolRun[] = []
  const safeSynths: ReferencedToolSynth[] = []
  const assessorSynths: ReferencedToolSynth[] = []
  const grainNotes: Array<{ phaseId: string; templateId: string; note: string }> = []

  for (const row of index) {
    const hostRef = row.hostRef
    const pkg = packageFor(input.response, hostRef)
    const grains = hostRef ? input.response.analysis.tools[hostRef] : undefined
    const art = artifactDigest(row.phaseId, row.kind, pkg, input.response)
    if (art) artifacts.push(art)
    const run = readRun(row.phaseId, pkg, grains)
    if (run) runs.push(run)
    const safeSynth = boardSynth(row.phaseId, pkg, grains, false)
    if (safeSynth) safeSynths.push(safeSynth)
    const assessorSynth = boardSynth(row.phaseId, pkg, grains, true)
    if (assessorSynth) assessorSynths.push(assessorSynth)
    if (grains) {
      for (const [templateId, grain] of Object.entries(grains).slice(0, MAX_GRAINS)) {
        const note = scrub(
          String(grain.justification ?? rec(grain.result)?.boardSummary ?? ''),
          GRAIN_NOTE_CHARS,
        )
        if (note) grainNotes.push({ phaseId: row.phaseId, templateId, note })
      }
    }
  }

  return {
    index,
    candidateSafe: { artifacts, runs, synths: safeSynths },
    assessor: { artifacts, runs, synths: assessorSynths, grainNotes },
  }
}

export function leanReferencedMeta(
  index: readonly ReferencedStageIndex[],
): Array<{ phaseId: string; title: string; kind: string; available: string[] }> {
  return index.map((r) => ({
    phaseId: r.phaseId,
    title: r.title,
    kind: r.kind,
    available: [...r.available],
  }))
}

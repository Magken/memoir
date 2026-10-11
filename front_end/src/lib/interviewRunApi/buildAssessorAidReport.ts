/**
 * Report digest for Assessor Aid — the recruiter-facing results card as a compact pack.
 *
 * The Aid used to see one Verify modal (a transcript plus its marks) and nothing else, so a
 * question about Security, Clarity, the overall thesis, or another section had no source and
 * came back vague. This flattens the whole card, plus where the reader currently is, into the
 * context so the Aid can answer from the report the reader is looking at.
 */
import type { ResultOverview } from './fixtures/output-cards/outputCardFixture'
import type { ResultReviewPack } from './resultSectionReview'
import { mixWhyFromSoftGrade, leftoverSectionProse, sessionMixAccount } from './resultHomes'
import type { SittingReadTag } from './sittingReadMarkup'

/** Prompt budget: the Edge turns this pack into a labeled digest, not a JSON dump. */
const MAX_PARAGRAPH = 600
const MAX_LINE = 240
const MAX_ROWS = 16
const MAX_SECTIONS = 24

function line(value: unknown, max = MAX_LINE): string {
  const text = String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

function paragraphs(rows: readonly string[] | undefined, max = 3): string[] {
  return (rows ?? [])
    .map((row) => line(row, MAX_PARAGRAPH))
    .filter(Boolean)
    .slice(0, max)
}

function bullets(rows: readonly string[] | undefined, max = MAX_ROWS): string[] {
  return (rows ?? [])
    .map((row) => line(row))
    .filter(Boolean)
    .slice(0, max)
}

function tagText(tags: readonly SittingReadTag[] | undefined, max = 6): string[] {
  return (tags ?? [])
    .map((tag) => {
      const hint = line(tag.hint, 40)
      const label = line(tag.label, 60)
      if (!label && !hint) return ''
      return `${tag.signal}:${[hint, label].filter(Boolean).join(' ')}`
    })
    .filter(Boolean)
    .slice(0, max)
}

function pct(unit: number | null | undefined): string {
  if (typeof unit !== 'number' || !Number.isFinite(unit)) return ''
  return `${Math.round(unit * 100)}%`
}

export type AssessorAidReportLocus = {
  /** `overview` = the reader is on the card itself; `section` = a stage is expanded. */
  view: 'overview' | 'section'
  sectionId?: string
  sectionTitle?: string
  /** Which face of an expanded stage is on screen. */
  stage?: 'chat' | 'editor'
}

export type AssessorAidReportSection = {
  id: string
  title: string
  kind: string
  summary: string
  scoreWhy?: string
  tags: string[]
  axes: Array<{
    radar: string
    label: string
    score?: string
    percent: string
    notes?: string
    face?: 'conversation' | 'work'
  }>
  hasConversation: boolean
  hasWork: boolean
  /** True when the reader currently has this section open. */
  reading?: boolean
}

export type AssessorAidReport = {
  overallPercent: string
  status?: string
  /** Opening paragraph of the card. */
  thesis?: string
  summary?: string
  strengths: string[]
  risks: string[]
  followUps: string[]
  declarations: string[]
  security: {
    title: string
    percent: string
    paragraphs: string[]
    checks: Array<{ check: string; reading: string; note?: string; signal?: string }>
    incidents: Array<{ kind: string; sectionId: string; atMs: number; note?: string }>
    flags: Array<{ label: string; why: string; signal?: string }>
    points: string[]
  }
  clarity: {
    title: string
    percent: string
    paragraphs: string[]
    checks: Array<{ check: string; reading: string; note?: string; signal?: string }>
    findings: Array<{ sectionId: string; body: string; tags: string[] }>
    flags: Array<{ label: string; why: string; signal?: string }>
    points: string[]
  }
  sections: AssessorAidReportSection[]
  /** Glance mix-why sentences (same home as Overview donut). */
  mix: string[]
  /** Typed vs bot vs paste. Distinct from Decision mix-why. */
  editorMix?: string
  locus: AssessorAidReportLocus | null
}

function checkRows(
  rows: ResultOverview['securityChecks'] | undefined,
): Array<{ check: string; reading: string; note?: string; signal?: string }> {
  return (rows ?? []).slice(0, MAX_ROWS).map((row) => {
    const note = line(row.note)
    return {
      check: line(row.check),
      reading: line(row.reading),
      ...(note ? { note } : {}),
      ...(row.signal ? { signal: String(row.signal) } : {}),
    }
  })
}

function flagRows(
  rows: ResultOverview['securityFlags'] | undefined,
): Array<{ label: string; why: string; signal?: string }> {
  return (rows ?? []).slice(0, MAX_ROWS).map((row) => ({
    label: line(row.label),
    why: line(row.why),
    ...(row.signal ? { signal: String(row.signal) } : {}),
  }))
}

function sectionRows(
  overview: ResultOverview,
  review: ResultReviewPack | null,
  locus: AssessorAidReportLocus | null,
): AssessorAidReportSection[] {
  const reviewed = Object.values(review?.sections ?? {})
  if (reviewed.length) {
    const sittingById = new Map(overview.sittingSections.map((row) => [row.sectionId, row]))
    return reviewed.slice(0, MAX_SECTIONS).map((section) => {
      const leftover = leftoverSectionProse(sittingById.get(section.stepId))
      const scoreWhy = line(section.scoreWhy, MAX_PARAGRAPH)
      return {
        id: section.stepId,
        title: line(section.title, 80),
        kind: section.kind,
        summary: line(leftover || section.summary, MAX_PARAGRAPH),
        ...(scoreWhy ? { scoreWhy } : {}),
        tags: tagText(section.tags),
        axes: section.radars.flatMap((radar) =>
          radar.axes.map((axis) => {
            const shown =
              typeof axis.instanceCount === 'number' && axis.instanceCount > 0
                ? axis.instanceCount === 1
                  ? 'Shown in one separate moment.'
                  : `Shown in ${axis.instanceCount} separate moments.`
                : ''
            const notes = [axis.notes, shown].filter(Boolean).join(' ')
            const face =
              radar.face === 'conversation' || radar.face === 'work' ? radar.face : undefined
            return {
              radar: line(radar.label, 40),
              label: line(axis.label, 40),
              ...(axis.score ? { score: line(axis.score, 40) } : {}),
              percent: pct(axis.unit),
              ...(notes ? { notes: line(notes, MAX_PARAGRAPH) } : {}),
              ...(face ? { face } : {}),
            }
          }),
        ),
        hasConversation: section.canChat,
        hasWork: section.canEditor,
        ...(locus?.sectionId === section.stepId ? { reading: true } : {}),
      }
    })
  }
  // Review pack has not built yet — the sitting read still names every section.
  return overview.sittingSections.slice(0, MAX_SECTIONS).map((row) => {
    const scoreWhy = line(row.brief?.scoreWhy, MAX_PARAGRAPH)
    return {
      id: row.sectionId,
      title: line(row.sectionId, 80),
      kind: 'unknown',
      summary: line(leftoverSectionProse(row), MAX_PARAGRAPH),
      ...(scoreWhy ? { scoreWhy } : {}),
      tags: tagText(row.tags),
      axes: [],
      hasConversation: false,
      hasWork: false,
      ...(locus?.sectionId === row.sectionId ? { reading: true } : {}),
    }
  })
}

export function buildAssessorAidReport(input: {
  overview: ResultOverview
  review?: ResultReviewPack | null
  locus?: AssessorAidReportLocus | null
}): AssessorAidReport {
  const { overview } = input
  const locus = input.locus ?? null
  const thesis = overview.sittingThesis
  const declarations = overview.intakeDeclarations
  const declared: string[] = []
  if (declarations?.terms?.statement) declared.push(line(declarations.terms.statement))
  for (const label of declarations?.supportNoteDigest?.labels ?? []) {
    const text = line(label)
    if (text) declared.push(text)
  }
  if (declarations?.supportNoteDigest?.notes) {
    declared.push(line(declarations.supportNoteDigest.notes, MAX_PARAGRAPH))
  }
  const editorMix = sessionMixAccount(overview.sessionMix)

  return {
    overallPercent: pct(overview.overall),
    ...(overview.resultStatus ? { status: String(overview.resultStatus) } : {}),
    ...(thesis?.summary ? { thesis: line(thesis.summary, MAX_PARAGRAPH) } : {}),
    ...(overview.summary ? { summary: line(overview.summary, MAX_PARAGRAPH) } : {}),
    strengths: bullets(thesis?.strengths),
    risks: bullets(thesis?.risks),
    followUps: bullets(thesis?.followUps),
    declarations: declared.slice(0, MAX_ROWS),
    security: {
      title: line(overview.securityTitle, 80),
      percent: pct(overview.securityUnit),
      paragraphs: paragraphs(overview.securityParagraphs),
      checks: checkRows(overview.securityChecks),
      incidents: (overview.securityIncidents ?? []).slice(0, MAX_ROWS).map((row) => {
        const note = line(row.pre?.body || row.post?.body, MAX_PARAGRAPH)
        return {
          kind: line(row.kind, 40),
          sectionId: line(row.sectionId, 60),
          atMs: row.t,
          ...(note ? { note } : {}),
        }
      }),
      flags: flagRows(overview.securityFlags),
      points: bullets(overview.securityPoints),
    },
    clarity: {
      title: line(overview.clarityTitle, 80),
      percent: pct(overview.clarityUnit),
      paragraphs: paragraphs(overview.clarityParagraphs),
      checks: checkRows(overview.clarityChecks),
      findings: (overview.clarityFindings ?? []).slice(0, MAX_ROWS).map((row) => ({
        sectionId: line(row.sectionId, 60),
        body: line(row.brief?.intro || row.body, MAX_PARAGRAPH),
        tags: tagText(row.tags),
      })),
      flags: flagRows(overview.clarityFlags),
      points: bullets(overview.clarityPoints),
    },
    sections: sectionRows(overview, input.review ?? null, locus),
    mix: mixWhyFromSoftGrade(overview.softGrade).map((row) => row.summary),
    ...(editorMix ? { editorMix } : {}),
    locus,
  }
}

/** One-line reading position for the prompt header, e.g. `section "Two-sum" (Work open)`. */
export function describeAidLocus(locus: AssessorAidReportLocus | null | undefined): string {
  if (!locus) return 'unknown'
  if (locus.view === 'overview') return 'the report Overview (no section expanded)'
  const title = locus.sectionTitle?.trim() || locus.sectionId?.trim() || 'a section'
  if (locus.stage === 'chat') return `section "${title}" with Conversation open`
  if (locus.stage === 'editor') return `section "${title}" with Work open`
  return `section "${title}" (collapsed)`
}

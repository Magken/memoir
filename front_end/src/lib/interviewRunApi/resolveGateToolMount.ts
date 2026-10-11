/**
 * Resolve candidate-facing Form / Coding / Doc mounts from a Creator-2 brief phase.
 */
import type { Creator2BriefDocument } from '../interviewBrief/creator2BriefTypes'
import {
  isAuthorOnlyCodingPath,
  listWorkingSrcFiles,
  type CodingTestsBundle,
} from '../interviewBrief/codingWorkspaceFiles'
import { CODING_LANGUAGE_IDS, resolveCodingLanguageForFile } from '../interviewBrief/codingLanguages'
import type { InterviewFlowCodingTestCase } from '../interviewBrief/flowTimelineTypes'
import { mapCreator2BriefToTimeline } from '../interviewBrief/mapCreator2BriefToTimeline'
import type { CodeEditorPayload, DocEditorPayload } from '../editorContext/types'
import type { TestFormDocument } from '../testForm/types'
import { stripAnswerKey } from '../testForm/scoring'
import { gateKindFromLandingLabel } from '../interviewBrief/gateStartPrompts'
import {
  candidateWritingSeedMarkdown,
  stripWritingPageBreakLexical,
  WRITING_PAGELESS_SETUP,
} from '../interviewBrief/writingDocCompose'
import type { InterviewFlowDocPromptStructure } from '../interviewBrief/flowTimelineTypes'

/** Candidate essay canvas — prompt chrome is separate; keep the Your-answer template. */
const AUTHOR_WRITING_SCAFFOLD =
  /##\s*Rubric\s*\(author only\)|##\s*Marking matrix(?:\s*\(author only\))?|##\s*Prompt\b|##\s*Expected structure\b|##\s*Outline\b|##\s*Requirements\b|##\s*Your answer\b/i

/** Author length/timer block may be synced onto seed markdown — not candidate canvas copy. */
const LENGTH_TIME_SECTION_RE =
  /(^|\n)##\s*Length\s*&\s*time\s*\n[\s\S]*?(?=\n##\s+|\s*$)/i

function stripAuthorLengthTime(markdown: string): string {
  return markdown
    .replace(LENGTH_TIME_SECTION_RE, (_match, lead: string) => (lead === '\n' ? '\n' : lead))
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function candidateWritingDocument(
  doc: DocEditorPayload,
  title: string,
  structure: readonly InterviewFlowDocPromptStructure[] = [],
): DocEditorPayload {
  const md = typeof doc.markdown === 'string' ? doc.markdown : ''
  const resolvedTitle = doc.title?.trim() || title
  const seed = candidateWritingSeedMarkdown(md, structure)
  const cleanedMd = seed ? stripAuthorLengthTime(seed) : ''
  const isAuthorScaffold = AUTHOR_WRITING_SCAFFOLD.test(md)

  // Scaffold: Prompt / Outline stay in prep chrome. Editor gets ## Your answer headings.
  if (isAuthorScaffold) {
    return {
      title: resolvedTitle || 'Your answer',
      markdown: cleanedMd,
      lexical: null,
      pageSetup: WRITING_PAGELESS_SETUP,
    }
  }

  const hasLexical = doc.lexical != null
  const hasMarkdown = cleanedMd.length > 0
  if (hasLexical || hasMarkdown) {
    return {
      ...doc,
      title: resolvedTitle,
      markdown: hasMarkdown ? cleanedMd : undefined,
      lexical: hasLexical ? stripWritingPageBreakLexical(doc.lexical) : null,
      pageSetup: WRITING_PAGELESS_SETUP,
    }
  }

  return {
    title: resolvedTitle || 'Your answer',
    markdown: writingAnswerHeadingTemplateFallback(structure),
    lexical: null,
    pageSetup: WRITING_PAGELESS_SETUP,
  }
}

function writingAnswerHeadingTemplateFallback(
  structure: readonly InterviewFlowDocPromptStructure[],
): string {
  return candidateWritingSeedMarkdown('', structure)
}

function pickReadmeMarkdown(files: CodeEditorPayload['files']): string {
  const list = files ?? []
  const exact = list.find((f) => f.path === 'README.md')
  if (exact?.content?.trim()) return exact.content.trim()
  const loose = list.find((f) => /(^|\/)readme\.md$/i.test(f.path))
  return loose?.content?.trim() || ''
}

/** One-line JSON for compact brief case cards. */
export function formatCompactJson(value: unknown): string {
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

/** Visible cases as page markdown — Input / Expected blocks (not cases.json). */
export function buildVisibleCodingCasesMarkdown(
  cases: Array<{
    id: string
    name: string
    description?: string
    args?: unknown
    expected?: unknown
  }>,
): string {
  if (!cases.length) return ''
  const parts = ['## Visible test cases', '']
  for (const c of cases) {
    const title = c.name.trim() || c.id || 'Sample'
    parts.push(`### ${title}`, '')
    const desc = c.description?.trim()
    if (desc) {
      parts.push(desc, '')
    }
    // Compact one-line fences — vertical pretty-print wastes brief height.
    parts.push(`**Input** \`${formatCompactJson(c.args ?? [])}\``, '')
    parts.push(`**Expected** \`${formatCompactJson(c.expected ?? null)}\``, '')
  }
  return parts.join('\n').trim()
}

/**
 * Candidate coding brief markdown = README only.
 * Visible cases render as compact UI beside/below the exercise (not giant fences).
 */
export function buildCodingBriefMarkdown(input: {
  readmeMarkdown: string
  visibleSampleCases?: Array<{
    id: string
    name: string
    description?: string
    args?: unknown
    expected?: unknown
  }>
}): string {
  return input.readmeMarkdown.trim()
}

/**
 * Strip cases.json / reference / hidden paths from the explorer workspace.
 * Candidate Run loads **visible** cases only — hidden oracles stay for assessors.
 */
export function candidateCodingWorkspace(input: {
  workspace: CodeEditorPayload
  tests: CodingTestsBundle | null
}): {
  workspace: CodeEditorPayload
  readmeMarkdown: string
  runTests: CodingTestsBundle
} {
  const src = input.workspace
  const files = (src.files ?? []).filter((f) => !isAuthorOnlyCodingPath(f.path))
  const readmeMarkdown = pickReadmeMarkdown(src.files)
  const solvePath =
    files.find((f) => /^src\/solve\./i.test(f.path))?.path ||
    files.find((f) => /solve\./i.test(f.path))?.path ||
    null
  const openIds = (src.openIds ?? []).filter((id) => {
    const path = String(id)
    if (isAuthorOnlyCodingPath(path)) return false
    if (/^readme\.md$/i.test(path)) return false
    return files.some((f) => f.path === path || (f as { id?: string }).id === path)
  })
  const folders = (src.folders ?? []).filter((folder) => {
    const f = folder.trim()
    if (!f) return false
    // Keep src; drop empty tests folder if no remaining test files.
    if (f === 'tests' && !files.some((file) => file.path.startsWith('tests/'))) return false
    return true
  })
  const defaultLang =
    resolveCodingLanguageForFile(
      solvePath || files.find((f) => /^src\//.test(f.path))?.path || '',
      files.find((f) => f.path === solvePath)?.language ?? '',
      CODING_LANGUAGE_IDS,
    ) || 'typescript'
  const workingSrc = listWorkingSrcFiles(
    { files, folders, openIds, activeId: solvePath },
    defaultLang,
  )
  const activeId =
    (solvePath && (workingSrc.includes(solvePath) || openIds.includes(solvePath))
      ? solvePath
      : null) ||
    workingSrc[0] ||
    openIds[0] ||
    files[0]?.path ||
    null
  const nextOpen = workingSrc.length
    ? [...new Set([...workingSrc, ...openIds.filter((id) => !workingSrc.includes(id) && !id.startsWith('src/'))])]
    : openIds.length
      ? openIds
      : activeId
        ? [activeId]
        : []

  const fromTool = input.tests
  const allCases = Array.isArray(fromTool?.cases) ? fromTool.cases : []
  const visibleCases = allCases.filter((c) => !c.hidden)
  const runTests: CodingTestsBundle = {
    runner: fromTool?.runner?.trim() || 'hidden_cases_v1',
    entryPoint: fromTool?.entryPoint?.trim() || 'solve',
    cases: visibleCases,
    referenceSolution: null,
  }

  return {
    workspace: {
      ...src,
      files,
      folders,
      openIds: nextOpen,
      activeId: activeId ?? undefined,
    },
    readmeMarkdown,
    runTests,
  }
}

export type GateToolKind = 'form' | 'coding' | 'doc'

export type GateToolMount =
  | {
      kind: 'form'
      document: TestFormDocument
      title: string
      instructions: string
    }
  | {
      kind: 'coding'
      workspace: CodeEditorPayload
      title: string
      instructions: string
      languages: string[]
      /** README.md body for brief MarkdownPreview (page-native). */
      readmeMarkdown: string
      /** Combined README + visible cases markdown for the brief fold. */
      briefMarkdown: string
      visibleSampleCases: Array<{
        id: string
        name: string
        /** Author note from the case — candidate-safe. */
        description?: string
        args?: unknown
        expected?: unknown
        covers?: string[]
      }>
      /** Visible cases for candidate Run only — never written into workspace files. */
      runTests: {
        runner: string
        entryPoint: string
        cases: InterviewFlowCodingTestCase[]
      }
      /** True when authored pack has hidden cases (assessor / later marking — not Run). */
      hasHiddenTests: boolean
    }
  | {
      kind: 'doc'
      document: DocEditorPayload
      title: string
      instructions: string
      prompt: {
        brief: string
        structure: Array<{ id: string; label: string; hint?: string }>
        requirements: string[]
      }
      assessment: {
        kind: string
        dimensions: Array<{
          key: string
          label: string
          lookingFor: string
          weight?: number
          structureIds?: string[]
          structureLabels?: string[]
          bands?: Array<{ id: string; label: string; descriptor: string }>
        }>
      }
      minWords: number | null
      maxWords: number | null
    }

export function toolKindFromGateLabel(kindLabel: string): GateToolKind | null {
  const k = gateKindFromLandingLabel(kindLabel)
  // gateKindFromLandingLabel uses 'doc' for Writing (not 'writing').
  if (k === 'form' || k === 'coding' || k === 'doc') return k
  return null
}

function formInstructions(doc: TestFormDocument): string {
  const bits = [doc.title?.trim()].filter(Boolean) as string[]
  for (const s of doc.sections ?? []) {
    const line = [s.title?.trim(), s.description?.trim()].filter(Boolean).join(' — ')
    if (line) bits.push(line)
  }
  return bits.join('\n')
}

/**
 * Build a candidate-safe mount for the gate phase. Returns null for Talk or missing tool.
 */
export function resolveGateToolMount(input: {
  brief: Creator2BriefDocument | null | undefined
  phaseId: string
}): GateToolMount | null {
  const brief = input.brief
  if (!brief) return null
  const timeline = mapCreator2BriefToTimeline(brief)
  const step = timeline.steps.find((s) => s.id === input.phaseId)
  if (!step || step.offSpine) return null

  if (step.formEditor?.document) {
    const doc = stripAnswerKey(step.formEditor.document)
    return {
      kind: 'form',
      document: doc,
      title: step.title || doc.title || 'Form',
      instructions: formInstructions(doc),
    }
  }

  if (step.codingEditor?.workspace) {
    const tests = step.codingEditor.tests
    const cases = Array.isArray(tests?.cases) ? tests.cases : []
    const visible = cases.filter((c) => !c.hidden)
    const hasHidden = cases.some((c) => Boolean(c.hidden))
    const bundle: CodingTestsBundle = {
      runner: tests?.runner?.trim() || 'hidden_cases_v1',
      entryPoint: tests?.entryPoint?.trim() || 'solve',
      cases,
      referenceSolution: null,
    }
    const { workspace, readmeMarkdown: pickedReadme, runTests } = candidateCodingWorkspace({
      workspace: step.codingEditor.workspace,
      tests: bundle,
    })
    const readmeMarkdown =
      pickedReadme.trim() ||
      (step.codingEditor.instructions?.trim() || '') ||
      (step.codingEditor.summaryBlurb?.trim() || '')
    const visibleSampleCases = visible.map((c) => ({
      id: c.id,
      name: c.name,
      description: typeof c.description === 'string' ? c.description.trim() || undefined : undefined,
      args: c.args,
      expected: c.expected,
      covers: Array.isArray(c.covers) ? c.covers.filter((p) => typeof p === 'string' && p.trim()) : undefined,
    }))
    const briefMarkdown = buildCodingBriefMarkdown({
      readmeMarkdown,
      visibleSampleCases,
    })
    return {
      kind: 'coding',
      workspace,
      title: step.title || workspace.title || 'Coding',
      instructions: step.codingEditor.instructions?.trim() || '',
      languages: step.codingEditor.languages ?? [],
      readmeMarkdown,
      briefMarkdown,
      visibleSampleCases,
      runTests: {
        runner: runTests.runner,
        entryPoint: runTests.entryPoint,
        cases: runTests.cases,
      },
      hasHiddenTests: hasHidden,
    }
  }

  if (step.docEditor?.document) {
    const prompt = step.docEditor.prompt
    const assessment = step.docEditor.assessment
    const structureById = new Map(
      (prompt?.structure ?? []).map((s) => [s.id, s.label] as const),
    )
    const dims = (assessment?.dimensions ?? []).map((d) => {
      const structureIds = Array.isArray(d.structureIds)
        ? d.structureIds.map(String).filter(Boolean)
        : undefined
      const structureLabels = structureIds?.map((id) => structureById.get(id) || id)
      return {
        key: String(d.key ?? ''),
        label: String(d.label ?? d.key ?? 'Dimension'),
        lookingFor: String(d.criterion ?? '').trim() || 'Quality of this dimension',
        ...(typeof d.weight === 'number' && Number.isFinite(d.weight)
          ? { weight: d.weight }
          : {}),
        ...(structureIds ? { structureIds, structureLabels } : {}),
        bands: (d.bands ?? []).map((b, i) => ({
          id: String(b.id ?? `band.${i + 1}`),
          label: String(b.label ?? `Level ${i + 1}`),
          descriptor: String(b.descriptor ?? '').trim(),
        })),
      }
    })
    const title = step.title || step.docEditor.document.title || 'Writing'
    return {
      kind: 'doc',
      document: candidateWritingDocument(step.docEditor.document, title, prompt?.structure),
      title,
      instructions: step.docEditor.instructions?.trim() || '',
      prompt: {
        brief: prompt?.brief?.trim() || '',
        structure: (prompt?.structure ?? []).map((s) => ({
          id: s.id,
          label: s.label,
          hint: s.hint,
        })),
        requirements: [...(prompt?.requirements ?? [])],
      },
      assessment: {
        kind: assessment?.kind ?? 'rubric',
        dimensions: dims,
      },
      minWords: typeof step.docEditor.minWords === 'number' ? step.docEditor.minWords : null,
      maxWords: typeof step.docEditor.maxWords === 'number' ? step.docEditor.maxWords : null,
    }
  }

  return null
}

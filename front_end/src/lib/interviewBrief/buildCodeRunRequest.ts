/**
 * Build Edge interview-code-run request from Creator coding workspace + tests.
 */
import type { CodeEditorPayload } from '../editorContext/types'
import {
  CODING_LANGUAGE_IDS,
  codingSolvePath,
  filterSupportedCodingLanguages,
  normalizeCodingLanguageId,
  resolveCodingLanguageForFile,
} from './codingLanguages'
import {
  listCodingRunFiles,
  pickCodingSolveSource,
  type CodingTestsBundle,
} from './codingWorkspaceFiles'
import type { InterviewFlowCodingTestCase } from './flowTimelineTypes'

export type CodeRunRequestBody = {
  language: string
  source: string
  entryPoint: string
  runner: 'hidden_cases_v1'
  /** Workspace path — remaps sandbox stack frames in terminal output. */
  sourcePath?: string
  /** Full language slice with workspace paths preserved. Omit when the run set is one file. */
  files?: Array<{ path: string; content: string }>
  cases: Array<{
    id: string
    name?: string
    description?: string
    args: unknown[]
    expected: unknown
    compare?: string
    hidden?: boolean
    timeoutMs?: number | null
  }>
}

export type BuildCodeRunRequestInput = {
  workspace: CodeEditorPayload
  languages: readonly string[]
  defaultLanguage?: string | null
  /** Active Monaco / coding language id from the editor toolbar. */
  activeLanguage?: string | null
  activeFilePath?: string | null
  tests: Pick<CodingTestsBundle, 'entryPoint' | 'cases' | 'runner'>
}

function isSolvePath(path: string | null | undefined): boolean {
  const n = String(path ?? '')
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
  return /^src\/solve\.[^./]+$/i.test(n)
}

function languageForPath(
  path: string,
  monacoLanguage: string,
): string {
  return (
    resolveCodingLanguageForFile(path, monacoLanguage, [...CODING_LANGUAGE_IDS]) ||
    ''
  )
}

export function buildCodeRunRequest(
  input: BuildCodeRunRequestInput,
): { ok: true; body: CodeRunRequestBody } | { ok: false; detail: string } {
  const allowed = filterSupportedCodingLanguages(input.languages)
  const files = input.workspace.files ?? []
  const toolbarLang =
    (input.activeLanguage && normalizeCodingLanguageId(input.activeLanguage)) || ''
  let activeFilePath = input.activeFilePath ?? null

  // Toolbar / explorer language owns the run slice. A stale tab on another
  // language's src/solve.* must not keep submitting that default file.
  if (toolbarLang && filterSupportedCodingLanguages([toolbarLang]).length) {
    const sliceSolve = codingSolvePath(toolbarLang)
    const hasSlice = Boolean(sliceSolve && files.some((f) => f.path === sliceSolve))
    const activeLang = isSolvePath(activeFilePath)
      ? languageForPath(
          activeFilePath!,
          files.find((f) => f.path === activeFilePath)?.language ?? '',
        )
      : ''
    if (hasSlice && sliceSolve && (!isSolvePath(activeFilePath) || (activeLang && activeLang !== toolbarLang))) {
      activeFilePath = sliceSolve
    }
  }

  let language = toolbarLang
  if (isSolvePath(activeFilePath)) {
    const fromActive = languageForPath(
      activeFilePath!,
      files.find((f) => f.path === activeFilePath)?.language ?? '',
    )
    if (fromActive) language = fromActive
  }
  if (language && allowed.length && !allowed.includes(language) && !isSolvePath(activeFilePath)) {
    language = ''
  }
  if (!language && activeFilePath) {
    language = languageForPath(activeFilePath, '') || ''
  }
  if (!language) {
    language =
      (input.defaultLanguage && normalizeCodingLanguageId(input.defaultLanguage)) ||
      allowed[0] ||
      'typescript'
  }
  if (!filterSupportedCodingLanguages([language]).length) {
    return { ok: false, detail: `unsupported language: ${language}` }
  }

  const picked = pickCodingSolveSource(input.workspace, language, activeFilePath)
  if (!picked?.source?.trim()) {
    return {
      ok: false,
      detail: `no solve source for ${language} (expected src/solve.* in workspace)`,
    }
  }

  const pickedLang = languageForPath(
    picked.path,
    files.find((f) => f.path === picked.path)?.language ?? '',
  )
  if (pickedLang) language = pickedLang

  const cases = (input.tests.cases ?? []).map((c: InterviewFlowCodingTestCase) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    args: c.args ?? [],
    expected: c.expected,
    compare: c.compare,
    hidden: c.hidden,
    timeoutMs: c.timeoutMs ?? null,
  }))
  if (!cases.length) {
    return { ok: false, detail: 'no test cases — add cases in tests/cases.json' }
  }

  const runFiles = listCodingRunFiles(input.workspace, language)
  const packedFiles = runFiles.length > 1 ? runFiles : undefined

  return {
    ok: true,
    body: {
      language,
      source: picked.source,
      entryPoint: input.tests.entryPoint?.trim() || 'solve',
      runner: 'hidden_cases_v1',
      sourcePath: picked.path,
      files: packedFiles,
      cases,
    },
  }
}

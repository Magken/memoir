import type { CodeEditorPayload } from '../editorContext/types'
import {
  CODING_LANGUAGE_IDS,
  codingLanguageExtension,
  codingLanguageOption,
  codingReferencePath,
  codingSolvePath,
  filterSupportedCodingLanguages,
  normalizeCodingLanguages,
  pathWithCodingExtension,
  resolveCodingLanguageForFile,
} from './codingLanguages'
import type {
  InterviewFlowCodingCompare,
  InterviewFlowCodingTestCase,
} from './flowTimelineTypes'

/** Conventional paths — coding challenge files live in the CodeEditor workspace. */
export const CODING_CASES_PATH = 'tests/cases.json'
export const CODING_REFERENCE_PATH = 'tests/reference.ts'
export const CODING_SOLVE_STEM = 'solve'
export const CODING_MAX_PACKED_FILES = 16
export const CODING_MAX_PACKED_BYTES = 80 * 1024

export type CodingTestsBundle = {
  runner: string
  entryPoint: string
  cases: InterviewFlowCodingTestCase[]
  referenceSolution: string | null
}

function normalizeCompare(value: unknown): InterviewFlowCodingCompare {
  return value === 'exact' || value === 'unordered' || value === 'deep_equal'
    ? value
    : 'deep_equal'
}

function normalizeCase(row: Record<string, unknown>, index: number): InterviewFlowCodingTestCase {
  let args: unknown[] = []
  if (Array.isArray(row.args)) {
    args = row.args
  } else if (row.input != null && typeof row.input === 'object' && !Array.isArray(row.input)) {
    args = Object.values(row.input as Record<string, unknown>)
  } else if (row.input !== undefined) {
    args = [row.input]
  }
  return {
    id: typeof row.id === 'string' ? row.id : `t${index + 1}`,
    name:
      typeof row.name === 'string'
        ? row.name
        : typeof row.id === 'string'
          ? row.id
          : `Case ${index + 1}`,
    description: typeof row.description === 'string' ? row.description : undefined,
    args,
    expected: row.expected ?? null,
    compare: normalizeCompare(row.compare),
    hidden: row.hidden !== false,
    timeoutMs:
      typeof row.timeoutMs === 'number' && Number.isFinite(row.timeoutMs)
        ? row.timeoutMs
        : null,
    covers: normalizeCovers(row.covers),
  }
}

function normalizeCovers(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const out: string[] = []
  for (const item of raw) {
    if (typeof item !== 'string') continue
    const path = item.trim().replace(/\\/g, '/').replace(/^\.\//, '')
    if (!path) continue
    out.push(path)
    if (out.length >= 8) break
  }
  return out.length ? out : undefined
}

export function serializeCodingCasesFile(bundle: CodingTestsBundle): string {
  return `${JSON.stringify(
    {
      runner: bundle.runner || 'hidden_cases_v1',
      entryPoint: bundle.entryPoint.trim() || 'solve',
      cases: bundle.cases.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description?.trim() || undefined,
        args: c.args,
        expected: c.expected,
        compare: c.compare,
        hidden: c.hidden,
        timeoutMs: c.timeoutMs ?? null,
        covers: c.covers?.length ? c.covers : undefined,
      })),
    },
    null,
    2,
  )}\n`
}

/** Parse `tests/cases.json` (+ optional reference file) from a workspace. */
export function parseCodingTestsFromWorkspace(
  workspace: CodeEditorPayload,
): CodingTestsBundle | null {
  const casesFile = workspace.files?.find((f) => f.path === CODING_CASES_PATH)
  if (!casesFile?.content?.trim()) return null
  try {
    const raw = JSON.parse(casesFile.content) as Record<string, unknown>
    const casesRaw = Array.isArray(raw.cases) ? raw.cases : []
    const cases = casesRaw.map((c, i) =>
      normalizeCase(
        c && typeof c === 'object' ? (c as Record<string, unknown>) : {},
        i,
      ),
    )
    const refFile = workspace.files?.find((f) => f.path === CODING_REFERENCE_PATH)
    const referenceSolution = refFile?.content?.trim() ? refFile.content : null
    return {
      runner: typeof raw.runner === 'string' ? raw.runner : 'hidden_cases_v1',
      entryPoint:
        typeof raw.entryPoint === 'string' && raw.entryPoint.trim()
          ? raw.entryPoint.trim()
          : 'solve',
      cases:
        cases.length > 0
          ? cases
          : [
              {
                id: 't1',
                name: 'basic',
                description: 'Happy path',
                args: [],
                expected: null,
                compare: 'deep_equal',
                hidden: true,
                timeoutMs: null,
              },
            ],
      referenceSolution,
    }
  } catch {
    return null
  }
}

function pathStemKey(path: string): string | null {
  const n = path.replace(/\\/g, '/')
  const slash = n.lastIndexOf('/')
  const baseStart = slash >= 0 ? slash + 1 : 0
  const dot = n.lastIndexOf('.')
  if (dot <= baseStart) return null
  return n.slice(0, dot)
}

/**
 * Same stems, different extensions: when a language is added, clone helper +
 * reference files so Python/Go slices are not a stub solve with missing modules.
 */
function cloneLanguageSliceFiles(
  files: CodeEditorPayload['files'],
  langs: readonly string[],
  entryPoint: string,
): CodeEditorPayload['files'] {
  const list = files ?? []
  const paths = new Set(list.map((f) => String(f.path ?? '').replace(/\\/g, '/')))
  const helperStems = new Set<string>()
  const refStems = new Set<string>()
  for (const f of list) {
    const p = String(f.path ?? '').replace(/\\/g, '/')
    if (p.startsWith('src/') && !isAuthorOnlyCodingPath(p)) {
      const key = pathStemKey(p)
      if (key && !/^src\/solve$/i.test(key)) helperStems.add(key)
    }
    if (/^tests\/reference(\/|\.|$)/i.test(p) && !/\.json$/i.test(p)) {
      const key = pathStemKey(p)
      if (key) refStems.add(key)
    }
  }
  if (!helperStems.size && !refStems.size) return list

  let next = list
  for (const lang of langs) {
    const ext = codingLanguageExtension(lang)
    if (!ext) continue
    const monaco = codingLanguageOption(lang)?.monaco ?? lang
    for (const stem of helperStems) {
      const dest = `${stem}.${ext}`
      if (paths.has(dest)) continue
      const fn = stem.split('/').pop() || entryPoint
      next = upsertFile(next, dest, monaco, defaultCodingStarterStub(lang, fn))
      paths.add(dest)
    }
    for (const stem of refStems) {
      const dest = `${stem}.${ext}`
      if (paths.has(dest)) continue
      const fn = stem.split('/').pop() || 'reference'
      next = upsertFile(next, dest, monaco, defaultCodingStarterStub(lang, fn))
      paths.add(dest)
    }
  }
  return next
}

function upsertFile(
  files: CodeEditorPayload['files'],
  path: string,
  language: string,
  content: string,
): CodeEditorPayload['files'] {
  const next = [...(files ?? [])]
  const i = next.findIndex((f) => f.path === path)
  if (i >= 0) {
    next[i] = { ...next[i]!, path, language, content }
  } else {
    next.push({ path, language, content })
  }
  return next
}

/**
 * Ensure the workspace carries runner files derived from the brief `tests` object
 * (or keep existing `tests/cases.json` if already present and `preferExistingFiles`).
 */
export function ensureCodingTestFiles(
  workspace: CodeEditorPayload,
  bundle: CodingTestsBundle,
  opts?: { preferExistingFiles?: boolean },
): CodeEditorPayload {
  const prefer = opts?.preferExistingFiles !== false
  const hasCases = workspace.files?.some(
    (f) => f.path === CODING_CASES_PATH && f.content.trim(),
  )
  const hasRef = workspace.files?.some((f) => f.path === CODING_REFERENCE_PATH)

  let files = [...(workspace.files ?? [])]
  if (!prefer || !hasCases) {
    files = upsertFile(files, CODING_CASES_PATH, 'json', serializeCodingCasesFile(bundle))
  }
  if (!prefer || !hasRef) {
    const ref = bundle.referenceSolution?.trim() ?? ''
    files = upsertFile(
      files,
      CODING_REFERENCE_PATH,
      'typescript',
      ref ||
        '// Author-only reference — should pass every case in tests/cases.json\n',
    )
  }

  const folders = new Set([...(workspace.folders ?? []), 'src', 'tests'])
  return {
    ...workspace,
    files,
    folders: [...folders],
  }
}

/** After editor edits — prefer files as source of truth, fall back to prior bundle. */
export function resolveCodingTestsFromWorkspace(
  workspace: CodeEditorPayload,
  fallback: CodingTestsBundle,
): CodingTestsBundle {
  return parseCodingTestsFromWorkspace(workspace) ?? fallback
}

/** Non-spoiler starter stub for a catalog language (same entryPoint across langs). */
export function defaultCodingStarterStub(
  languageId: string,
  entryPoint = 'solve',
): string {
  const ep = entryPoint.trim() || 'solve'
  switch (languageId) {
    case 'typescript':
      return `// TODO: implement\nexport function ${ep}(/* args */): unknown {\n  throw new Error('not implemented')\n}\n`
    case 'javascript':
      return `// TODO: implement\nfunction ${ep}(/* args */) {\n  throw new Error('not implemented')\n}\n`
    case 'python':
      return `def ${ep}(*args):\n    # TODO: implement\n    raise NotImplementedError\n`
    case 'go':
      return `func ${ep}(/* args */) /* ret */ {\n  panic("TODO")\n}\n`
    case 'java':
      return `static Object ${ep}(/* args */) {\n  throw new UnsupportedOperationException("TODO");\n}\n`
    case 'csharp':
      return `static object ${ep}(/* args */) {\n  throw new NotImplementedException();\n}\n`
    case 'cpp':
    case 'c':
      return `// TODO: implement ${ep}\n`
    case 'rust':
      return `fn ${ep}(/* args */) /* -> _ */ {\n  todo!()\n}\n`
    case 'ruby':
      return `def ${ep}(*args)\n  raise "not implemented"\nend\n`
    case 'kotlin':
      return `fun ${ep}(/* args */): Any {\n  throw NotImplementedError()\n}\n`
    case 'swift':
      return `func ${ep}(/* args */) -> Any {\n  fatalError("TODO")\n}\n`
    case 'php':
      return `function ${ep}(...$args) {\n  throw new Exception('not implemented');\n}\n`
    case 'scala':
      return `def ${ep}(/* args */): Any =\n  throw new NotImplementedError()\n`
    case 'dart':
      return `dynamic ${ep}(/* args */) {\n  throw UnimplementedError();\n}\n`
    case 'lua':
      return `function ${ep}(...)\n  error("not implemented")\nend\n`
    case 'r':
      return `${ep} <- function(...) {\n  stop("not implemented")\n}\n`
    case 'haskell':
      return `${ep} :: a\n${ep} = error "TODO"\n`
    case 'elixir':
      return `def ${ep}(_args) do\n  raise "not implemented"\nend\n`
    case 'perl':
      return `sub ${ep} {\n  die "not implemented";\n}\n`
    case 'fsharp':
      return `let ${ep} (_args) =\n  failwith "TODO"\n`
    case 'clojure':
      return `(defn ${ep} [& args]\n  (throw (ex-info "not implemented" {})))\n`
    case 'bash':
      return `${ep}() {\n  echo "not implemented" >&2\n  return 1\n}\n`
    default:
      return `// TODO: implement ${ep}\n`
  }
}

/**
 * Ensure one `src/solve.{ext}` exists for each allowed language.
 * Does not delete extra solve files. Optionally seeds content from `starters`.
 */
export function ensureSolveFilesForLanguages(
  workspace: CodeEditorPayload,
  languages: readonly string[],
  opts?: {
    entryPoint?: string
    starters?: Partial<Record<string, string>>
    /** When true, activate defaultLanguage (or first lang) solve file. */
    activateDefault?: boolean
    defaultLanguage?: string | null
  },
): CodeEditorPayload {
  const langs = filterSupportedCodingLanguages(languages)
  if (!langs.length) return workspace

  const entryPoint = opts?.entryPoint?.trim() || 'solve'
  let files = [...(workspace.files ?? [])]
  const folders = new Set([...(workspace.folders ?? []), 'src', 'tests'])

  for (const lang of langs) {
    const path = codingSolvePath(lang, CODING_SOLVE_STEM)
    if (!path) continue
    const exists = files.some((f) => f.path === path && f.content != null)
    if (exists) continue
    const opt = codingLanguageOption(lang)
    const content =
      opts?.starters?.[lang]?.trim() ||
      defaultCodingStarterStub(lang, entryPoint)
    files = upsertFile(files, path, opt?.monaco ?? lang, content)
  }

  files = cloneLanguageSliceFiles(files, langs, entryPoint)
  for (const f of files) {
    const parent = String(f.path ?? '').replace(/\\/g, '/').split('/').slice(0, -1).join('/')
    if (parent) folders.add(parent)
  }

  let openIds = [...(workspace.openIds ?? [])]
  let activeId = workspace.activeId ?? null
  if (opts?.activateDefault) {
    const preferred =
      (opts.defaultLanguage &&
        filterSupportedCodingLanguages([opts.defaultLanguage])[0]) ||
      langs[0]
    const path = preferred ? codingSolvePath(preferred, CODING_SOLVE_STEM) : null
    if (path && files.some((f) => f.path === path)) {
      activeId = path
      if (!openIds.includes(path)) openIds = [...openIds, path]
    }
  }

  return {
    ...workspace,
    files,
    folders: [...folders],
    openIds,
    activeId,
  }
}

/** True when every supported language in `languages` has a `src/solve.{ext}` file. */
export function codingWorkspaceHasSolveFilesForLanguages(
  workspace: CodeEditorPayload,
  languages: readonly string[],
): boolean {
  const langs = filterSupportedCodingLanguages(languages)
  if (!langs.length) return true
  const paths = new Set((workspace.files ?? []).map((f) => f.path))
  return langs.every((lang) => {
    const path = codingSolvePath(lang, CODING_SOLVE_STEM)
    return Boolean(path && paths.has(path))
  })
}

/** Optional per-language reference path helper (default remains `tests/reference.ts`). */
export function ensureCodingReferenceFile(
  workspace: CodeEditorPayload,
  languageId: string,
  content: string,
): CodeEditorPayload {
  const path = codingReferencePath(languageId) ?? CODING_REFERENCE_PATH
  const opt = codingLanguageOption(languageId)
  const files = upsertFile(
    workspace.files ?? [],
    path,
    opt?.monaco ?? 'typescript',
    content,
  )
  const folders = new Set([...(workspace.folders ?? []), 'tests'])
  return { ...workspace, files, folders: [...folders] }
}

/** Pick source for Run: the language entry (`src/solve.{ext}`). Active tab may switch language when it is that language's solve file — never a helper. */
export function pickCodingSolveSource(
  workspace: CodeEditorPayload,
  language: string,
  activeFilePath?: string | null,
): { path: string; source: string } | null {
  const langs = normalizeCodingLanguages([language])
  const lang = langs[0]
  if (!lang) return null
  const files = workspace.files ?? []

  const activeNorm = activeFilePath ? activeFilePath.replace(/\\/g, '/').replace(/^\.\//, '') : ''
  if (activeNorm && /^src\/solve\.[^./]+$/i.test(activeNorm)) {
    const active = files.find((f) => f.path === activeNorm)
    if (active && isRunnableCodingFile(activeNorm, active.language ?? '', lang)) {
      const source = active.content ?? ''
      if (source.trim()) return { path: active.path, source }
    }
  }

  const path = codingSolvePath(lang, CODING_SOLVE_STEM)
  if (!path) return null
  const file = files.find((f) => f.path === path)
  if (!file) return null
  return { path, source: file.content ?? '' }
}

function isRunnableCodingFile(
  path: string,
  monacoLanguage: string,
  preferredLang: string,
): boolean {
  const base = (path.split('/').pop() ?? path).toLowerCase()
  if (/\.(md|markdown|json|csv|pdf|txt)$/.test(base)) return false
  const resolved = resolveCodingLanguageForFile(path, monacoLanguage, [
    preferredLang,
    ...CODING_LANGUAGE_IDS,
  ])
  if (!resolved) return false
  const ext = codingLanguageExtension(resolved)
  if (!ext) return false
  return base.endsWith(`.${ext}`)
}

/** Author-only paths — stripped from the candidate explorer (cases, reference, /hidden). */
export function isAuthorOnlyCodingPath(path: string): boolean {
  const p = path.trim().replace(/\\/g, '/')
  if (!p) return true
  if (p === CODING_CASES_PATH) return true
  if (/(^|\/)cases\.json$/i.test(p)) return true
  if (/reference/i.test(p) || /(^|\/)hidden(\/|$)/i.test(p)) return true
  return false
}

export function isPackedCodingPath(path: string, language: string): boolean {
  if (isAuthorOnlyCodingPath(path)) return false
  const n = path.replace(/\\/g, '/').replace(/^\.\//, '')
  if (!n.startsWith('src/')) return false
  if (/\.(md|markdown|json|csv|txt|pdf)$/i.test(n)) return false
  const langs = normalizeCodingLanguages([language])
  const lang = langs[0]
  if (!lang) return false
  const ext = codingLanguageExtension(lang)
  if (!ext) return false
  return n.toLowerCase().endsWith(`.${ext}`)
}

/** README / tests / markdown stay visible. Only `src/` is sliced by language. */
export function isCodingExplorerVisiblePath(
  path: string,
  language: string | null | undefined,
): boolean {
  const n = path.replace(/\\/g, '/').replace(/^\.\//, '')
  if (!n.startsWith('src/')) return true
  if (!language) return true
  return isPackedCodingPath(n, language)
}

export function visibleCodingExplorerFiles<T extends { path: string }>(
  files: readonly T[],
  language: string | null | undefined,
): T[] {
  return files.filter((f) => isCodingExplorerVisiblePath(f.path, language))
}

/** Activate an existing visible file for a language slice — never create or rename. */
export function pickVisibleCodingFile<T extends { path: string }>(
  files: readonly T[],
  language: string | null | undefined,
  currentPath?: string | null,
): T | undefined {
  const visible = visibleCodingExplorerFiles(files, language)
  const current = String(currentPath ?? '').replace(/\\/g, '/')
  if (current) {
    const hit = visible.find((f) => f.path.replace(/\\/g, '/') === current)
    if (hit) return hit
  }
  const solve = language ? codingSolvePath(language, CODING_SOLVE_STEM) : null
  if (solve) {
    const hit = visible.find((f) => f.path.replace(/\\/g, '/') === solve)
    if (hit) return hit
  }
  return (
    visible.find((f) => f.path.replace(/\\/g, '/').startsWith('src/')) ?? visible[0]
  )
}

export function visibleCodingExplorerFolders(
  folders: readonly string[],
  files: readonly { path: string }[],
  language: string | null | undefined,
): string[] {
  const visible = visibleCodingExplorerFiles(files, language)
  return folders.filter((folder) => {
    const n = folder.replace(/\\/g, '/').replace(/^\.\//, '')
    if (!n || n === 'src') return true
    if (!n.startsWith('src/') && n !== 'src') return true
    return visible.some((f) => {
      const p = f.path.replace(/\\/g, '/')
      return p === n || p.startsWith(`${n}/`)
    })
  })
}

/** Creator: drop `src/` files that are not the selected language. Leaves README / tests. */
export function pruneSrcFilesToLanguage(
  workspace: CodeEditorPayload,
  language: string,
): CodeEditorPayload {
  const lang = filterSupportedCodingLanguages([language])[0]
  if (!lang) return workspace
  const files = (workspace.files ?? []).filter((f) =>
    isCodingExplorerVisiblePath(String(f.path ?? ''), lang),
  )
  const kept = new Set(files.map((f) => String(f.path ?? '')))
  const openIds = (workspace.openIds ?? []).filter((id) => kept.has(id))
  let activeId = workspace.activeId ?? null
  if (activeId && !kept.has(String(activeId))) {
    const solve = codingSolvePath(lang, CODING_SOLVE_STEM)
    activeId = (solve && kept.has(solve) ? solve : files[0]?.path) ?? null
  }
  return {
    ...workspace,
    files,
    folders: visibleCodingExplorerFolders(workspace.folders ?? [], files, lang),
    openIds,
    activeId,
  }
}

export type CodingRunFile = { path: string; content: string }

/** Active-language `src/` files sent to the runner. Caps length + bytes. */
export function listCodingRunFiles(
  workspace: CodeEditorPayload,
  language: string,
): CodingRunFile[] {
  const files = workspace.files ?? []
  const out: CodingRunFile[] = []
  let bytes = 0
  for (const f of files) {
    const path = String(f.path ?? '').replace(/\\/g, '/')
    if (!isPackedCodingPath(path, language)) continue
    const content = String(f.content ?? '')
    if (out.length >= CODING_MAX_PACKED_FILES) break
    if (bytes + content.length > CODING_MAX_PACKED_BYTES) break
    bytes += content.length
    out.push({ path, content })
  }
  return out
}

/** Working `src/` files for the Files strip (same slice as Run, including empty stubs). */
export function listWorkingSrcFiles(
  workspace: CodeEditorPayload,
  language: string,
): string[] {
  return listCodingRunFiles(workspace, language).map((f) => f.path)
}

/** Rewrite a covers path to the active catalog language extension. */
export function rewriteCoverPath(path: string, language: string): string {
  const n = path.trim().replace(/\\/g, '/').replace(/^\.\//, '')
  if (!n) return n
  return pathWithCodingExtension(n, language) ?? n
}

export function rewriteCoverPaths(
  covers: readonly string[] | undefined,
  language: string,
): string[] {
  if (!covers?.length) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of covers) {
    const next = rewriteCoverPath(raw, language)
    if (!next || seen.has(next)) continue
    seen.add(next)
    out.push(next)
  }
  return out
}

export function resolveCoverHopPath(
  covers: readonly string[] | undefined,
  language: string,
  workspace?: CodeEditorPayload | null,
): string | null {
  const rewritten = rewriteCoverPaths(covers, language)
  const files = workspace?.files ?? []
  for (const path of rewritten) {
    if (files.some((f) => f.path === path)) return path
  }
  return codingSolvePath(language, CODING_SOLVE_STEM)
}

/** Concatenated numbered workspace for assessor LLMs. Real line numbers; drop files rather than renumber. */
export function labeledCodingWorkspaceSource(
  files: readonly CodingRunFile[],
  maxChars = 12000,
): string {
  const blocks: string[] = []
  let used = 0
  for (const f of files) {
    const path = String(f.path ?? '').replace(/\\/g, '/')
    const lines = String(f.content ?? '').split('\n')
    const block = lines.map((line, i) => `${path}:${i + 1}|${line}`).join('\n')
    const extra = blocks.length ? 2 : 0
    if (used + extra + block.length > maxChars) {
      if (blocks.length === 0) {
        const kept: string[] = []
        let n = 0
        for (const line of block.split('\n')) {
          const add = (kept.length ? 1 : 0) + line.length
          if (n + add > maxChars) {
            if (kept.length === 0) kept.push(line)
            break
          }
          kept.push(line)
          n += add
        }
        return kept.join('\n')
      }
      break
    }
    used += extra + block.length
    blocks.push(block)
  }
  return blocks.join('\n\n').trim()
}


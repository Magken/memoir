import { aliasCodingLanguageId } from '../../../../back_end/supabase/functions/interview-brief-edit/codingLanguageAliases.ts'

export type CodingLanguageOption = {
  /** Stable id written to `tools.*.languages` / `defaultLanguage` */
  id: string
  /** Chip label */
  label: string
  /** Short timeline tag */
  tag: string
  /** Monaco / CodeEditor language id for starter files */
  monaco: string
}

export const CODING_LANGUAGE_OPTIONS: readonly CodingLanguageOption[] = [
  { id: 'typescript', label: 'TypeScript', tag: 'TS', monaco: 'typescript' },
  { id: 'javascript', label: 'JavaScript', tag: 'JS', monaco: 'javascript' },
  { id: 'python', label: 'Python', tag: 'PY', monaco: 'python' },
  { id: 'go', label: 'Go', tag: 'Go', monaco: 'go' },
  { id: 'java', label: 'Java', tag: 'Java', monaco: 'java' },
  { id: 'csharp', label: 'C#', tag: 'C#', monaco: 'csharp' },
  { id: 'cpp', label: 'C++', tag: 'C++', monaco: 'cpp' },
  { id: 'c', label: 'C', tag: 'C', monaco: 'c' },
  { id: 'rust', label: 'Rust', tag: 'Rust', monaco: 'rust' },
  { id: 'ruby', label: 'Ruby', tag: 'Ruby', monaco: 'ruby' },
  { id: 'kotlin', label: 'Kotlin', tag: 'KT', monaco: 'kotlin' },
  { id: 'swift', label: 'Swift', tag: 'Swift', monaco: 'swift' },
  { id: 'php', label: 'PHP', tag: 'PHP', monaco: 'php' },
  { id: 'scala', label: 'Scala', tag: 'Scala', monaco: 'scala' },
  { id: 'dart', label: 'Dart', tag: 'Dart', monaco: 'dart' },
  { id: 'lua', label: 'Lua', tag: 'Lua', monaco: 'lua' },
  { id: 'r', label: 'R', tag: 'R', monaco: 'r' },
  { id: 'haskell', label: 'Haskell', tag: 'HS', monaco: 'haskell' },
  { id: 'elixir', label: 'Elixir', tag: 'Ex', monaco: 'elixir' },
  { id: 'perl', label: 'Perl', tag: 'Perl', monaco: 'perl' },
  { id: 'fsharp', label: 'F#', tag: 'F#', monaco: 'fsharp' },
  { id: 'clojure', label: 'Clojure', tag: 'Clj', monaco: 'clojure' },
  { id: 'bash', label: 'Bash', tag: 'Bash', monaco: 'shell' },
]

const BY_ID = new Map(CODING_LANGUAGE_OPTIONS.map((o) => [o.id, o]))

/** Stable catalog ids (Judge0 / interview-code-run). */
export const CODING_LANGUAGE_IDS: readonly string[] = CODING_LANGUAGE_OPTIONS.map((o) => o.id)

export function isSupportedCodingLanguage(raw: string): boolean {
  const id = normalizeCodingLanguageId(raw)
  return Boolean(id && BY_ID.has(id))
}

/** Dedupe + normalize; drop empties and unsupported ids. Preserves first-seen order. */
export function filterSupportedCodingLanguages(ids: readonly string[]): string[] {
  return normalizeCodingLanguages(ids).filter((id) => BY_ID.has(id))
}

/** Normalize free-form / legacy language strings to catalog ids when possible. */
export function normalizeCodingLanguageId(raw: string): string {
  return aliasCodingLanguageId(raw)
}

export function codingLanguageOption(id: string): CodingLanguageOption | undefined {
  return BY_ID.get(normalizeCodingLanguageId(id))
}

export function codingLanguageTagLabel(id: string): string {
  const opt = codingLanguageOption(id)
  if (opt) return opt.tag
  const raw = id.trim()
  if (!raw) return '?'
  return raw.length <= 6 ? raw : raw.slice(0, 6)
}

export function codingLanguageDisplayLabel(id: string): string {
  return codingLanguageOption(id)?.label ?? id.trim()
}

/** File extension for a coding catalog id (`typescript` → `ts`). */
const CODING_LANGUAGE_EXTENSION: Record<string, string> = {
  typescript: 'ts',
  javascript: 'js',
  python: 'py',
  go: 'go',
  java: 'java',
  csharp: 'cs',
  cpp: 'cpp',
  c: 'c',
  rust: 'rs',
  ruby: 'rb',
  kotlin: 'kt',
  swift: 'swift',
  php: 'php',
  scala: 'scala',
  dart: 'dart',
  lua: 'lua',
  r: 'r',
  haskell: 'hs',
  elixir: 'ex',
  perl: 'pl',
  fsharp: 'fs',
  clojure: 'clj',
  bash: 'sh',
}

export function codingLanguageExtension(id: string): string | null {
  const normalized = normalizeCodingLanguageId(id)
  return CODING_LANGUAGE_EXTENSION[normalized] ?? null
}

/** Replace the final path segment’s extension (`src/solve.ts` + `py` → `src/solve.py`). */
export function pathWithCodingExtension(path: string, codingLanguageId: string): string | null {
  const ext = codingLanguageExtension(codingLanguageId)
  if (!ext) return null
  const normalized = path.replace(/\\/g, '/').replace(/^\/+/, '')
  const slash = normalized.lastIndexOf('/')
  const dir = slash >= 0 ? normalized.slice(0, slash + 1) : ''
  const base = slash >= 0 ? normalized.slice(slash + 1) : normalized
  const dot = base.lastIndexOf('.')
  const stem = dot > 0 ? base.slice(0, dot) : base
  if (!stem) return null
  return `${dir}${stem}.${ext}`
}

/** Conventional candidate solve path for a catalog language (`typescript` → `src/solve.ts`). */
export function codingSolvePath(codingLanguageId: string, stem = 'solve'): string | null {
  const ext = codingLanguageExtension(codingLanguageId)
  if (!ext) return null
  return `src/${stem}.${ext}`
}

/** Conventional Creator-only reference path (`typescript` → `tests/reference.ts`). */
export function codingReferencePath(codingLanguageId: string): string | null {
  const ext = codingLanguageExtension(codingLanguageId)
  if (!ext) return null
  return `tests/reference.${ext}`
}

/**
 * Resolve which allowed coding id matches a workspace file (extension first, then Monaco id).
 */
export function resolveCodingLanguageForFile(
  path: string,
  monacoLanguage: string,
  allowed: readonly string[],
): string | null {
  const normalized = normalizeCodingLanguages(allowed)
  if (!normalized.length) return null
  const ext = (path.split('/').pop() ?? '').split('.').pop()?.toLowerCase() ?? ''
  if (ext) {
    const byExt = normalized.find((id) => codingLanguageExtension(id) === ext)
    if (byExt) return byExt
  }
  const monaco = monacoLanguage.trim().toLowerCase()
  if (monaco) {
    const byMonaco = normalized.find((id) => codingLanguageOption(id)?.monaco === monaco)
    if (byMonaco) return byMonaco
  }
  return null
}

/**
 * Dedupe + normalize; drop empties. Preserves first-seen order.
 * Keeps unknown ids (merge/Edge may still reject them); use
 * `filterSupportedCodingLanguages` when authoring chips / bot merge.
 */
export function normalizeCodingLanguages(ids: readonly string[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const raw of ids) {
    const id = normalizeCodingLanguageId(raw)
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push(id)
  }
  return out
}

/**
 * Candidate default must be in the allowed set when restricted.
 * Empty `languages` = unrestricted → keep any default or null.
 */
export function resolveCodingDefaultLanguage(
  languages: readonly string[],
  defaultLanguage: string | null | undefined,
): string | null {
  const allowed = normalizeCodingLanguages(languages)
  const preferred = defaultLanguage ? normalizeCodingLanguageId(defaultLanguage) : ''
  if (allowed.length === 0) {
    return preferred || null
  }
  if (preferred && allowed.includes(preferred)) return preferred
  return allowed[0] ?? null
}

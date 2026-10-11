/**
 * Local import check — relative / same-tree modules only. Stdlib and package names are ignored.
 */

export type WorkspaceImportFile = { path: string; content: string }

export type WorkspaceImportMarker = {
  path: string
  line: number
  column: number
  message: string
}

const PY_STDLIB = new Set([
  'abc', 'asyncio', 'builtins', 'collections', 'copy', 'csv', 'dataclasses', 'datetime',
  'decimal', 'enum', 'functools', 'heapq', 'io', 'itertools', 'json', 'math', 'os',
  'pathlib', 'random', 're', 'sys', 'time', 'typing', 'unittest', 'uuid',
])

const JS_BARE = /^(node:|fs|path|os|crypto|util|url|http|https|module|process|stream|events)$/

function normalize(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '')
}

function dirname(path: string): string {
  const n = normalize(path)
  const i = n.lastIndexOf('/')
  return i >= 0 ? n.slice(0, i) : ''
}

function join(a: string, b: string): string {
  const left = normalize(a)
  const right = b.replace(/\\/g, '/')
  const parts = [...(left ? left.split('/') : []), ...right.split('/')].filter((p) => p && p !== '.')
  const out: string[] = []
  for (const p of parts) {
    if (p === '..') out.pop()
    else out.push(p)
  }
  return out.join('/')
}

function hasFile(files: Set<string>, path: string): boolean {
  const n = normalize(path)
  if (files.has(n)) return true
  return false
}

function resolveJs(fromPath: string, spec: string, files: Set<string>): string | null {
  if (!spec.startsWith('.')) return null
  const base = join(dirname(fromPath), spec)
  const tries = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    `${base}.mjs`,
    `${base}.cjs`,
    `${base}/index.ts`,
    `${base}/index.js`,
  ]
  for (const t of tries) {
    if (hasFile(files, t)) return t
  }
  return null
}

function resolvePy(fromPath: string, spec: string, files: Set<string>): string | null {
  if (spec.startsWith('.')) {
    const base = join(dirname(fromPath), spec.replace(/\./g, '/'))
    const tries = [`${base}.py`, `${base}/__init__.py`]
    for (const t of tries) if (hasFile(files, t)) return t
    return null
  }
  const asSrc = `src/${spec.replace(/\./g, '/')}`
  const tries = [`${asSrc}.py`, `${asSrc}/__init__.py`, `${spec.replace(/\./g, '/')}.py`]
  for (const t of tries) if (hasFile(files, t)) return t
  return null
}

function pushMarker(
  out: WorkspaceImportMarker[],
  path: string,
  line: number,
  column: number,
  spec: string,
) {
  out.push({
    path,
    line,
    column,
    message: `Cannot find module '${spec}'`,
  })
}

/** Markers for missing local imports in the active language slice. */
export function workspaceImportMarkers(
  files: readonly WorkspaceImportFile[],
  language: string,
): WorkspaceImportMarker[] {
  const lang = language.trim().toLowerCase()
  const pathSet = new Set(files.map((f) => normalize(f.path)))
  const out: WorkspaceImportMarker[] = []

  for (const file of files) {
    const path = normalize(file.path)
    const lines = String(file.content ?? '').split(/\r?\n/)
    if (lang === 'python' || path.endsWith('.py')) {
      lines.forEach((line, i) => {
        const from = line.match(/^\s*from\s+([A-Za-z0-9_.]+)\s+import\b/)
        const imp = line.match(/^\s*import\s+([A-Za-z0-9_.]+)/)
        const spec = from?.[1] || imp?.[1]
        if (!spec) return
        const root = spec.split('.')[0] ?? spec
        if (PY_STDLIB.has(root)) return
        if (resolvePy(path, spec, pathSet) == null) {
          pushMarker(out, path, i + 1, Math.max(1, line.indexOf(spec) + 1), spec)
        }
      })
      continue
    }
    if (
      lang === 'javascript' ||
      lang === 'typescript' ||
      /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(path)
    ) {
      lines.forEach((line, i) => {
        const m =
          line.match(/^\s*import\s+[^'"]*['"]([^'"]+)['"]/) ||
          line.match(/^\s*export\s+[^'"]*from\s+['"]([^'"]+)['"]/) ||
          line.match(/require\(\s*['"]([^'"]+)['"]\s*\)/)
        const spec = m?.[1]
        if (!spec) return
        if (!spec.startsWith('.')) {
          if (JS_BARE.test(spec) || !spec.startsWith('.')) return
        }
        if (!spec.startsWith('.')) return
        if (resolveJs(path, spec, pathSet) == null) {
          pushMarker(out, path, i + 1, Math.max(1, line.indexOf(spec) + 1), spec)
        }
      })
    }
  }
  return out
}

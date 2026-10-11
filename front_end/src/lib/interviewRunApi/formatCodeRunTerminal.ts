/**
 * Creator coding Run terminal — IDE-style sections (header / Problems / Output / Tests).
 * Prefer composeCodeRunTerminal() from structured Edge results; polishCodeRunLines keeps
 * legacy string polish for older payloads.
 */
import type { CodeRunResult } from './codeRunEdgeClient'
import { humanCaseLabel } from './reportDialect'

export type CodeRunTerminalTone =
  | 'default'
  | 'pass'
  | 'fail'
  | 'error'
  | 'meta'
  | 'divider'
  | 'section'
  | 'header'
  | 'output'
  | 'goto'

/** Visual separator inserted between Creator Run batches. */
export const TERMINAL_RUN_DIVIDER = '──'

/**
 * The Run terminal must never print a bare "Run failed: unknown". `unknown` is the
 * DataApiError code bucket, not a diagnosis, and when the Edge worker was down the
 * candidate saw only that — no status, no reason, nothing to report to a proctor.
 * Prefer the human message, then the detail, then the code, and always keep the code.
 */
export function codeRunFailureLine(err: unknown): string {
  const parts: string[] = []
  const useful = (s: unknown): string => {
    const t = String(s ?? '').trim()
    return !t || t === 'unknown' || t === 'Error' ? '' : t
  }
  const e = err as { message?: unknown; code?: unknown; detail?: unknown } | null
  const message = useful(e?.message)
  const detail = useful(e?.detail)
  const code = String(e?.code ?? '').trim()
  if (message) parts.push(message)
  if (detail && detail !== message) parts.push(detail)
  if (code && !parts.some((p) => p.includes(code))) parts.push(`code=${code}`)
  if (!parts.length) parts.push('no detail from the runner — check the Edge worker is up')
  return `Run failed: ${parts.join(' · ')}`
}

export function isTerminalRunDivider(line: string): boolean {
  return line === TERMINAL_RUN_DIVIDER || /^[─-]{2,}$/.test(line.trim())
}

export type CodeTerminalItem =
  | { kind: 'divider' }
  | { kind: 'header'; title: string; time: string }
  | { kind: 'section'; title: string }
  | {
      kind: 'goto'
      path: string
      line: number
      column: number
      label?: string
    }
  | { kind: 'text'; text: string; tone?: CodeRunTerminalTone }
  | { kind: 'pass'; text: string }
  | { kind: 'fail'; text: string }

export type CodeRunTerminalSeg =
  | { kind: 'text'; text: string }
  | { kind: 'loc'; text: string; path: string; line: number; column: number }

/** path:line or path:line:col — also matches start-of-line V8 frames. */
const LOC_RE =
  /(^|[^.\w/@-])((?:[\w.@+-]+\/)*[\w.@+-]+\.[A-Za-z][A-Za-z0-9]*)(:(\d+)(?::(\d+))?)/g

export function formatRunClock(date = new Date()): string {
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function composeCodeRunTerminal(
  result: Pick<CodeRunResult, 'status' | 'passedCount' | 'total' | 'cases' | 'lines' | 'judge0'>,
  opts?: {
    sourcePath?: string
    sourceLineCount?: number
    language?: string
    entryPoint?: string
    ranAt?: Date
  },
): CodeTerminalItem[] {
  const sourcePath = opts?.sourcePath?.trim()
  const sourceLineCount = opts?.sourceLineCount
  const time = formatRunClock(opts?.ranAt ?? new Date())
  const lang = opts?.language?.trim() || guessLanguage(result.lines)
  const entry = opts?.entryPoint?.trim() || guessEntry(result.lines)
  const total = result.total || result.cases.length
  const title = `${lang} · ${entry} · ${total} case${total === 1 ? '' : 's'}`

  const items: CodeTerminalItem[] = [{ kind: 'header', title, time }]

  const diagRaw =
    result.status === 'compile_error'
      ? result.judge0?.compileOutput
      : result.status === 'runtime_error' ||
          result.status === 'timeout' ||
          result.status === 'judge_error'
        ? result.judge0?.stderr
        : null

  const diagLines = diagRaw
    ? polishDiagLines(String(diagRaw), { sourcePath, sourceLineCount })
    : []
  const primary = findPrimaryLocation(diagLines, sourcePath)

  if (result.status !== 'ok' || diagLines.length) {
    items.push({ kind: 'section', title: 'Problems' })
    if (result.status !== 'ok') {
      items.push({
        kind: 'text',
        text: statusLabel(result.status),
        tone: 'error',
      })
    }
    if (primary) {
      items.push({
        kind: 'goto',
        path: primary.path,
        line: primary.line,
        column: primary.column,
        label: `${primary.path}:${primary.line}${primary.column > 1 ? `:${primary.column}` : ''}`,
      })
    }
    for (const line of diagLines) {
      items.push({
        kind: 'text',
        text: line,
        tone: looksLikeStackFrame(line) ? 'meta' : 'error',
      })
    }
  }

  const outputLines = extractUserStdout(result.judge0?.stdout || '')
  if (outputLines.length) {
    items.push({ kind: 'section', title: 'Output' })
    for (const line of outputLines) {
      items.push({ kind: 'text', text: line, tone: 'output' })
    }
  }

  if (result.cases.length) {
    items.push({ kind: 'section', title: 'Tests' })
    for (const [index, c] of result.cases.entries()) {
      const label = humanCaseLabel({ id: c.id, name: c.name, index })
      if (c.passed) items.push({ kind: 'pass', text: label })
      else {
        items.push({
          kind: 'fail',
          text: c.message ? `${label} - ${c.message}` : label,
        })
      }
    }
  }

  const timing =
    result.judge0 && typeof result.judge0 === 'object' && 'time' in result.judge0
      ? formatJudgeTime((result.judge0 as { time?: string | null }).time)
      : null
  items.push({ kind: 'section', title: 'Summary' })
  items.push({
    kind: 'text',
    text: timing
      ? `${result.passedCount}/${total} passed  ·  ${timing}`
      : `${result.passedCount}/${total} passed`,
    tone: result.passedCount === total && result.status === 'ok' ? 'pass' : 'meta',
  })

  return items
}

export function terminalItemsToPlainLines(items: readonly CodeTerminalItem[]): string[] {
  const out: string[] = []
  for (const item of items) {
    switch (item.kind) {
      case 'divider':
        out.push(TERMINAL_RUN_DIVIDER)
        break
      case 'header':
        out.push(`${item.title}  ·  ${item.time}`)
        break
      case 'section':
        out.push('', `── ${item.title} ──`)
        break
      case 'goto':
        out.push(item.label || `${item.path}:${item.line}${item.column > 1 ? `:${item.column}` : ''}`)
        break
      case 'pass':
        out.push(`PASS ${item.text}`)
        break
      case 'fail':
        out.push(`FAIL ${item.text}`)
        break
      case 'text':
        out.push(item.text)
        break
      default:
        break
    }
  }
  return out.filter((l, i, arr) => !(l === '' && arr[i - 1] === ''))
}

export function appendTerminalPayload(
  prev: readonly CodeTerminalItem[],
  next: readonly CodeTerminalItem[] | readonly string[],
): CodeTerminalItem[] {
  if (next.length === 1 && typeof next[0] === 'string' && next[0] === '__CLEAR__') {
    return []
  }
  const asItems: CodeTerminalItem[] =
    typeof next[0] === 'string' || next.length === 0
      ? (next as readonly string[]).map((text) =>
          isTerminalRunDivider(text)
            ? ({ kind: 'divider' } as const)
            : ({ kind: 'text', text, tone: terminalLineTone(text) } as const),
        )
      : (next as CodeTerminalItem[])
  return [...prev, ...asItems]
}

export function polishCodeRunLines(
  lines: readonly string[],
  opts?: { sourcePath?: string; sourceLineCount?: number },
): string[] {
  const sourcePath = opts?.sourcePath?.trim()
  const maxUser =
    opts?.sourceLineCount && opts.sourceLineCount > 0
      ? opts.sourceLineCount
      : Number.POSITIVE_INFINITY
  const out: string[] = []
  let sawHarness = false

  for (const raw of lines) {
    if (/\[judge0\]/i.test(raw)) continue
    if (/^\[code-run\]/.test(raw)) {
      const m = raw.match(/language=(\S+)\s+entryPoint=(\S+)\s+status=(\S+)/i)
      if (m) {
        out.push(`${m[1]} · ${m[2]}`)
        const st = statusLabel(m[3]!)
        if (m[3] !== 'ok') out.push('', st)
      }
      continue
    }
    if (/^\[summary\]\s*/i.test(raw)) {
      out.push('', raw.replace(/^\[summary\]\s*/i, ''))
      continue
    }
    if (raw === '[stderr]' || raw === '[compile]') continue

    let line = raw
    if (sourcePath) line = rewriteHarnessLocation(line, sourcePath, maxUser)
    if (/node:internal\/|Module\._(?:compile|extensions|load)/.test(line)) continue
    if (/^Node\.js v\d+/i.test(line.trim())) continue

    const frameLine = extractFrameLine(line)
    if (frameLine != null && frameLine > maxUser) {
      if (!sawHarness) {
        out.push('  at <runner>')
        sawHarness = true
      }
      continue
    }
    out.push(line)
  }

  while (out.length && out[out.length - 1] === '') out.pop()
  return out
}

function polishDiagLines(
  text: string,
  opts: { sourcePath?: string; sourceLineCount?: number },
): string[] {
  const sourcePath = (opts.sourcePath || '').trim() || 'source'
  const maxUser =
    opts.sourceLineCount && opts.sourceLineCount > 0
      ? opts.sourceLineCount
      : Number.POSITIVE_INFINITY
  const parts = text.replace(/\r\n/g, '\n').split('\n')
  const out: string[] = []
  let sawHarness = false
  for (const raw of parts) {
    if (!raw.trim()) {
      if (out.length && out[out.length - 1] !== '') out.push('')
      continue
    }
    if (/node:internal\/|Module\._(?:compile|extensions|load)|Module\.load\b/.test(raw)) {
      continue
    }
    if (/^Node\.js v\d+/i.test(raw.trim())) continue
    let line = rewriteHarnessLocation(raw, sourcePath, maxUser)
    const frameLine = extractFrameLine(line)
    if (frameLine != null && frameLine > maxUser) {
      if (!sawHarness) {
        out.push('  at <runner>')
        sawHarness = true
      }
      continue
    }
    if (/Object\.<anonymous>/.test(line) && !line.includes(sourcePath)) continue
    out.push(line)
  }
  while (out.length && out[out.length - 1] === '') out.pop()
  if (out.length > 16) return [...out.slice(0, 16), `… (${out.length - 16} more lines)`]
  return out
}

/** Lines printed before the harness JSON result. */
export function extractUserStdout(stdout: string | null | undefined): string[] {
  if (!stdout) return []
  const text = stdout.replace(/\r\n/g, '\n')
  const lines = text.split('\n')
  let harnessIdx = -1
  for (let i = lines.length - 1; i >= 0; i--) {
    const t = lines[i]!.trim()
    if (!t.startsWith('[')) continue
    try {
      const parsed = JSON.parse(t) as unknown
      if (Array.isArray(parsed) && parsed.some((r) => r && typeof r === 'object' && 'id' in r)) {
        harnessIdx = i
        break
      }
    } catch {
      /* keep looking */
    }
  }
  const user = (harnessIdx >= 0 ? lines.slice(0, harnessIdx) : lines)
    .map((l) => l.replace(/\s+$/, ''))
    .filter((l, i, arr) => l.length > 0 || (i > 0 && arr[i - 1].length > 0))
  while (user.length && user[user.length - 1] === '') user.pop()
  return user.slice(0, 40)
}

const SANDBOX_MAIN_EXT =
  'go|rs|c|cpp|rb|php|kt|swift|cs|fs|clj|lua|r|ex|pl|sh|hs|scala|dart'

function remapSandboxLine(line: string, sourcePath: string): string {
  return line
    .replace(/\/box\/script\.(js|ts|mjs|cjs|jsx|tsx|py)/g, sourcePath)
    .replace(/(^|[^.\w/-])script\.(js|ts|mjs|cjs|jsx|tsx|py)(?=:\d)/g, `$1${sourcePath}`)
    .replace(/File "\/box\/script\.py"/g, `File "${sourcePath}"`)
    .replace(/\/box\/Main\.java/g, sourcePath)
    .replace(/(^|[^.\w/-])Main\.java(?=:\d)/g, `$1${sourcePath}`)
    .replace(new RegExp(`/box/main\\.(${SANDBOX_MAIN_EXT})`, 'g'), sourcePath)
    .replace(
      new RegExp(`(^|[^.\\w]|\\/)(?:\\.\\/)?main\\.(${SANDBOX_MAIN_EXT})(?=:\\d)`, 'g'),
      `$1${sourcePath}`,
    )
}

/** Map a terminal loc (Judge0 `main.go`, `./main.go`, `/box/script.js`) onto a workspace file. */
export function resolveTerminalWorkspacePath(
  path: string,
  files: ReadonlyArray<{ path: string }>,
): string | null {
  const normalized = String(path ?? '')
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^file:\/\//, '')
    .trim()
  if (!normalized || !files.length) return null
  const exact =
    files.find((f) => f.path === normalized) ||
    files.find((f) => f.path.endsWith(`/${normalized}`))
  if (exact) return exact.path
  const leaf = normalized.split('/').pop() ?? normalized
  const byLeaf = files.filter((f) => (f.path.split('/').pop() ?? f.path) === leaf)
  if (byLeaf.length === 1) return byLeaf[0]!.path
  const dot = leaf.lastIndexOf('.')
  const ext = dot >= 0 ? leaf.slice(dot) : ''
  if (!ext) return null
  const solve = files.find((f) => {
    const name = f.path.split('/').pop() ?? f.path
    return name.startsWith('solve') && name.endsWith(ext)
  })
  if (solve) return solve.path
  const sameExt = files.filter((f) => (f.path.split('/').pop() ?? '').endsWith(ext))
  if (sameExt.length === 1) return sameExt[0]!.path
  const inSrc = sameExt.filter((f) => f.path.startsWith('src/'))
  return inSrc.length === 1 ? inSrc[0]!.path : null
}

function rewriteHarnessLocation(
  line: string,
  sourcePath: string,
  maxUser: number,
): string {
  const remapped = remapSandboxLine(line, sourcePath)
  const segs = parseTerminalLineSegments(remapped)
  const loc = segs.find((s) => s.kind === 'loc')
  if (!loc || loc.kind !== 'loc') return remapped
  if (loc.line <= maxUser) {
    if (loc.path === sourcePath) return remapped
    return remapped.replaceAll(loc.path, sourcePath)
  }
  const rest = segs
    .map((s) => (s.kind === 'loc' ? '' : s.text))
    .join('')
    .replace(/^[\s:]+/, '')
    .trim()
  return rest ? `Runner · ${rest}` : 'Runner · compile error'
}

function findPrimaryLocation(
  lines: readonly string[],
  fallbackPath?: string,
): { path: string; line: number; column: number } | null {
  for (const line of lines) {
    const segs = parseTerminalLineSegments(line)
    const loc = segs.find((s) => s.kind === 'loc')
    if (loc && loc.kind === 'loc') {
      return { path: loc.path, line: loc.line, column: loc.column }
    }
  }
  if (fallbackPath) {
    for (const line of lines) {
      const n = extractFrameLine(line)
      if (n != null) return { path: fallbackPath, line: n, column: 1 }
    }
  }
  return null
}

function looksLikeStackFrame(line: string): boolean {
  return /^\s*at\s+/.test(line) || /\bat\s+</.test(line)
}

function statusLabel(status: string): string {
  switch (status) {
    case 'ok':
      return 'Finished'
    case 'compile_error':
      return 'Compile error'
    case 'runtime_error':
      return 'Runtime error'
    case 'timeout':
      return 'Timed out'
    case 'judge_error':
      return 'Runner error'
    case 'unsupported_language':
      return 'Unsupported language'
    case 'invalid_request':
      return 'Invalid request'
    default:
      return status
  }
}

function formatJudgeTime(time: string | null | undefined): string | null {
  if (!time) return null
  const n = Number(time)
  if (!Number.isFinite(n)) return `${time}s`
  if (n < 1) return `${Math.round(n * 1000)}ms`
  return `${n}s`
}

function guessLanguage(lines: readonly string[]): string {
  const m = lines.find((l) => / · /.test(l))?.match(/^(\S+)\s·/)
  return m?.[1] || 'run'
}

function guessEntry(lines: readonly string[]): string {
  const m = lines.find((l) => / · /.test(l))?.match(/·\s+(\S+)\s·/)
  return m?.[1] || 'entry'
}

function extractFrameLine(line: string): number | null {
  const m =
    line.match(/:(\d+):\d+\)?\s*$/) ||
    line.match(/:(\d+)\)?\s*$/) ||
    line.match(/, line (\d+)/i) ||
    line.match(/[\w./\\-]+\.[A-Za-z][A-Za-z0-9]*:(\d+)(?::\d+)?/)
  if (!m) return null
  const n = Number(m[1])
  return Number.isFinite(n) && n > 0 ? n : null
}

export function terminalLineTone(line: string): CodeRunTerminalTone {
  if (isTerminalRunDivider(line)) return 'divider'
  if (/^──\s+\w+/.test(line)) return 'section'
  if (/^→\s+/.test(line)) return 'goto'
  if (/^PASS\b/.test(line)) return 'pass'
  if (/^FAIL\b/.test(line)) return 'fail'
  if (
    /^(Compile error|Runtime error|Timed out|Runner error|Invalid request|Unsupported language)\b/.test(
      line,
    )
  ) {
    return 'error'
  }
  if (/^\d+\/\d+ passed\b/.test(line) || /^› /.test(line)) return 'meta'
  return 'default'
}

export function assertCodeRunTerminalShape(lines: readonly string[], label = 'lines'): void {
  if (!Array.isArray(lines) || !lines.length) {
    throw new Error(`${label}: expected non-empty lines`)
  }
  for (const line of lines) {
    if (/judge0/i.test(line)) throw new Error(`${label}: judge0 leak: ${line}`)
    if (/^\[(code-run|judge0|summary|stderr|compile)\]/i.test(line)) {
      throw new Error(`${label}: tagged line: ${line}`)
    }
  }
  const hasHeader = lines.some((l) => / · /.test(l) && (/case/i.test(l) || /\d{1,2}:\d{2}/.test(l)))
  const hasSummary = lines.some((l) => /^\d+\/\d+ passed\b/.test(l))
  const hasCase = lines.some((l) => /^(PASS|FAIL)\b/.test(l))
  if (!hasHeader) throw new Error(`${label}: missing language · entry header`)
  if (!hasSummary) throw new Error(`${label}: missing N/M passed summary`)
  if (!hasCase) throw new Error(`${label}: missing PASS/FAIL rows`)
}

export function parseTerminalLineSegments(line: string): CodeRunTerminalSeg[] {
  const segs: CodeRunTerminalSeg[] = []
  let last = 0
  LOC_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = LOC_RE.exec(line)) !== null) {
    const prefix = m[1] || ''
    const path = m[2]!
    const locSuffix = m[3]!
    const lineNo = Number(m[4] || 1)
    const col = Number(m[5] || 1)
    const pathStart = m.index + prefix.length
    if (pathStart > last) {
      segs.push({ kind: 'text', text: line.slice(last, pathStart) })
    }
    segs.push({
      kind: 'loc',
      text: `${path}${locSuffix}`,
      path,
      line: Number.isFinite(lineNo) && lineNo > 0 ? lineNo : 1,
      column: Number.isFinite(col) && col > 0 ? col : 1,
    })
    last = m.index + m[0].length
  }
  if (last < line.length) segs.push({ kind: 'text', text: line.slice(last) })
  if (!segs.length) segs.push({ kind: 'text', text: line })
  return segs
}

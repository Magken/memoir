/**
 * formatCodeRunTerminal.unit.mjs
 */
import assert from 'node:assert/strict'
import {
  composeCodeRunTerminal,
  extractUserStdout,
  parseTerminalLineSegments,
  polishCodeRunLines,
  resolveTerminalWorkspacePath,
  terminalItemsToPlainLines,
  terminalLineTone,
} from './formatCodeRunTerminal.ts'

const polished = polishCodeRunLines(
  [
    '[code-run] language=typescript entryPoint=twoSum status=runtime_error',
    '[judge0] 11 Runtime Error (NZEC)',
    '[stderr]',
    '    at twoSum (/box/script.js:3:11)',
    '    at Module._compile (node:internal/modules/cjs/loader:1:1)',
    'FAIL t1 (basic): run runtime_error',
    '[summary] 0/1 passed',
  ],
  { sourcePath: 'src/solve.ts', sourceLineCount: 8 },
)

assert.ok(!polished.some((l) => /judge0/i.test(l)))
assert.ok(polished.some((l) => l.includes('src/solve.ts:3')))
assert.ok(polished.some((l) => l === 'Runtime error'))
assert.ok(polished.some((l) => l === '0/1 passed'))

assert.equal(terminalLineTone('PASS t1'), 'pass')
assert.equal(terminalLineTone('FAIL t1 — boom'), 'fail')
assert.equal(terminalLineTone('Runtime error'), 'error')
assert.equal(terminalLineTone('──'), 'divider')

const segs = parseTerminalLineSegments('    at twoSum (src/solve.ts:3:11)')
assert.ok(segs.some((s) => s.kind === 'loc' && s.path === 'src/solve.ts' && s.line === 3 && s.column === 11))

const lone = parseTerminalLineSegments('src/solve.js:1')
assert.ok(lone.some((s) => s.kind === 'loc' && s.path === 'src/solve.js' && s.line === 1))

assert.deepEqual(extractUserStdout('hello\nworld\n[{"id":"t1","actual":1}]'), [
  'hello',
  'world',
])

const items = composeCodeRunTerminal(
  {
    status: 'runtime_error',
    passedCount: 0,
    total: 1,
    cases: [
      {
        id: 't1',
        name: 'basic',
        passed: false,
        message: 'runtime error',
      },
    ],
    lines: [],
    judge0: {
      stderr: `Error: boom\n    at twoSum (/box/script.js:3:11)\n`,
      time: '0.02',
    },
  },
  { sourcePath: 'src/solve.ts', sourceLineCount: 8, language: 'typescript', entryPoint: 'twoSum' },
)

assert.ok(items.some((i) => i.kind === 'header'))
assert.ok(items.some((i) => i.kind === 'section' && i.title === 'Problems'))
assert.ok(items.some((i) => i.kind === 'goto' && i.path === 'src/solve.ts' && i.line === 3))
assert.ok(items.some((i) => i.kind === 'section' && i.title === 'Tests'))
assert.ok(items.some((i) => i.kind === 'fail'))
assert.ok(items.some((i) => i.kind === 'fail' && i.text.includes('basic')))
assert.ok(!items.some((i) => 'text' in i && /\bt1\b/.test(String(i.text))))
assert.ok(!items.some((i) => i.kind === 'fail' && i.text.includes('\u2014')))
assert.ok(items.some((i) => i.kind === 'section' && i.title === 'Summary'))

const plain = terminalItemsToPlainLines(items)
assert.ok(plain.some((l) => /src\/solve\.ts:3/.test(l)))
assert.ok(plain.some((l) => l.includes('── Problems ──')))

const goCompile = composeCodeRunTerminal(
  {
    status: 'compile_error',
    passedCount: 0,
    total: 2,
    cases: [
      { id: 't1', name: 'allows within limit', passed: false, message: 'compile error' },
      { id: 't2', name: 'blocks when saturated', passed: false, message: 'compile error' },
    ],
    lines: [],
    judge0: {
      compileOutput: `# command-line-arguments
./main.go:89:27: cannot convert toStringMap(args[0]) (value of type map[string]interface{}) to type RateLimiter
`,
    },
  },
  { sourcePath: 'src/solve.go', sourceLineCount: 40, language: 'go', entryPoint: 'NewLimiter' },
)
assert.ok(
  !goCompile.some((i) => i.kind === 'goto' && String(i.path ?? '').includes('main.go')),
  'sandbox main.go must not stay as a goto path',
)
assert.ok(
  goCompile.some(
    (i) =>
      i.kind === 'text' &&
      /cannot convert toStringMap/i.test(i.text) &&
      !/main\.go/.test(i.text),
  ),
  'keep the compiler message without main.go',
)

const goUser = polishCodeRunLines(
  ['./main.go:4:1: undefined: foo'],
  { sourcePath: 'src/solve.go', sourceLineCount: 20 },
)
assert.ok(goUser.some((l) => l.includes('src/solve.go:4')))

assert.equal(
  resolveTerminalWorkspacePath('main.go', [{ path: 'src/solve.go' }, { path: 'README.md' }]),
  'src/solve.go',
)
assert.equal(
  resolveTerminalWorkspacePath('./main.go', [{ path: 'src/solve.go' }]),
  'src/solve.go',
)

console.log('ok — formatCodeRunTerminal')

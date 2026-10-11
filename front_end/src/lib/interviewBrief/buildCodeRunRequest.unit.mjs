/**
 * buildCodeRunRequest — omit files[] for one solve; attach helpers when present.
 * Run: npx tsx front_end/src/lib/interviewBrief/buildCodeRunRequest.unit.mjs
 */
import assert from 'node:assert/strict'
import { buildCodeRunRequest } from './buildCodeRunRequest.ts'

const cases = [
  {
    id: 't1',
    name: 'basic',
    args: [1],
    expected: 1,
    compare: 'deep_equal',
    hidden: false,
    timeoutMs: null,
  },
]

const tests = { runner: 'hidden_cases_v1', entryPoint: 'solve', cases }

{
  const built = buildCodeRunRequest({
    workspace: {
      files: [
        { path: 'src/solve.ts', language: 'typescript', content: 'export function solve() { return 1 }\n' },
        { path: 'README.md', language: 'markdown', content: '# x\n' },
        { path: 'tests/cases.json', language: 'json', content: '{}\n' },
      ],
    },
    languages: ['typescript'],
    defaultLanguage: 'typescript',
    tests,
  })
  assert.equal(built.ok, true)
  if (built.ok) {
    assert.equal(built.body.files, undefined)
    assert.equal(built.body.sourcePath, 'src/solve.ts')
  }
}

{
  const built = buildCodeRunRequest({
    workspace: {
      files: [
        {
          path: 'src/solve.py',
          language: 'python',
          content: 'from parse import n\ndef solve(x):\n  return n(x)\n',
        },
        { path: 'src/parse.py', language: 'python', content: 'def n(x):\n  return x\n' },
        {
          path: 'src/functions/tokenize.py',
          language: 'python',
          content: 'def tokenize(s):\n  return s\n',
        },
      ],
    },
    languages: ['python'],
    defaultLanguage: 'python',
    activeLanguage: 'python',
    tests,
  })
  assert.equal(built.ok, true)
  if (built.ok) {
    assert.ok(built.body.files)
    assert.deepEqual(
      built.body.files.map((f) => f.path).sort(),
      ['src/functions/tokenize.py', 'src/parse.py', 'src/solve.py'],
    )
    assert.equal(
      built.body.files.some((f) => f.path === 'src/functions/tokenize.py'),
      true,
      'subfolder paths preserved (not flattened)',
    )
  }
}

{
  const built = buildCodeRunRequest({
    workspace: {
      files: [
        { path: 'src/solve.ts', language: 'typescript', content: 'export function solve() { return 1 }\n' },
        { path: 'src/solve.py', language: 'python', content: 'def solve():\n  return 2\n' },
        { path: 'README.md', language: 'markdown', content: '# x\n' },
      ],
      activeId: 'README.md',
    },
    languages: ['typescript'],
    defaultLanguage: 'typescript',
    activeFilePath: 'README.md',
    tests,
  })
  assert.equal(built.ok, true)
  if (built.ok) {
    assert.equal(built.body.language, 'typescript')
    assert.equal(built.body.sourcePath, 'src/solve.ts')
    assert.match(built.body.source, /return 1/)
  }
}

{
  const tsSeed =
    "export function twoSum(nums: number[], target: number): number[] {\n  // TODO: Implement your solution\n  throw new Error('not implemented');\n}\n"
  const pySeed =
    'def twoSum(nums, target):\n    # TODO: Implement your solution\n    raise NotImplementedError\n'
  const built = buildCodeRunRequest({
    workspace: {
      files: [
        { path: 'src/solve.ts', language: 'typescript', content: tsSeed },
        { path: 'src/solve.py', language: 'python', content: pySeed },
      ],
      activeId: 'src/solve.ts',
    },
    languages: ['typescript', 'python'],
    defaultLanguage: 'typescript',
    activeLanguage: 'python',
    activeFilePath: 'src/solve.ts',
    tests,
  })
  assert.equal(built.ok, true)
  if (built.ok) {
    assert.equal(built.body.language, 'python', 'explorer python must not submit TypeScript to Judge0')
    assert.equal(built.body.sourcePath, 'src/solve.py')
    assert.match(built.body.source, /^def twoSum/m)
  }

  const tsRun = buildCodeRunRequest({
    workspace: {
      files: [
        { path: 'src/solve.ts', language: 'typescript', content: tsSeed },
        { path: 'src/solve.py', language: 'python', content: pySeed },
      ],
      activeId: 'src/solve.ts',
    },
    languages: ['typescript', 'python'],
    defaultLanguage: 'typescript',
    activeLanguage: 'typescript',
    activeFilePath: 'src/solve.ts',
    tests,
  })
  assert.equal(tsRun.ok, true)
  if (tsRun.ok) {
    assert.equal(tsRun.body.language, 'typescript')
    assert.equal(tsRun.body.sourcePath, 'src/solve.ts')
    assert.match(tsRun.body.source, /function twoSum/)
    assert.doesNotMatch(tsRun.body.source, /^def /m)
  }
}

{
  const workspace = {
    files: [
      {
        path: 'src/solve.ts',
        language: 'typescript',
        content:
          "import { parsePair } from './parse'\nimport { pick } from './functions/tokenize'\nexport function solve(nums: number[], target: number): number[] {\n  return pick(parsePair(nums, target))\n}\n",
      },
      {
        path: 'src/parse.ts',
        language: 'typescript',
        content: 'export function parsePair(nums: number[], target: number): number[] {\n  return [0, 1]\n}\n',
      },
      {
        path: 'src/functions/tokenize.ts',
        language: 'typescript',
        content: 'export function pick(pair: number[]): number[] {\n  return pair\n}\n',
      },
      {
        path: 'src/solve.py',
        language: 'python',
        content:
          'from parse import parse_pair\nfrom functions.tokenize import pick\ndef solve(nums, target):\n  return pick(parse_pair(nums, target))\n',
      },
      { path: 'src/parse.py', language: 'python', content: 'def parse_pair(nums, target):\n  return [0, 1]\n' },
      {
        path: 'src/functions/tokenize.py',
        language: 'python',
        content: 'def pick(pair):\n  return pair\n',
      },
      { path: 'README.md', language: 'markdown', content: '# Problem\n' },
    ],
  }

  const tsRun = buildCodeRunRequest({
    workspace,
    languages: ['typescript', 'python'],
    defaultLanguage: 'typescript',
    activeLanguage: 'typescript',
    activeFilePath: 'src/solve.ts',
    tests,
  })
  assert.equal(tsRun.ok, true)
  if (tsRun.ok) {
    assert.equal(tsRun.body.language, 'typescript')
    assert.equal(tsRun.body.sourcePath, 'src/solve.ts')
    assert.match(tsRun.body.source, /from '\.\/parse'/)
    assert.match(tsRun.body.source, /from '\.\/functions\/tokenize'/)
    assert.deepEqual(
      (tsRun.body.files ?? []).map((f) => f.path).sort(),
      ['src/functions/tokenize.ts', 'src/parse.ts', 'src/solve.ts'],
    )
    assert.equal((tsRun.body.files ?? []).some((f) => f.path.endsWith('.py')), false)
  }

  const pyRun = buildCodeRunRequest({
    workspace,
    languages: ['typescript', 'python'],
    defaultLanguage: 'typescript',
    activeLanguage: 'python',
    activeFilePath: 'src/solve.ts',
    tests,
  })
  assert.equal(pyRun.ok, true)
  if (pyRun.ok) {
    assert.equal(pyRun.body.language, 'python')
    assert.equal(pyRun.body.sourcePath, 'src/solve.py')
    assert.match(pyRun.body.source, /from parse import parse_pair/)
    assert.match(pyRun.body.source, /from functions.tokenize import pick/)
    assert.deepEqual(
      (pyRun.body.files ?? []).map((f) => f.path).sort(),
      ['src/functions/tokenize.py', 'src/parse.py', 'src/solve.py'],
    )
    assert.equal((pyRun.body.files ?? []).some((f) => f.path.endsWith('.ts')), false)
  }
}

{
  const built = buildCodeRunRequest({
    workspace: {
      files: [
        {
          path: 'src/solve.js',
          language: 'javascript',
          content:
            "import { parsePair } from './parse'\nexport function solve(nums, target) {\n  return parsePair(nums, target)\n}\n",
        },
        {
          path: 'src/parse.js',
          language: 'javascript',
          content: 'export function parsePair(nums, target) {\n  return [0, 1]\n}\n',
        },
        { path: 'src/solve.go', language: 'go', content: 'package main\nfunc solve() []int { return []int{0, 1} }\n' },
        { path: 'src/parse.go', language: 'go', content: 'package main\nfunc parse() {}\n' },
      ],
    },
    languages: ['javascript', 'go'],
    defaultLanguage: 'javascript',
    activeLanguage: 'javascript',
    tests,
  })
  assert.equal(built.ok, true)
  if (built.ok) {
    assert.equal(built.body.language, 'javascript')
    assert.deepEqual(
      (built.body.files ?? []).map((f) => f.path).sort(),
      ['src/parse.js', 'src/solve.js'],
    )
  }

  const goRun = buildCodeRunRequest({
    workspace: {
      files: [
        { path: 'src/solve.go', language: 'go', content: 'package main\nfunc solve() []int { return []int{0, 1} }\n' },
        { path: 'src/parse.go', language: 'go', content: 'package main\nfunc parse() {}\n' },
      ],
    },
    languages: ['go'],
    defaultLanguage: 'go',
    activeLanguage: 'go',
    tests,
  })
  assert.equal(goRun.ok, true)
  if (goRun.ok) {
    assert.equal(goRun.body.language, 'go')
    assert.ok(goRun.body.files, 'FE still sends helper files; Edge classic-wraps Go and does not import them')
    assert.deepEqual(
      goRun.body.files.map((f) => f.path).sort(),
      ['src/parse.go', 'src/solve.go'],
    )
  }
}

console.log('ok — buildCodeRunRequest files[]')

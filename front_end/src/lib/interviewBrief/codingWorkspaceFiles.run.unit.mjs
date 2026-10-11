/**
 * listCodingRunFiles / covers rewrite — language slice, no flatten, skip author-only.
 * Run: npx tsx front_end/src/lib/interviewBrief/codingWorkspaceFiles.run.unit.mjs
 */
import assert from 'node:assert/strict'
import {
  labeledCodingWorkspaceSource,
  listCodingRunFiles,
  listWorkingSrcFiles,
  rewriteCoverPath,
  rewriteCoverPaths,
  resolveCoverHopPath,
  isAuthorOnlyCodingPath,
  ensureSolveFilesForLanguages,
  isCodingExplorerVisiblePath,
  pickVisibleCodingFile,
  pruneSrcFilesToLanguage,
  visibleCodingExplorerFiles,
} from './codingWorkspaceFiles.ts'

const workspace = {
  files: [
    { path: 'src/solve.ts', language: 'typescript', content: 'export function solve() {}\n' },
    { path: 'src/parse.ts', language: 'typescript', content: 'export function parse() {}\n' },
    {
      path: 'src/functions/tokenize.ts',
      language: 'typescript',
      content: 'export function tokenize() {}\n',
    },
    { path: 'src/solve.py', language: 'python', content: 'def solve():\n  pass\n' },
    { path: 'src/parse.py', language: 'python', content: 'def parse():\n  pass\n' },
    { path: 'README.md', language: 'markdown', content: '# Problem\n' },
    { path: 'tests/cases.json', language: 'json', content: '{}\n' },
    { path: 'tests/reference.ts', language: 'typescript', content: '// oracle\n' },
    { path: 'tests/reference/parse.ts', language: 'typescript', content: '// hidden\n' },
  ],
}

const ts = listCodingRunFiles(workspace, 'typescript')
assert.deepEqual(
  ts.map((f) => f.path).sort(),
  ['src/functions/tokenize.ts', 'src/parse.ts', 'src/solve.ts'],
)
assert.ok(!ts.some((f) => f.path.includes('reference') || f.path.endsWith('.py')))

const py = listCodingRunFiles(workspace, 'python')
assert.deepEqual(
  py.map((f) => f.path).sort(),
  ['src/parse.py', 'src/solve.py'],
)

const one = listCodingRunFiles(
  { files: [{ path: 'src/solve.ts', language: 'typescript', content: 'x' }] },
  'typescript',
)
assert.equal(one.length, 1)

assert.equal(listWorkingSrcFiles(workspace, 'typescript').includes('src/parse.ts'), true)
assert.equal(rewriteCoverPath('src/parse.ts', 'python'), 'src/parse.py')
assert.deepEqual(rewriteCoverPaths(['src/parse.ts', 'src/functions/tokenize.ts'], 'python'), [
  'src/parse.py',
  'src/functions/tokenize.py',
])
assert.equal(resolveCoverHopPath(['src/parse.ts'], 'python', workspace), 'src/parse.py')
assert.equal(
  resolveCoverHopPath(['src/missing.ts'], 'python', workspace),
  'src/solve.py',
)
assert.ok(isAuthorOnlyCodingPath('tests/cases.json'))
assert.ok(isAuthorOnlyCodingPath('tests/reference/parse.ts'))
assert.equal(isAuthorOnlyCodingPath('src/parse.ts'), false)

const labeled = labeledCodingWorkspaceSource(ts)
assert.match(labeled, /src\/parse\.ts:1\|/)
assert.match(labeled, /src\/solve\.ts:1\|/)
assert.ok(!labeled.includes('# src/parse.ts'))

{
  const sliced = ensureSolveFilesForLanguages(workspace, ['typescript', 'python'], {
    entryPoint: 'solve',
  })
  const paths = new Set((sliced.files ?? []).map((f) => f.path))
  assert.ok(paths.has('src/solve.py'))
  assert.ok(paths.has('src/parse.py'))
  assert.ok(paths.has('src/functions/tokenize.py'))
  assert.ok(paths.has('tests/reference.py'))
  assert.ok(paths.has('tests/reference/parse.py'))
  assert.equal(
    sliced.files?.find((f) => f.path === 'src/parse.ts')?.content,
    'export function parse() {}\n',
  )
}

{
  const visibleTs = visibleCodingExplorerFiles(workspace.files, 'typescript')
  assert.deepEqual(
    visibleTs.map((f) => f.path).sort(),
    [
      'README.md',
      'src/functions/tokenize.ts',
      'src/parse.ts',
      'src/solve.ts',
      'tests/cases.json',
      'tests/reference.ts',
      'tests/reference/parse.ts',
    ],
  )
  assert.equal(isCodingExplorerVisiblePath('README.md', 'python'), true)
  assert.equal(isCodingExplorerVisiblePath('src/solve.py', 'python'), true)
  assert.equal(isCodingExplorerVisiblePath('src/solve.ts', 'python'), false)
  const pruned = pruneSrcFilesToLanguage(workspace, 'python')
  const prunedPaths = new Set((pruned.files ?? []).map((f) => f.path))
  assert.ok(prunedPaths.has('src/solve.py'))
  assert.ok(prunedPaths.has('src/parse.py'))
  assert.ok(prunedPaths.has('README.md'))
  assert.ok(prunedPaths.has('tests/cases.json'))
  assert.ok(!prunedPaths.has('src/solve.ts'))
  assert.ok(!prunedPaths.has('src/parse.ts'))
}

{
  const pickedPy = pickVisibleCodingFile(workspace.files, 'python', 'src/solve.ts')
  assert.equal(pickedPy?.path, 'src/solve.py')
  const pickedTs = pickVisibleCodingFile(workspace.files, 'typescript', 'src/parse.ts')
  assert.equal(pickedTs?.path, 'src/parse.ts')
  assert.equal(workspace.files.length, 9)
}

console.log('ok — codingWorkspaceFiles run-set / covers')

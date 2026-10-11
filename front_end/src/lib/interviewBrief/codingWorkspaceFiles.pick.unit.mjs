/**
 * pickCodingSolveSource prefers the active coding tab.
 */
import assert from 'node:assert/strict'
import { pickCodingSolveSource } from './codingWorkspaceFiles.ts'

const workspace = {
  files: [
    {
      path: 'src/solve.ts',
      language: 'typescript',
      content: 'export function twoSum() { return [0,1] }\n',
    },
    {
      path: 'src/solve.py',
      language: 'python',
      content: 'def twoSum(nums, target):\n  return [0, 1]\n',
    },
    { path: 'README.md', language: 'markdown', content: '# Problem\n' },
  ],
  openIds: ['src/solve.py'],
  activeId: 'src/solve.py',
}

const py = pickCodingSolveSource(workspace, 'typescript', 'src/solve.py')
assert.equal(py?.path, 'src/solve.py')
assert.match(py?.source ?? '', /def twoSum/)

const fromReadme = pickCodingSolveSource(workspace, 'typescript', 'README.md')
assert.equal(fromReadme?.path, 'src/solve.ts')

const withHelper = {
  files: [
    {
      path: 'src/solve.ts',
      language: 'typescript',
      content: 'export function solve() { return 1 }\n',
    },
    {
      path: 'src/parse.ts',
      language: 'typescript',
      content: 'export function parse() { return 0 }\n',
    },
  ],
}
const fromHelper = pickCodingSolveSource(withHelper, 'typescript', 'src/parse.ts')
assert.equal(fromHelper?.path, 'src/solve.ts', 'helpers are not the Run entry')

const fallback = pickCodingSolveSource(workspace, 'python', null)
assert.equal(fallback?.path, 'src/solve.py')

console.log('ok — pickCodingSolveSource active tab')

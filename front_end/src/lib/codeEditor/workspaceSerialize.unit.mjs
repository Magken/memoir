/**
 * workspaceSerialize — path-shaped activeId/openIds round-trip.
 */
import assert from 'node:assert/strict'
import {
  deserializeCodeWorkspace,
  serializeCodeWorkspace,
} from './workspaceSerialize.ts'
import { createFile } from './workspace.ts'

const a = createFile('src/solve.ts', 'export function twoSum() {}')
const b = createFile('README.md', '# hi')
const workspace = {
  files: [a, b],
  folders: ['src'],
  openIds: [a.id, b.id],
  activeId: a.id,
}

const payload = serializeCodeWorkspace(workspace, 'Drill')
assert.equal(payload.activeId, 'src/solve.ts')
assert.deepEqual(payload.openIds, ['src/solve.ts', 'README.md'])
assert.equal(payload.files[0]?.content, 'export function twoSum() {}')

const round = deserializeCodeWorkspace(payload)
assert.equal(round.files.find((f) => f.id === round.activeId)?.path, 'src/solve.ts')
assert.ok(round.openIds.every((id) => round.files.some((f) => f.id === id)))

const fromBrief = deserializeCodeWorkspace({
  files: [
    { path: 'src/solve.py', language: 'python', content: 'def two_sum():\n  pass\n' },
    { path: 'README.md', language: 'markdown', content: '# x\n' },
  ],
  openIds: ['README.md', 'src/solve.py'],
  activeId: 'src/solve.py',
})
assert.equal(fromBrief.files.find((f) => f.id === fromBrief.activeId)?.path, 'src/solve.py')

console.log('ok — workspaceSerialize path activeId')

/**
 * workspaceEditHistory — undo activates the file that changed.
 * Run: npx tsx front_end/src/lib/codeEditor/workspaceEditHistory.unit.mjs
 */
import assert from 'node:assert/strict'
import {
  coalesceEdit,
  emptyWorkspaceEditStacks,
  entryPath,
  inverseEntry,
  popRedo,
  popUndo,
  pushWorkspaceEdit,
} from './workspaceEditHistory.ts'

let stacks = emptyWorkspaceEditStacks()
stacks = coalesceEdit(stacks, 'src/parse.ts', 'a', 'ab')
stacks = coalesceEdit(stacks, 'src/parse.ts', 'ab', 'abc')
assert.equal(stacks.undo.length, 1)
assert.equal(stacks.undo[0]?.kind, 'edit')
if (stacks.undo[0]?.kind === 'edit') assert.equal(stacks.undo[0].after, 'abc')

stacks = coalesceEdit(stacks, 'src/solve.ts', 'x', 'xy')
assert.equal(stacks.undo.length, 2)

const first = popUndo(stacks)
assert.ok(first)
assert.equal(entryPath(first.entry), 'src/solve.ts')
stacks = first.stacks

const second = popUndo(stacks)
assert.ok(second)
assert.equal(entryPath(second.entry), 'src/parse.ts')

const redone = popRedo(second.stacks)
assert.ok(redone)
assert.equal(entryPath(redone.entry), 'src/parse.ts')

const created = pushWorkspaceEdit(emptyWorkspaceEditStacks(), {
  kind: 'create',
  path: 'src/util.ts',
  after: '',
})
assert.equal(entryPath(created.undo[0]), 'src/util.ts')
const inv = inverseEntry(created.undo[0])
assert.equal(inv.kind, 'delete')

console.log('ok — workspaceEditHistory')

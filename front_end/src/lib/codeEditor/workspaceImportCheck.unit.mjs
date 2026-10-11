/**
 * workspaceImportCheck — missing local imports; stdlib ignored.
 * Run: npx tsx front_end/src/lib/codeEditor/workspaceImportCheck.unit.mjs
 */
import assert from 'node:assert/strict'
import { workspaceImportMarkers } from './workspaceImportCheck.ts'

const files = [
  {
    path: 'src/solve.ts',
    content: `import { parse } from './parse'\nimport { tokenize } from './functions/tokenize'\nimport fs from 'fs'\n`,
  },
  { path: 'src/parse.ts', content: 'export function parse() {}\n' },
]

const ts = workspaceImportMarkers(files, 'typescript')
assert.equal(ts.some((m) => m.message.includes('./functions/tokenize')), true)
assert.equal(ts.some((m) => m.message.includes('./parse')), false)
assert.equal(ts.some((m) => m.message.includes('fs')), false)

const pyFiles = [
  {
    path: 'src/solve.py',
    content: 'from parse import n\nfrom functions.tokenize import t\nimport json\nfrom missing import x\n',
  },
  { path: 'src/parse.py', content: 'def n(x):\n  return x\n' },
  { path: 'src/functions/tokenize.py', content: 'def t(s):\n  return s\n' },
]
const py = workspaceImportMarkers(pyFiles, 'python')
assert.equal(py.some((m) => m.message.includes('missing')), true)
assert.equal(py.some((m) => m.message.includes('parse')), false)
assert.equal(py.some((m) => m.message.includes('json')), false)
assert.equal(py.some((m) => m.message.includes('functions.tokenize')), false)

console.log('ok — workspaceImportCheck')

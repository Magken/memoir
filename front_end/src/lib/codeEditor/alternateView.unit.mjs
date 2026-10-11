/**
 * Markdown / PDF alternate-view defaults for CodeEditor.
 * Run: node front_end/src/lib/codeEditor/alternateView.unit.mjs
 */
import assert from 'node:assert/strict'
import {
  defaultAltViewForKind,
  resolveAltViewForFile,
} from './alternateView.ts'

assert.equal(defaultAltViewForKind('markdown'), 'preview', 'markdown opens in preview')
assert.equal(defaultAltViewForKind('pdf'), 'preview', 'pdf opens in preview')
assert.equal(defaultAltViewForKind('csv'), 'code', 'csv stays code/table default')
assert.equal(defaultAltViewForKind(null), 'code', 'plain code files stay code')

assert.equal(
  resolveAltViewForFile('README.md', undefined),
  'preview',
  'README.md resolves to preview by default',
)
assert.equal(
  resolveAltViewForFile('src/solve.ts', undefined),
  'code',
  'solve.ts stays code',
)
assert.equal(
  resolveAltViewForFile('README.md', 'code'),
  'code',
  'stored code preference still wins',
)

console.log('ok — alternateView markdown defaults to preview')

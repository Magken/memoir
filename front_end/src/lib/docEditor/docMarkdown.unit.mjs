/**
 * Page-break markdown export must return null for every other block.
 * Run: npx tsx front_end/src/lib/docEditor/docMarkdown.unit.mjs
 */
import assert from 'node:assert/strict'
import { docEditorLoadKind } from './docEditorLoadKind.ts'
import { exportPageBreakMarkdown } from './exportPageBreakMarkdown.ts'

assert.equal(exportPageBreakMarkdown({ getType: () => 'heading' }), null)
assert.equal(exportPageBreakMarkdown({ getType: () => 'paragraph' }), null)
assert.equal(exportPageBreakMarkdown({ getType: () => 'list' }), null)
assert.equal(exportPageBreakMarkdown({ getType: () => 'page-break' }), ':::doc-page-break')

assert.equal(docEditorLoadKind({ lexical: { root: {} }, markdown: ':::doc-page-break' }), 'lexical')
assert.equal(docEditorLoadKind({ lexical: null, markdown: '## Prompt' }), 'markdown')
assert.equal(docEditorLoadKind({}), 'none')

console.log('ok — doc markdown export does not inject page breaks')

/**
 * pdf_viewer.mjs destructures AbortException from globalThis.pdfjsLib at load.
 * Value imports of the viewer must go through pdfjsViewer (core first).
 * Run: npx tsx front_end/src/lib/docs/pdfjsViewer.unit.mjs
 *
 * Does not import pdfjs-dist (DOMMatrix is missing in Node). Source gates pin
 * the evaluate order that stops the dashboard module cascade.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const VALUE_VIEWER_IMPORT =
  /(?:^|\n)import\s+(?!type\b)[^;]*from\s+['"]pdfjs-dist\/web\/pdf_viewer\.mjs['"]/

{
  function loadViewerLikePdfJs() {
    const { AbortException } = globalThis.pdfjsLib
    return AbortException
  }
  let threw = false
  try {
    loadViewerLikePdfJs()
  } catch (e) {
    threw = e instanceof TypeError && /AbortException/.test(String(e))
  }
  assert.ok(threw, 'viewer load without globalThis.pdfjsLib must throw (dashboard console)')
  globalThis.pdfjsLib = { AbortException: class AbortException extends Error {} }
  assert.equal(typeof loadViewerLikePdfJs(), 'function', 'same destructure succeeds after core assign')
  delete globalThis.pdfjsLib
}

{
  const globalSrc = readFileSync(join(here, 'pdfjsLibGlobal.ts'), 'utf8')
  assert.ok(
    globalSrc.includes("from 'pdfjs-dist'"),
    'pdfjsLibGlobal must import the core bundle',
  )
  assert.ok(
    /globalThis\.pdfjsLib\s*=\s*pdfjsLib/.test(globalSrc),
    'pdfjsLibGlobal must assign globalThis.pdfjsLib before any viewer load',
  )
}

{
  const viewer = readFileSync(join(here, 'pdfjsViewer.ts'), 'utf8')
  const globalIdx = viewer.indexOf("import './pdfjsLibGlobal'")
  const viewerIdx = viewer.indexOf('pdfjs-dist/web/pdf_viewer.mjs')
  assert.ok(globalIdx >= 0, 'pdfjsViewer must import pdfjsLibGlobal')
  assert.ok(viewerIdx > globalIdx, 'pdfjsLibGlobal must be imported before pdf_viewer.mjs')
}

{
  const bridge = readFileSync(join(here, 'pdfFindBridge.ts'), 'utf8')
  const find = readFileSync(join(here, '../../hooks/usePdfFind.ts'), 'utf8')
  const layer = readFileSync(join(here, 'pdfTextLayer.ts'), 'utf8')
  assert.ok(!VALUE_VIEWER_IMPORT.test(bridge), 'pdfFindBridge must not value-import pdf_viewer.mjs')
  assert.ok(!VALUE_VIEWER_IMPORT.test(find), 'usePdfFind must not value-import pdf_viewer.mjs')
  assert.ok(!VALUE_VIEWER_IMPORT.test(layer), 'pdfTextLayer must not value-import pdf_viewer.mjs')
  assert.ok(bridge.includes("from './pdfjsViewer'"), 'pdfFindBridge imports pdfjsViewer')
  assert.ok(find.includes("from '../lib/docs/pdfjsViewer'"), 'usePdfFind imports pdfjsViewer')
  assert.ok(layer.includes("from './pdfjsViewer'"), 'pdfTextLayer imports pdfjsViewer')
}

{
  const highlighter = readFileSync(join(here, 'pdfTextHighlighter.ts'), 'utf8')
  assert.ok(
    !VALUE_VIEWER_IMPORT.test(highlighter),
    'pdfTextHighlighter must keep type-only pdf_viewer import (negative: a value import would race)',
  )
  assert.ok(
    /import type \{[^}]*\}\s+from 'pdfjs-dist\/web\/pdf_viewer\.mjs'/.test(highlighter),
    'pdfTextHighlighter still type-imports viewer types',
  )
}

console.log('pdfjsViewer.unit.mjs: ok')

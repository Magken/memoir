import * as pdfjsLib from 'pdfjs-dist'

type PdfJsGlobal = typeof import('pdfjs-dist')

declare global {
  // pdfjs-dist/web/pdf_viewer.mjs reads the core bundle from here at load time.
  var pdfjsLib: PdfJsGlobal | undefined
}

globalThis.pdfjsLib = pdfjsLib

export { pdfjsLib }

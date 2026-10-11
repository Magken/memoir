import { AnnotationType } from 'pdfjs-dist'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { resolvePdfDestToPage } from './pdfOutline'

export type PdfLinkEntry = {
  id: string
  label: string
  title: string | null
  url: string | null
  pageNumber: number
  targetPageNumber: number | null
}

export function formatPdfLinkDisplay(url: string, maxLength = 44): string {
  if (url.length <= maxLength) return url
  const head = Math.ceil(maxLength * 0.58)
  const tail = maxLength - head - 1
  return `${url.slice(0, head)}…${url.slice(-tail)}`
}

function linkLabel(
  url: string | null,
  targetPage: number | null,
  fallbackIndex: number,
): string {
  if (url) return formatPdfLinkDisplay(url)
  if (targetPage !== null) return `Page ${targetPage}`
  return `Link ${fallbackIndex + 1}`
}

export async function loadPdfLinks(doc: PDFDocumentProxy): Promise<PdfLinkEntry[]> {
  const links: PdfLinkEntry[] = []

  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
    const page = await doc.getPage(pageNumber)
    const annotations = await page.getAnnotations({ intent: 'display' })
    let linkIndex = 0

    for (const annotation of annotations) {
      if (annotation.annotationType !== AnnotationType.LINK) continue

      const url = (annotation.url || annotation.unsafeUrl) as string | undefined
      const dest = annotation.dest ?? null
      const targetPageNumber = url ? null : await resolvePdfDestToPage(doc, dest)
      const title = typeof annotation.title === 'string' ? annotation.title.trim() : ''

      links.push({
        id: `link-${pageNumber}-${linkIndex}`,
        label: title || linkLabel(url ?? null, targetPageNumber, links.length),
        title: title || null,
        url: url ?? null,
        pageNumber,
        targetPageNumber,
      })
      linkIndex += 1
    }
  }

  return links
}

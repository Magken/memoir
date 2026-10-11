import { OPS } from 'pdfjs-dist'
import type { PDFDocumentProxy } from 'pdfjs-dist'

export type PdfImageEntry = {
  id: string
  pageNumber: number
  indexOnPage: number
}

const IMAGE_OPS = new Set<number>([
  OPS.paintImageXObject,
  OPS.paintInlineImageXObject,
  OPS.paintImageXObjectRepeat,
  OPS.paintInlineImageXObjectGroup,
])

export async function loadPdfImages(doc: PDFDocumentProxy): Promise<PdfImageEntry[]> {
  const images: PdfImageEntry[] = []

  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
    const page = await doc.getPage(pageNumber)
    const operatorList = await page.getOperatorList()
    let indexOnPage = 0

    for (let index = 0; index < operatorList.fnArray.length; index += 1) {
      if (!IMAGE_OPS.has(operatorList.fnArray[index]!)) continue

      images.push({
        id: `img-${pageNumber}-${indexOnPage}`,
        pageNumber,
        indexOnPage,
      })
      indexOnPage += 1
    }
  }

  return images
}

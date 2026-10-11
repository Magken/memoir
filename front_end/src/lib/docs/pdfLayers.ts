import type { PDFDocumentProxy } from 'pdfjs-dist'

export type PdfLayerEntry = {
  id: string
  name: string
  visible: boolean
}

type PdfLayerGroup = {
  name?: string
}

type PdfOptionalContentConfig = {
  getGroups: () => Record<string, PdfLayerGroup>
  isVisible: (id: string) => boolean
}

export async function loadPdfLayers(doc: PDFDocumentProxy): Promise<{
  config: PdfOptionalContentConfig
  entries: PdfLayerEntry[]
}> {
  const config = (await doc.getOptionalContentConfig()) as unknown as PdfOptionalContentConfig
  const groups = config.getGroups()
  const entries = Object.entries(groups)
    .map(([id, group]) => ({
      id,
      name: group.name?.trim() || id,
      visible: Boolean(config.isVisible(id)),
    }))
    .sort((left, right) => left.name.localeCompare(right.name))

  return { config, entries }
}

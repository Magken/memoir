import type { PDFDocumentProxy } from 'pdfjs-dist'

export type PdfOutlineEntry = {
  id: string
  title: string
  pageNumber: number | null
  level: number
  children: PdfOutlineEntry[]
}

type PdfJsOutlineNode = {
  title: string
  dest: string | unknown[] | null
  items?: PdfJsOutlineNode[]
}

type PdfRefProxy = { num: number; gen: number }

function isRefProxy(value: unknown): value is PdfRefProxy {
  return typeof value === 'object' && value !== null && 'num' in value && 'gen' in value
}

export async function resolvePdfDestToPage(
  doc: PDFDocumentProxy,
  dest: string | unknown[] | null,
): Promise<number | null> {
  if (!dest) return null

  let explicitDest: unknown = dest
  if (typeof dest === 'string') {
    try {
      explicitDest = await doc.getDestination(dest)
    } catch {
      return null
    }
  }

  if (!Array.isArray(explicitDest) || explicitDest.length === 0) return null

  const pageRef = explicitDest[0]
  if (isRefProxy(pageRef)) {
    try {
      return (await doc.getPageIndex(pageRef)) + 1
    } catch {
      return null
    }
  }

  if (typeof pageRef === 'number' && Number.isInteger(pageRef)) {
    return pageRef + 1
  }

  return null
}

async function mapOutlineNodes(
  doc: PDFDocumentProxy,
  nodes: PdfJsOutlineNode[],
  level: number,
  idPrefix: string,
): Promise<PdfOutlineEntry[]> {
  const entries: PdfOutlineEntry[] = []

  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index]!
    const id = `${idPrefix}${index}`
    const pageNumber = await resolvePdfDestToPage(doc, node.dest)
    const children = node.items?.length
      ? await mapOutlineNodes(doc, node.items, level + 1, `${id}-`)
      : []

    entries.push({
      id,
      title: node.title?.trim() || 'Untitled',
      pageNumber,
      level,
      children,
    })
  }

  return entries
}

export async function loadPdfOutline(doc: PDFDocumentProxy): Promise<PdfOutlineEntry[]> {
  const raw = await doc.getOutline()
  if (!raw?.length) return []
  return mapOutlineNodes(doc, raw as PdfJsOutlineNode[], 0, '')
}

export function flattenPdfOutline(entries: readonly PdfOutlineEntry[]): PdfOutlineEntry[] {
  const flat: PdfOutlineEntry[] = []
  function walk(nodes: readonly PdfOutlineEntry[]) {
    for (const node of nodes) {
      flat.push(node)
      if (node.children.length > 0) walk(node.children)
    }
  }
  walk(entries)
  return flat
}

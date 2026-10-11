import type { PDFDocumentProxy } from 'pdfjs-dist'
import { EventBus, PDFFindController } from './pdfjsViewer'
import { PdfTextHighlighter } from './pdfTextHighlighter'

export type PdfFindMatchesCount = {
  current: number
  total: number
}

/** Minimal link service for PDFFindController in our single-page viewer. */
export class PdfViewerLinkService {
  eventBus: EventBus | null = null
  pdfDocument: PDFDocumentProxy | null = null
  currentPageNumber = 1
  onPageChange: ((page: number) => void) | null = null

  setDocument(pdfDocument: PDFDocumentProxy | null) {
    this.pdfDocument = pdfDocument
    if (pdfDocument) {
      this.currentPageNumber = Math.min(this.currentPageNumber, pdfDocument.numPages)
    }
  }

  get pagesCount(): number {
    const doc = this.pdfDocument
    if (!doc) return 0
    return doc.pagesMapper?.pagesNumber ?? doc.numPages
  }

  get page(): number {
    return this.currentPageNumber
  }

  set page(value: number) {
    const max = this.pagesCount || 1
    const next = Math.min(Math.max(1, value | 0), max)
    if (next === this.currentPageNumber) return
    this.currentPageNumber = next
    this.onPageChange?.(next)
  }
}

export class PdfFindBridge {
  readonly eventBus = new EventBus()
  readonly linkService = new PdfViewerLinkService()
  readonly findController: PDFFindController

  constructor() {
    this.linkService.eventBus = this.eventBus
    this.findController = new PDFFindController({
      linkService: this.linkService as never,
      eventBus: this.eventBus,
      delay: 180,
      updateMatchesCountOnProgress: true,
    })
  }

  setDocument(pdfDocument: PDFDocumentProxy | null) {
    this.linkService.setDocument(pdfDocument)
    if (pdfDocument) this.findController.setDocument(pdfDocument)
  }

  syncPage(page: number) {
    this.linkService.currentPageNumber = page
  }

  search(query: string) {
    this.eventBus.dispatch('find', {
      source: this,
      type: '',
      query,
      caseSensitive: false,
      entireWord: false,
      highlightAll: true,
      findPrevious: false,
      matchDiacritics: false,
    })
  }

  step(findPrevious: boolean) {
    const state = this.findController.state as
      | {
          query?: string
          caseSensitive?: boolean
          entireWord?: boolean
          highlightAll?: boolean
          matchDiacritics?: boolean
        }
      | null
    if (!state?.query) return
    this.eventBus.dispatch('find', {
      source: this,
      type: 'again',
      query: state.query,
      caseSensitive: state.caseSensitive,
      entireWord: state.entireWord,
      highlightAll: state.highlightAll,
      findPrevious,
      matchDiacritics: state.matchDiacritics,
    })
  }

  close() {
    this.eventBus.dispatch('findbarclose', { source: this })
  }

  createHighlighter(pageIndex: number) {
    return new PdfTextHighlighter({
      findController: this.findController,
      eventBus: this.eventBus,
      pageIndex,
    })
  }
}

import type { PDFPageProxy, PageViewport } from 'pdfjs-dist'
import type { PdfFindBridge } from './pdfFindBridge'
import type { PdfTextHighlighter } from './pdfTextHighlighter'
import { TextLayerBuilder } from './pdfjsViewer'

function applyPageSheetScale(pageSheet: HTMLElement, viewport: PageViewport) {
  pageSheet.style.width = `${Math.floor(viewport.width)}px`
  pageSheet.style.height = `${Math.floor(viewport.height)}px`
  pageSheet.style.setProperty('--scale-factor', String(viewport.scale))
  pageSheet.style.setProperty('--total-scale-factor', String(viewport.scale))
  pageSheet.style.setProperty('--scale-round-x', '1px')
  pageSheet.style.setProperty('--scale-round-y', '1px')
}

export class PdfTextLayerController {
  #builder: TextLayerBuilder | null = null
  #highlighter: PdfTextHighlighter | null = null
  #findBridge: PdfFindBridge | null = null
  #abortController: AbortController | null = null
  #pageNumber = 0

  setFindBridge(bridge: PdfFindBridge | null) {
    this.#findBridge = bridge
  }

  cancel() {
    this.#builder?.cancel()
    this.#builder?.div.remove()
    this.#builder = null
    this.#highlighter = null
    this.#abortController?.abort()
    this.#abortController = null
    this.#pageNumber = 0
  }

  async render(
    pdfPage: PDFPageProxy,
    pageNumber: number,
    viewport: PageViewport,
    pageSheet: HTMLElement,
  ): Promise<void> {
    applyPageSheetScale(pageSheet, viewport)

    if (!this.#builder || this.#pageNumber !== pageNumber) {
      this.cancel()
      this.#pageNumber = pageNumber
      this.#abortController = new AbortController()
      this.#highlighter = this.#findBridge?.createHighlighter(pageNumber - 1) ?? null
      this.#builder = new TextLayerBuilder({
        pdfPage,
        highlighter: this.#highlighter as never,
        abortSignal: this.#abortController.signal,
      })
      this.#builder.div.tabIndex = -1
      pageSheet.appendChild(this.#builder.div)
    }

    await this.#builder.render({ viewport, images: null as never })
  }
}

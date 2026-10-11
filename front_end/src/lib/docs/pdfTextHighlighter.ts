import type { EventBus, PDFFindController } from 'pdfjs-dist/web/pdf_viewer.mjs'

type TextDiv = HTMLElement

type TextMatchRange = {
  begin: { divIdx: number; offset: number }
  end: { divIdx: number; offset: number }
}

type PdfTextHighlighterOptions = {
  findController: PDFFindController
  eventBus: EventBus
  pageIndex: number
}

/**
 * Mirrors pdfjs-dist TextHighlighter — wraps matched text in `.highlight` spans on the text layer.
 */
export class PdfTextHighlighter {
  #eventAC: AbortController | null = null
  findController: PDFFindController
  matches: TextMatchRange[] = []
  eventBus: EventBus
  pageIdx: number
  textDivs: TextDiv[] | null = null
  textContentItemsStr: string[] | null = null
  enabled = false

  constructor({ findController, eventBus, pageIndex }: PdfTextHighlighterOptions) {
    this.findController = findController
    this.eventBus = eventBus
    this.pageIdx = pageIndex
  }

  setTextMapping(divs: TextDiv[], texts: string[]) {
    this.textDivs = divs
    this.textContentItemsStr = texts
  }

  enable() {
    if (!this.textDivs || !this.textContentItemsStr) {
      throw new Error('Text divs and strings have not been set.')
    }
    if (this.enabled) {
      throw new Error('PdfTextHighlighter is already enabled.')
    }
    this.enabled = true
    if (!this.#eventAC) {
      this.#eventAC = new AbortController()
      this.eventBus.on(
        'updatetextlayermatches',
        (evt: { pageIndex: number }) => {
          if (evt.pageIndex === this.pageIdx || evt.pageIndex === -1) {
            this.#updateMatches()
          }
        },
        { signal: this.#eventAC.signal },
      )
    }
    this.#updateMatches()
  }

  disable() {
    if (!this.enabled) return
    this.enabled = false
    this.#eventAC?.abort()
    this.#eventAC = null
    this.#updateMatches(true)
  }

  #convertMatches(matches: number[] | null, matchesLength: number[] | null): TextMatchRange[] {
    if (!matches || !matchesLength || !this.textContentItemsStr) return []

    const textContentItemsStr = this.textContentItemsStr
    let i = 0
    let iIndex = 0
    const end = textContentItemsStr.length - 1
    const result: TextMatchRange[] = []

    for (let m = 0, mm = matches.length; m < mm; m++) {
      let matchIdx = matches[m]!
      while (i !== end && matchIdx >= iIndex + textContentItemsStr[i]!.length) {
        iIndex += textContentItemsStr[i]!.length
        i++
      }
      if (i === textContentItemsStr.length) {
        console.error('Could not find a matching mapping')
      }
      const match: TextMatchRange = {
        begin: {
          divIdx: i,
          offset: matchIdx - iIndex,
        },
        end: {
          divIdx: i,
          offset: matchIdx - iIndex,
        },
      }
      matchIdx += matchesLength[m]!
      while (i !== end && matchIdx > iIndex + textContentItemsStr[i]!.length) {
        iIndex += textContentItemsStr[i]!.length
        i++
      }
      match.end = {
        divIdx: i,
        offset: matchIdx - iIndex,
      }
      result.push(match)
    }
    return result
  }

  #renderMatches(matches: TextMatchRange[]) {
    if (matches.length === 0 || !this.textDivs || !this.textContentItemsStr) return

    const { findController, pageIdx } = this
    const { textContentItemsStr, textDivs } = this
    const selected = findController.selected
    const isSelectedPage = pageIdx === selected?.pageIdx
    const selectedMatchIdx = selected?.matchIdx ?? -1
    const state = findController.state as { highlightAll?: boolean } | null
    const highlightAll = state?.highlightAll ?? false
    let prevEnd: TextMatchRange['end'] | null = null
    const infinity = { divIdx: -1, offset: undefined as number | undefined }

    const beginText = (begin: TextMatchRange['begin'], className = '') => {
      const divIdx = begin.divIdx
      textDivs[divIdx]!.textContent = ''
      return appendTextToDiv(divIdx, 0, begin.offset, className)
    }

    const appendTextToDiv = (
      divIdx: number,
      fromOffset: number,
      toOffset: number | undefined,
      className = '',
    ): HTMLElement | null => {
      let div = textDivs[divIdx]!
      if (div.nodeType === Node.TEXT_NODE) {
        const span = document.createElement('span')
        div.before(span)
        span.append(div)
        textDivs[divIdx] = span
        div = span
      }
      const content = textContentItemsStr[divIdx]!.substring(fromOffset, toOffset)
      const node = document.createTextNode(content)
      if (className) {
        const span = document.createElement('span')
        span.className = `${className} appended`
        span.append(node)
        div.append(span)
        if (className.includes('selected')) return span
        return null
      }
      div.append(node)
      return null
    }

    let i0 = selectedMatchIdx
    let i1 = i0 + 1
    if (highlightAll) {
      i0 = 0
      i1 = matches.length
    } else if (!isSelectedPage) {
      return
    }

    let lastDivIdx = -1
    let lastOffset = -1
    for (let i = i0; i < i1; i++) {
      const match = matches[i]!
      const begin = match.begin
      if (begin.divIdx === lastDivIdx && begin.offset === lastOffset) continue
      lastDivIdx = begin.divIdx
      lastOffset = begin.offset
      const end = match.end
      const isSelected = isSelectedPage && i === selectedMatchIdx
      const highlightSuffix = isSelected ? ' selected' : ''
      let selectedSpan: HTMLElement | null = null

      if (!prevEnd || begin.divIdx !== prevEnd.divIdx) {
        if (prevEnd !== null) {
          appendTextToDiv(prevEnd.divIdx, prevEnd.offset, infinity.offset)
        }
        beginText(begin)
      } else {
        appendTextToDiv(prevEnd.divIdx, prevEnd.offset, begin.offset)
      }

      if (begin.divIdx === end.divIdx) {
        selectedSpan = appendTextToDiv(
          begin.divIdx,
          begin.offset,
          end.offset,
          `highlight${highlightSuffix}`,
        )
      } else {
        selectedSpan = appendTextToDiv(
          begin.divIdx,
          begin.offset,
          infinity.offset,
          `highlight begin${highlightSuffix}`,
        )
        for (let n0 = begin.divIdx + 1, n1 = end.divIdx; n0 < n1; n0++) {
          textDivs[n0]!.className = `highlight middle${highlightSuffix}`
        }
        beginText(end, `highlight end${highlightSuffix}`)
      }
      prevEnd = end
      if (isSelected && selectedSpan) {
        findController.scrollMatchIntoView({
          element: selectedSpan,
          pageIndex: pageIdx,
          matchIndex: selectedMatchIdx,
        })
      }
    }
    if (prevEnd) {
      appendTextToDiv(prevEnd.divIdx, prevEnd.offset, infinity.offset)
    }
  }

  #updateMatches(reset = false) {
    if (!this.enabled && !reset) return
    const { findController, pageIdx } = this
    const { textContentItemsStr, textDivs } = this
    if (!textContentItemsStr || !textDivs) return

    let clearedUntilDivIdx = -1
    for (const match of this.matches) {
      const begin = Math.max(clearedUntilDivIdx, match.begin.divIdx)
      for (let n = begin, end = match.end.divIdx; n <= end; n++) {
        const div = textDivs[n]!
        div.textContent = textContentItemsStr[n]!
        div.className = ''
      }
      clearedUntilDivIdx = match.end.divIdx + 1
    }

    if (!findController.highlightMatches || reset) {
      return
    }

    const pageMatches = findController.pageMatches?.[pageIdx] ?? null
    const pageMatchesLength = findController.pageMatchesLength?.[pageIdx] ?? null
    this.matches = this.#convertMatches(pageMatches, pageMatchesLength)
    this.#renderMatches(this.matches)
  }
}

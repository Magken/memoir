export type PdfHighlightRect = {
  left: number
  top: number
  width: number
  height: number
}

export type PdfHighlightSegment = {
  text: string
  rects: PdfHighlightRect[]
}

export type PdfHighlight = {
  id: string
  pageNumber: number
  text: string
  segments: PdfHighlightSegment[]
  rects: PdfHighlightRect[]
  createdAt: number
}

export const PDF_HIGHLIGHT_LAYER_CLASS = 'theme-pdf-viewer__highlight-layer'
export const PDF_HIGHLIGHT_MARK_CLASS = 'theme-pdf-viewer__highlight-mark'

const HIGHLIGHT_TEXT_MAX = 240
const HIGHLIGHT_PANEL_LABEL_MAX = 56
const LINE_Y_TOLERANCE = 0.0035
/** Adjacent word boxes within one selection — not used for joining separate highlights. */
const RECT_GAP_TOLERANCE = 0.01
/** Separate highlights must overlap or nearly touch to join (fraction of page width). */
const HIGHLIGHT_JOIN_TOLERANCE = 0.004

function createHighlightId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `hl-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function normalizeHighlightText(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function truncateText(text: string, max: number): string {
  if (text.length <= max) return text
  return `${text.slice(0, max - 1).trimEnd()}…`
}

export function excerptHighlightText(text: string): string {
  return truncateText(normalizeHighlightText(text), HIGHLIGHT_TEXT_MAX)
}

export function compactHighlightLabel(text: string): string {
  return truncateText(normalizeHighlightText(text), HIGHLIGHT_PANEL_LABEL_MAX)
}

function sameTextLine(a: PdfHighlightRect, b: PdfHighlightRect): boolean {
  const aMid = a.top + a.height * 0.5
  const bMid = b.top + b.height * 0.5
  if (Math.abs(aMid - bMid) <= LINE_Y_TOLERANCE) return true
  return a.top < b.top + b.height && b.top < a.top + a.height
}

export function mergeRectsByLine(rects: readonly PdfHighlightRect[]): PdfHighlightRect[] {
  if (rects.length === 0) return []
  if (rects.length === 1) return [{ ...rects[0]! }]

  const sorted = [...rects].sort((a, b) => a.top - b.top || a.left - b.left)
  const lineGroups: PdfHighlightRect[][] = []

  for (const rect of sorted) {
    const group = lineGroups.find((entry) => entry.some((item) => sameTextLine(item, rect)))
    if (group) group.push(rect)
    else lineGroups.push([rect])
  }

  const merged: PdfHighlightRect[] = []

  for (const group of lineGroups) {
    const byLeft = [...group].sort((a, b) => a.left - b.left)
    let current = { ...byLeft[0]! }

    for (let index = 1; index < byLeft.length; index += 1) {
      const next = byLeft[index]!
      const currentRight = current.left + current.width
      if (next.left <= currentRight + RECT_GAP_TOLERANCE) {
        const right = Math.max(currentRight, next.left + next.width)
        const bottom = Math.max(current.top + current.height, next.top + next.height)
        current.top = Math.min(current.top, next.top)
        current.left = Math.min(current.left, next.left)
        current.width = right - current.left
        current.height = bottom - current.top
      } else {
        merged.push(current)
        current = { ...next }
      }
    }

    merged.push(current)
  }

  return merged
}

function unionLineBand(rects: readonly PdfHighlightRect[]): PdfHighlightRect {
  const left = Math.min(...rects.map((rect) => rect.left))
  const top = Math.min(...rects.map((rect) => rect.top))
  const right = Math.max(...rects.map((rect) => rect.left + rect.width))
  const bottom = Math.max(...rects.map((rect) => rect.top + rect.height))
  return {
    left,
    top,
    width: right - left,
    height: bottom - top,
  }
}

/** One bounding band per text line — used for merged highlight overlays. */
export function unionRectsByLine(rects: readonly PdfHighlightRect[]): PdfHighlightRect[] {
  if (rects.length === 0) return []
  if (rects.length === 1) return [{ ...rects[0]! }]

  const sorted = [...rects].sort((a, b) => a.top - b.top || a.left - b.left)
  const lineGroups: PdfHighlightRect[][] = []

  for (const rect of sorted) {
    const group = lineGroups.find((entry) => entry.some((item) => sameTextLine(item, rect)))
    if (group) group.push(rect)
    else lineGroups.push([rect])
  }

  return lineGroups.map((group) => unionLineBand(group))
}

export function rectsFromRange(range: Range, pageSheet: HTMLElement): PdfHighlightRect[] {
  const sheetRect = pageSheet.getBoundingClientRect()
  if (sheetRect.width <= 0 || sheetRect.height <= 0) return []

  const rects: PdfHighlightRect[] = []
  for (const clientRect of range.getClientRects()) {
    if (clientRect.width <= 0 || clientRect.height <= 0) continue
    rects.push({
      left: (clientRect.left - sheetRect.left) / sheetRect.width,
      top: (clientRect.top - sheetRect.top) / sheetRect.height,
      width: clientRect.width / sheetRect.width,
      height: clientRect.height / sheetRect.height,
    })
  }
  return mergeRectsByLine(rects)
}

function selectionWithinPageSheet(selection: Selection, pageSheet: HTMLElement): boolean {
  if (!selection.rangeCount) return false
  const range = selection.getRangeAt(0)
  const textLayer = pageSheet.querySelector('.textLayer')
  if (!textLayer) return false
  const anchor = range.commonAncestorContainer
  const node = anchor.nodeType === Node.TEXT_NODE ? anchor.parentElement : (anchor as Element)
  return Boolean(node && textLayer.contains(node))
}

export function createHighlightFromSelection(
  selection: Selection,
  pageSheet: HTMLElement,
  pageNumber: number,
): PdfHighlight | null {
  if (selection.isCollapsed || !selectionWithinPageSheet(selection, pageSheet)) return null

  const text = normalizeHighlightText(selection.toString())
  if (!text) return null

  const range = selection.getRangeAt(0)
  const rects = rectsFromRange(range, pageSheet)
  if (rects.length === 0) return null

  const excerpt = excerptHighlightText(text)
  const segments = [{ text: excerpt, rects }]

  return {
    id: createHighlightId(),
    pageNumber,
    text: excerpt,
    segments,
    rects,
    createdAt: Date.now(),
  }
}

function rectsTouchOrOverlap(
  a: PdfHighlightRect,
  b: PdfHighlightRect,
  gap = HIGHLIGHT_JOIN_TOLERANCE,
): boolean {
  return !(
    a.left + a.width + gap < b.left ||
    b.left + b.width + gap < a.left ||
    a.top + a.height + gap < b.top ||
    b.top + b.height + gap < a.top
  )
}

function highlightBands(highlight: PdfHighlight): PdfHighlightRect[] {
  return segmentsOf(highlight).flatMap((segment) => mergeRectsByLine(segment.rects))
}

function highlightsShouldMerge(a: PdfHighlight, b: PdfHighlight): boolean {
  if (a.pageNumber !== b.pageNumber) return false
  const bandsA = highlightBands(a)
  const bandsB = highlightBands(b)
  for (const rectA of bandsA) {
    for (const rectB of bandsB) {
      if (rectsTouchOrOverlap(rectA, rectB)) return true
    }
  }
  return false
}

function anchorRect(rects: readonly PdfHighlightRect[]): PdfHighlightRect {
  return [...rects].sort((a, b) => compareRectDocumentOrder(a, b))[0]!
}

function compareRectDocumentOrder(a: PdfHighlightRect, b: PdfHighlightRect): number {
  if (Math.abs(a.top - b.top) > LINE_Y_TOLERANCE) return a.top - b.top
  return a.left - b.left
}

function segmentsOf(highlight: PdfHighlight): PdfHighlightSegment[] {
  if (highlight.segments.length > 0) return highlight.segments
  const text = normalizeHighlightText(highlight.text)
  if (!text) return []
  return [{ text, rects: highlight.rects }]
}

function composeHighlightText(segments: readonly PdfHighlightSegment[]): string {
  const parts = segments.map((segment) => normalizeHighlightText(segment.text)).filter(Boolean)
  if (parts.length === 0) return ''
  return excerptHighlightText(parts.join(' '))
}

function orderHighlightSegments(segments: readonly PdfHighlightSegment[]): PdfHighlightSegment[] {
  return [...segments].sort((a, b) =>
    compareRectDocumentOrder(anchorRect(a.rects), anchorRect(b.rects)),
  )
}

export function mergeHighlightEntries(primary: PdfHighlight, secondary: PdfHighlight): PdfHighlight {
  const segments = orderHighlightSegments([...segmentsOf(primary), ...segmentsOf(secondary)])
  const rects = mergeRectsByLine(segments.flatMap((segment) => segment.rects))

  return {
    id: primary.id,
    pageNumber: primary.pageNumber,
    text: composeHighlightText(segments),
    segments,
    rects,
    createdAt: primary.createdAt,
  }
}

function mergeHighlightPair(left: PdfHighlight, right: PdfHighlight): PdfHighlight {
  const primary = left.createdAt <= right.createdAt ? left : right
  const secondary = left.createdAt <= right.createdAt ? right : left
  return mergeHighlightEntries(primary, secondary)
}

function stabilizeHighlights(entries: readonly PdfHighlight[]): PdfHighlight[] {
  let next = entries.map((entry) => {
    const segments = orderHighlightSegments(segmentsOf(entry))
    return {
      ...entry,
      segments,
      text: composeHighlightText(segments),
      rects: mergeRectsByLine(segments.flatMap((segment) => segment.rects)),
    }
  })

  let changed = true
  while (changed) {
    changed = false
    outer: for (let index = 0; index < next.length; index += 1) {
      for (let other = index + 1; other < next.length; other += 1) {
        const left = next[index]!
        const right = next[other]!
        if (!highlightsShouldMerge(left, right)) continue

        const merged = mergeHighlightPair(left, right)
        next = next.filter((_, entryIndex) => entryIndex !== index && entryIndex !== other)
        next.push(merged)
        changed = true
        break outer
      }
    }
  }

  return next.map((entry) => {
    const segments = orderHighlightSegments(segmentsOf(entry))
    return {
      ...entry,
      segments,
      text: composeHighlightText(segments),
      rects: mergeRectsByLine(segments.flatMap((segment) => segment.rects)),
    }
  })
}

export function upsertHighlight(
  highlights: readonly PdfHighlight[],
  incoming: PdfHighlight,
): { highlights: PdfHighlight[]; focusId: string } {
  const normalizedIncoming: PdfHighlight = {
    ...incoming,
    segments: orderHighlightSegments(segmentsOf(incoming)),
    text: composeHighlightText(segmentsOf(incoming)),
    rects: mergeRectsByLine(incoming.rects),
  }

  const mergeTarget = highlights.find((entry) => highlightsShouldMerge(entry, normalizedIncoming))
  const next = stabilizeHighlights([...highlights, normalizedIncoming])

  const focusEntry =
    (mergeTarget ? next.find((entry) => entry.id === mergeTarget.id) : undefined) ??
    next.find((entry) => highlightsShouldMerge(entry, normalizedIncoming)) ??
    next.find((entry) => entry.id === normalizedIncoming.id) ??
    next[next.length - 1]

  return {
    highlights: next,
    focusId: focusEntry?.id ?? normalizedIncoming.id,
  }
}

function applyHighlightRect(el: HTMLElement, rect: PdfHighlightRect) {
  el.style.setProperty('--hl-left', `${rect.left * 100}%`)
  el.style.setProperty('--hl-top', `${rect.top * 100}%`)
  el.style.setProperty('--hl-width', `${rect.width * 100}%`)
  el.style.setProperty('--hl-height', `${rect.height * 100}%`)
}

export function renderHighlightLayer(
  pageSheet: HTMLElement,
  highlights: readonly PdfHighlight[],
  activeHighlightId: string | null,
) {
  let layer = pageSheet.querySelector<HTMLElement>(`.${PDF_HIGHLIGHT_LAYER_CLASS}`)
  if (!layer) {
    layer = document.createElement('div')
    layer.className = PDF_HIGHLIGHT_LAYER_CLASS
    layer.setAttribute('aria-hidden', 'true')
    pageSheet.appendChild(layer)
  }

  layer.replaceChildren()

  for (const highlight of highlights) {
    const lineRects = mergeRectsByLine(highlight.rects)
    for (const rect of lineRects) {
      const mark = document.createElement('div')
      mark.className = [
        PDF_HIGHLIGHT_MARK_CLASS,
        highlight.id === activeHighlightId ? `${PDF_HIGHLIGHT_MARK_CLASS}--active` : '',
      ]
        .filter(Boolean)
        .join(' ')
      mark.dataset.highlightId = highlight.id
      applyHighlightRect(mark, rect)
      layer.appendChild(mark)
    }
  }
}

export function scrollHighlightMarkIntoView(
  scrollRoot: HTMLElement | null | undefined,
  pageSheet: HTMLElement,
  highlightId: string,
) {
  const mark = pageSheet.querySelector<HTMLElement>(
    `.${PDF_HIGHLIGHT_MARK_CLASS}[data-highlight-id="${highlightId}"]`,
  )
  if (!mark) return

  const viewport =
    scrollRoot?.querySelector<HTMLElement>('.theme-pdf-viewer__scroll-card .theme-scroll__viewport') ??
    scrollRoot
  if (!viewport) {
    mark.scrollIntoView({ block: 'center', behavior: 'smooth' })
    return
  }

  const markRect = mark.getBoundingClientRect()
  const viewportRect = viewport.getBoundingClientRect()
  const nextTop =
    viewport.scrollTop +
    (markRect.top - viewportRect.top) -
    viewportRect.height / 2 +
    markRect.height / 2

  viewport.scrollTo({ top: Math.max(0, nextTop), behavior: 'smooth' })
}

export function sortHighlightsByDocumentOrder(highlights: readonly PdfHighlight[]): PdfHighlight[] {
  return [...highlights].sort((a, b) => {
    if (a.pageNumber !== b.pageNumber) return a.pageNumber - b.pageNumber
    const aAnchor = anchorRect(a.rects)
    const bAnchor = anchorRect(b.rects)
    const position = compareRectDocumentOrder(aAnchor, bAnchor)
    if (position !== 0) return position
    return a.createdAt - b.createdAt
  })
}

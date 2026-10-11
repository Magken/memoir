import type { SourceLineFindHit } from './sourceLineFind'

function findTextNode(root: HTMLElement, needle: string): Text | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let node = walker.nextNode()
  while (node) {
    const text = node.textContent ?? ''
    if (text.includes(needle)) return node as Text
    node = walker.nextNode()
  }
  return null
}

/** Scroll the markdown preview pane toward a source-line find hit. */
export function revealMarkdownPreviewHit(
  previewRoot: HTMLElement | null,
  hit: SourceLineFindHit,
): void {
  if (!previewRoot) return

  const lineText = hit.preview
  const needle = lineText.slice(hit.matchStart, hit.matchEnd).trim() || lineText.trim()
  if (!needle) return

  const textNode = findTextNode(previewRoot, needle)
  if (!textNode) return

  const range = document.createRange()
  const start = textNode.textContent?.indexOf(needle) ?? -1
  if (start < 0) return
  range.setStart(textNode, start)
  range.setEnd(textNode, start + needle.length)

  const mark = document.createElement('span')
  mark.className = 'theme-search-highlight__mark theme-search-highlight__mark--active'
  try {
    range.surroundContents(mark)
    mark.scrollIntoView({ block: 'center', behavior: 'smooth' })
    window.setTimeout(() => {
      const parent = mark.parentNode
      if (!parent) return
      while (mark.firstChild) parent.insertBefore(mark.firstChild, mark)
      parent.removeChild(mark)
      parent.normalize()
    }, 900)
  } catch {
    mark.remove()
    textNode.parentElement?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }
}

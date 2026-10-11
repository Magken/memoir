/**
 * Map a markdown line range or unique search onto the DocEditor DOM and flash it.
 */
export function revealEssayRange(
  root: HTMLElement | null,
  opts: { startLine?: number; endLine?: number; search?: string; reduceMotion?: boolean },
): boolean {
  if (!root) return false
  const search = opts.search?.trim()
  const markdown = root.innerText || ''
  let needle = search || ''
  if (!needle && opts.startLine != null) {
    const lines = markdown.split('\n')
    needle = (lines[Math.max(0, opts.startLine - 1)] ?? '').trim()
  }
  if (!needle) {
    root.scrollIntoView({ block: 'start', behavior: opts.reduceMotion ? 'auto' : 'smooth' })
    return true
  }
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let node = walker.nextNode()
  while (node) {
    const text = node.textContent ?? ''
    const idx = text.indexOf(needle.slice(0, Math.min(40, needle.length)))
    if (idx >= 0) {
      const el = node.parentElement
      if (el) {
        el.scrollIntoView({ block: 'center', behavior: opts.reduceMotion ? 'auto' : 'smooth' })
        if (!opts.reduceMotion) {
          el.classList.add('is-cite-flash')
          window.setTimeout(() => el.classList.remove('is-cite-flash'), 1200)
        }
        return true
      }
    }
    node = walker.nextNode()
  }
  return false
}

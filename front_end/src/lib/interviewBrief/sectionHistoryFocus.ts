/**
 * Section undo/redo focus — find the first JSON path that changed, then scroll
 * that control into view (not the whole section root).
 */

export function diffHistoryFocusPath(
  before: unknown,
  after: unknown,
  prefix = '',
): string | null {
  if (Object.is(before, after)) return null
  if (
    before == null ||
    after == null ||
    typeof before !== 'object' ||
    typeof after !== 'object'
  ) {
    return prefix || null
  }

  if (Array.isArray(before) && Array.isArray(after)) {
    const len = Math.max(before.length, after.length)
    for (let i = 0; i < len; i += 1) {
      const path = prefix ? `${prefix}.${i}` : String(i)
      if (i >= before.length || i >= after.length) return path
      const nested = diffHistoryFocusPath(before[i], after[i], path)
      if (nested) return nested
    }
    return null
  }

  if (Array.isArray(before) || Array.isArray(after)) {
    return prefix || null
  }

  const a = before as Record<string, unknown>
  const b = after as Record<string, unknown>
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  for (const key of keys) {
    const path = prefix ? `${prefix}.${key}` : key
    if (!(key in a) || !(key in b)) return path
    const nested = diffHistoryFocusPath(a[key], b[key], path)
    if (nested) return nested
  }
  return null
}

function findOverflowScrollParent(element: HTMLElement): HTMLElement | null {
  let node: HTMLElement | null = element.parentElement
  while (node && node !== document.body) {
    const viewport = node.classList.contains('theme-scroll__viewport')
      ? node
      : (node.querySelector(':scope > .theme-scroll__viewport') as HTMLElement | null)
    const candidate = viewport ?? node
    const style = window.getComputedStyle(candidate)
    const overflowY = style.overflowY
    const canScroll =
      (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') &&
      candidate.scrollHeight > candidate.clientHeight + 1
    if (canScroll) return candidate
    node = node.parentElement
  }
  return null
}

export function resolveHistoryFocusElement(
  root: HTMLElement,
  focus: string | null | undefined,
): HTMLElement {
  if (!focus) return root
  const parts = focus.split('.')
  for (let len = parts.length; len >= 1; len -= 1) {
    const key = parts.slice(0, len).join('.')
    const match = root.querySelector(
      `[data-history-focus="${CSS.escape(key)}"]`,
    ) as HTMLElement | null
    if (match) return match
  }
  return root
}

/** Scroll the changed control to the vertical center of its scrollport / page. */
export function scrollSectionHistoryFocus(
  root: HTMLElement | null,
  focus: string | null | undefined,
): void {
  if (!root) return
  const target = resolveHistoryFocusElement(root, focus)
  const nested = findOverflowScrollParent(target)
  if (nested) {
    const nestedRect = nested.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()
    const nextTop =
      targetRect.top -
      nestedRect.top +
      nested.scrollTop -
      nested.clientHeight / 2 +
      targetRect.height / 2
    nested.scrollTo({ top: Math.max(0, nextTop), behavior: 'smooth' })
  }
  target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
  target.classList.add('is-history-focus')
  window.setTimeout(() => target.classList.remove('is-history-focus'), 900)
}

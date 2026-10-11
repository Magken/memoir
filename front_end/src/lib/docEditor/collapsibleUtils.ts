export function setDomHiddenUntilFound(dom: HTMLElement): void {
  dom.hidden = true
  dom.setAttribute('hidden', 'until-found')
}

export function domOnBeforeMatch(dom: HTMLElement, callback: () => void): void {
  dom.onbeforematch = callback
}

/** Chrome, Edge, and Firefox need div-based collapsible (details/summary bugs). */
export function useDivCollapsibleShell(): boolean {
  if (typeof navigator === 'undefined') return true
  return /Chrome|Edg|Firefox/i.test(navigator.userAgent)
}

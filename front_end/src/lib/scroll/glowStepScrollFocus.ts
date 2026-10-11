export const GLOW_STEP_SCROLL_FOCUS_DEFAULT_OFFSET = 20

export type GlowStepScrollFocusSection = {
  id: string
  element: HTMLElement
}

/** Pick the section whose top has most recently crossed the focus line (scroll-spy). */
export function glowStepScrollFocusPickActiveId(
  sections: readonly GlowStepScrollFocusSection[],
  offset: number,
  scrollRoot: HTMLElement | null,
): string | null {
  if (sections.length === 0) return null

  const rootTop = scrollRoot?.getBoundingClientRect().top ?? 0
  const focusLine = rootTop + offset

  let activeId: string | null = null

  for (const { id, element } of sections) {
    const { top, bottom } = element.getBoundingClientRect()
    if (top <= focusLine + 6 && bottom > focusLine) {
      activeId = id
    }
  }

  if (activeId) return activeId

  let closestId = sections[0].id
  let closestDistance = Infinity

  for (const { id, element } of sections) {
    const distance = Math.abs(element.getBoundingClientRect().top - focusLine)
    if (distance < closestDistance) {
      closestDistance = distance
      closestId = id
    }
  }

  return closestId
}

export function glowStepScrollFocusSections(
  items: readonly { id: string; disabled?: boolean }[],
  panelRefs: ReadonlyMap<string, HTMLElement>,
): GlowStepScrollFocusSection[] {
  return items
    .filter((item) => !item.disabled)
    .map((item) => {
      const element = panelRefs.get(item.id)
      return element ? { id: item.id, element } : null
    })
    .filter((section): section is GlowStepScrollFocusSection => section !== null)
}

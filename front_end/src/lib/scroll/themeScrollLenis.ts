import type Lenis from 'lenis'

/** Viewport → element Lenis instance (page ThemeScroll `smooth`). */
const themeScrollLenisByViewport = new WeakMap<HTMLElement, Lenis>()

export function registerThemeScrollLenis(viewport: HTMLElement, lenis: Lenis): void {
  themeScrollLenisByViewport.set(viewport, lenis)
}

export function unregisterThemeScrollLenis(viewport: HTMLElement): void {
  themeScrollLenisByViewport.delete(viewport)
}

export function getThemeScrollLenis(viewport: HTMLElement | null | undefined): Lenis | null {
  if (!viewport) return null
  return themeScrollLenisByViewport.get(viewport) ?? null
}

/** Prefer Lenis animated scroll when present. */
export function readThemeScrollTop(viewport: HTMLElement): number {
  const lenis = getThemeScrollLenis(viewport)
  return lenis?.scroll ?? viewport.scrollTop
}

export function writeThemeScrollTop(
  viewport: HTMLElement,
  top: number,
  options?: { immediate?: boolean; force?: boolean },
): void {
  const lenis = getThemeScrollLenis(viewport)
  const immediate = options?.immediate !== false
  if (lenis) {
    lenis.scrollTo(top, { immediate, force: options?.force === true || lenis.isStopped })
    return
  }
  viewport.scrollTop = top
}

/**
 * Soft freeze for element-Lenis shells that stay mounted (Dashboard / Interview).
 * SceneMenuShell peels instead tear Lenis down (`smooth={false}`) and pin native
 * scrollTop — never call `lenis.stop()` across a peel (desync → post-close teleport).
 */
export function freezeThemeScroll(
  viewport: HTMLElement,
  options?: { toTop?: boolean; lockTop?: number },
): () => void {
  const lenis = getThemeScrollLenis(viewport)
  const lockedTop = Math.max(
    0,
    options?.lockTop ?? (options?.toTop ? 0 : readThemeScrollTop(viewport)),
  )

  if (lenis) {
    lenis.scrollTo(lockedTop, { immediate: true, force: true })
    // Prefer destroy-via-smooth toggle on peels; stop() only for short bootstrap locks.
    lenis.stop()
  } else {
    viewport.scrollTop = lockedTop
  }

  const freeze = () => {
    if (Math.abs(viewport.scrollTop - lockedTop) < 0.5) return
    viewport.scrollTop = lockedTop
  }
  viewport.addEventListener('scroll', freeze)
  freeze()

  return () => {
    viewport.removeEventListener('scroll', freeze)
    viewport.scrollTop = lockedTop
    if (lenis) {
      lenis.scrollTo(lockedTop, { immediate: true, force: true })
      lenis.start()
    }
  }
}

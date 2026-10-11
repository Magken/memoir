/** Visited LCL steps only. Unopened paragraph links are not crumbs. */

export type LclCrumb = {
  label: string
  depth: number
  current: boolean
}

export type LclCrumbsForPathOptions = {
  /**
   * When the path is empty, still return the root as the current crumb.
   * Product About Home uses this so the head is breadcrumb-only (no title).
   * Toolkit preview keeps the default: empty path → no trail yet.
   */
  rootWhenEmpty?: boolean
}

export function lclCrumbsForPath(
  path: readonly string[],
  rootLabel: string,
  options?: LclCrumbsForPathOptions,
): LclCrumb[] {
  if (path.length === 0) {
    if (options?.rootWhenEmpty) {
      return [{ label: rootLabel, depth: 0, current: true }]
    }
    return []
  }
  return [
    { label: rootLabel, depth: 0, current: false },
    ...path.map((label, index) => ({
      label,
      depth: index + 1,
      current: index === path.length - 1,
    })),
  ]
}

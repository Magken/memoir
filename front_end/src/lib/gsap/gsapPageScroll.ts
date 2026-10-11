/** Convert scroll pixels to viewport-height units from page start. */
export function scrollVphFromStart(px: number, viewportHeight: number): number {
  if (viewportHeight <= 0) return 0
  return px / viewportHeight
}

/** Per-row enter — no stagger. Illustration fan is exclusive, not always-open. */
export const OFFER_VISUAL_ENTER_START = 'top 88%'

type OfferDesktopLayoutInput = {
  alwaysExpanded: boolean
  suppressMobileExpand: boolean
  fineHover: boolean
  compactViewport: boolean
}

/** Desktop offer: exclusive illustration fan + hover copy expand. Compact/touch stays collapsed. */
export function offerDesktopLayoutOpen({
  alwaysExpanded,
  suppressMobileExpand,
  fineHover,
  compactViewport,
}: OfferDesktopLayoutInput): boolean {
  if (!alwaysExpanded) return false
  if (!suppressMobileExpand) return true
  return fineHover && !compactViewport
}

type CopyRatioEntry = {
  id: string
  ratio: number
}

/**
 * One offer body at a time — the most-visible row.
 * `currentId` holds until another row beats it by `hold` (avoids flicker).
 */
export function pickExclusiveCopyId(
  entries: readonly CopyRatioEntry[],
  currentId: string | null = null,
  hold = 0.08,
): string | null {
  let bestId: string | null = null
  let best = 0
  for (const entry of entries) {
    if (entry.ratio > best) {
      best = entry.ratio
      bestId = entry.id
    }
  }
  if (best <= 0 || !bestId) return null
  if (currentId && currentId !== bestId) {
    const currentRatio = entries.find((entry) => entry.id === currentId)?.ratio ?? 0
    if (best - currentRatio < hold) return currentId
  }
  return bestId
}

/**
 * Illustration fan — hover wins; otherwise the exclusive copy row.
 * Never “all rows active” (that skips the expand transition).
 */
export function pickExclusiveFanId(
  hoverId: string | null,
  exclusiveCopyId: string | null,
): string | null {
  return hoverId ?? exclusiveCopyId
}

type FollowProgressEntry<T> = {
  visual: T
  progress: number
}

/** One deck follows scroll tilt — the row whose progress is closest to mid-viewport. */
export function pickExclusiveFollowVisual<T>(
  entries: readonly FollowProgressEntry<T>[],
): T | null {
  if (entries.length === 0) return null
  let best = entries[0]!
  let bestDist = Math.abs(best.progress - 0.5)
  for (let i = 1; i < entries.length; i += 1) {
    const entry = entries[i]!
    const dist = Math.abs(entry.progress - 0.5)
    if (dist < bestDist) {
      best = entry
      bestDist = dist
    }
  }
  return best.visual
}

/** Hover stills — hold each timestamp WebP before advancing. */
export const OFFER_FRAME_HOLD_MS = 800

type TimedPreviewImage = {
  kind?: 'image' | 'video'
  frames?: readonly string[]
}

/** Mid card has a timed preview — looping video or 2+ timestamp stills. */
export function midHasTimedPreview(image: TimedPreviewImage | null | undefined): boolean {
  if (!image) return false
  if (image.kind === 'video') return true
  return (image.frames?.length ?? 0) > 1
}

/** Next still in a timestamp loop. Count ≤ 1 stays on 0. */
export function nextOfferFrameIndex(index: number, count: number): number {
  if (count <= 1) return 0
  return (index + 1) % count
}

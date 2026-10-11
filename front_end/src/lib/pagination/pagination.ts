export type PageRangeItem = number | 'ellipsis'

export function getPageRange(
  current: number,
  total: number,
  siblingCount = 1,
): PageRangeItem[] {
  if (total < 1) return []
  if (total === 1) return [1]

  const totalNumbers = siblingCount * 2 + 5

  if (total <= totalNumbers) {
    return Array.from({ length: total }, (_, index) => index + 1)
  }

  const leftSiblingIndex = Math.max(current - siblingCount, 1)
  const rightSiblingIndex = Math.min(current + siblingCount, total)

  const showLeftEllipsis = leftSiblingIndex > 2
  const showRightEllipsis = rightSiblingIndex < total - 1

  if (!showLeftEllipsis && showRightEllipsis) {
    const leftItemCount = 3 + 2 * siblingCount
    const leftRange = Array.from({ length: leftItemCount }, (_, index) => index + 1)
    return [...leftRange, 'ellipsis', total]
  }

  if (showLeftEllipsis && !showRightEllipsis) {
    const rightItemCount = 3 + 2 * siblingCount
    const rightRange = Array.from(
      { length: rightItemCount },
      (_, index) => total - rightItemCount + index + 1,
    )
    return [1, 'ellipsis', ...rightRange]
  }

  if (showLeftEllipsis && showRightEllipsis) {
    const middleRange = Array.from(
      { length: rightSiblingIndex - leftSiblingIndex + 1 },
      (_, index) => leftSiblingIndex + index,
    )
    return [1, 'ellipsis', ...middleRange, 'ellipsis', total]
  }

  return Array.from({ length: total }, (_, index) => index + 1)
}

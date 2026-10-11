export function clampFindIndex(index: number, matchCount: number): number {
  if (matchCount <= 0) return 0
  return ((index % matchCount) + matchCount) % matchCount
}

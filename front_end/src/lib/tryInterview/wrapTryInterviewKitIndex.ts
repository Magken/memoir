/** Wrap a kit index. Count is `TRY_INTERVIEW_KITS.length` at the call site. */
export function wrapTryInterviewKitIndex(index: number, count: number): number {
  if (count <= 0) return 0
  return ((index % count) + count) % count
}

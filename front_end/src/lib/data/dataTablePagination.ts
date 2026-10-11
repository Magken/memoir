/** Slice helpers for [DataTable](../../components/DataTable.tsx) footer pagination. */

export function dataTablePageCount(rowCount: number, pageSize: number): number {
  if (pageSize < 1) return 1
  return Math.max(1, Math.ceil(rowCount / pageSize))
}

export function clampDataTablePage(page: number, totalPages: number): number {
  const safeTotal = Math.max(1, totalPages)
  return Math.min(Math.max(1, page), safeTotal)
}

export function dataTablePageSlice<T>(rows: readonly T[], page: number, pageSize: number): T[] {
  if (pageSize < 1) return [...rows]
  const start = (page - 1) * pageSize
  return rows.slice(start, start + pageSize)
}

export function dataTablePageRange(
  rowCount: number,
  page: number,
  pageSize: number,
): { start: number; end: number } {
  if (rowCount < 1 || pageSize < 1) return { start: 0, end: 0 }
  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, rowCount)
  return { start, end }
}

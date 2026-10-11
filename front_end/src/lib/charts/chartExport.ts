import type { EChartsOption } from 'echarts'

/**
 * Best-effort CSV extraction from an ECharts `option`, covering the common
 * shapes used in this repo: pie/funnel (name,value), category-aligned series,
 * heatmap (x,y,value), scatter (series,x,y), and index-aligned [x,y] pairs
 * (time/line). Falls back to JSON for anything it can't flatten.
 */

type Cell = string | number
type Row = Cell[]

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (Array.isArray(value)) return value
  return value == null ? [] : [value]
}

function escapeCell(value: unknown): string {
  const s = value == null ? '' : String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function rowsToCsv(rows: Row[]): string {
  return rows.map((row) => row.map(escapeCell).join(',')).join('\n')
}

function formatX(x: unknown): Cell {
  if (typeof x === 'number' && x > 1e11) return new Date(x).toISOString()
  return x as Cell
}

function cellOf(datum: unknown): Cell {
  if (datum == null) return ''
  if (Array.isArray(datum)) return datum.join('|')
  if (typeof datum === 'object') {
    const value = (datum as { value?: unknown }).value
    return value == null ? JSON.stringify(datum) : (value as Cell)
  }
  return datum as Cell
}

function seriesName(s: { name?: string }, i: number): string {
  return s.name ?? `series ${i + 1}`
}

export function chartOptionToCsv(option: EChartsOption): string {
  const series = asArray(option.series) as Array<{ type?: string; name?: string; data?: unknown }>
  if (series.length === 0) return ''
  const first = series[0]

  if (first?.type === 'pie' || first?.type === 'funnel') {
    const rows: Row[] = [['name', 'value']]
    asArray(first.data).forEach((d) => {
      if (d && typeof d === 'object') {
        const obj = d as { name?: string; value?: Cell }
        rows.push([obj.name ?? '', obj.value ?? ''])
      } else {
        rows.push(['', d as Cell])
      }
    })
    return rowsToCsv(rows)
  }

  if (first?.type === 'heatmap') {
    const rows: Row[] = [['x', 'y', 'value']]
    asArray(first.data).forEach((d) => {
      const tuple = d as Cell[]
      rows.push([tuple[0], tuple[1], tuple[2]])
    })
    return rowsToCsv(rows)
  }

  if (series.some((s) => s.type === 'scatter')) {
    const rows: Row[] = [['series', 'x', 'y']]
    series.forEach((s, i) => {
      asArray(s.data).forEach((d) => {
        const tuple = d as Cell[]
        rows.push([seriesName(s, i), tuple[0], tuple[1]])
      })
    })
    return rowsToCsv(rows)
  }

  const xAxis = asArray(option.xAxis)[0] as { data?: Cell[] } | undefined
  const categories = xAxis?.data
  if (categories) {
    const header: Row = ['category', ...series.map(seriesName)]
    const rows: Row[] = [header]
    categories.forEach((cat, i) => {
      rows.push([cat, ...series.map((s) => cellOf(asArray(s.data)[i]))])
    })
    return rowsToCsv(rows)
  }

  const len = Math.max(...series.map((s) => asArray(s.data).length))
  if (Number.isFinite(len) && len > 0) {
    const header: Row = ['x', ...series.map(seriesName)]
    const rows: Row[] = [header]
    for (let i = 0; i < len; i++) {
      const firstDatum = asArray(first.data)[i]
      const x = Array.isArray(firstDatum) ? firstDatum[0] : i
      rows.push([
        formatX(x),
        ...series.map((s) => {
          const d = asArray(s.data)[i]
          return Array.isArray(d) ? (d[1] as Cell) : cellOf(d)
        }),
      ])
    }
    return rowsToCsv(rows)
  }

  return JSON.stringify(series, null, 2)
}

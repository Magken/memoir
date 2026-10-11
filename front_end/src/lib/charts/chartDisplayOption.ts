import type { EChartsOption } from 'echarts'
import { chartPaletteById, type ChartTheme } from './chartTheme'

export type ChartLegendPosition = 'top' | 'right' | 'bottom' | 'left'

export type BuildChartDisplayOptionParams = {
  option: EChartsOption
  t: ChartTheme
  paletteId: string
  showLegend: boolean
  showLegendControl?: boolean
  chartTitle?: boolean
  title?: string
  legendPosition?: ChartLegendPosition
  xAxisLabelRotate?: number
}

function num(value: unknown, fallback: number): number {
  return typeof value === 'number' ? value : fallback
}

function legendPlacement(pos: ChartLegendPosition, showTitle: boolean) {
  switch (pos) {
    case 'top':
      return { orient: 'horizontal' as const, left: 'center' as const, top: showTitle ? 30 : 6 }
    case 'bottom':
      return { orient: 'horizontal' as const, left: 'center' as const, bottom: 6 }
    case 'left':
      return { orient: 'vertical' as const, left: 6, top: 'middle' as const }
    case 'right':
      return { orient: 'vertical' as const, right: 6, top: 'middle' as const }
  }
}

/** Merge panel/embed props into a themed ECharts option (legend, grid, palette, axes). */
export function buildChartDisplayOption({
  option,
  t,
  paletteId,
  showLegend,
  showLegendControl = true,
  chartTitle = false,
  title = '',
  legendPosition = 'bottom',
  xAxisLabelRotate = 0,
}: BuildChartDisplayOptionParams): EChartsOption {
  const next: EChartsOption = { ...option }
  const legendOn = showLegendControl && showLegend
  const showTitle = chartTitle

  next.color = chartPaletteById(paletteId, t)

  next.title = showTitle
    ? {
        text: title,
        left: 'center',
        top: 6,
        textStyle: { color: t.text, fontSize: 14, fontWeight: 600 },
        ...(typeof option.title === 'object' && !Array.isArray(option.title) ? option.title : {}),
      }
    : undefined

  if (legendOn) {
    const baseLegend = (Array.isArray(option.legend) ? option.legend[0] : option.legend) ?? {}
    next.legend = {
      type: 'scroll',
      ...baseLegend,
      show: true,
      textStyle: { color: t.textMuted, ...(baseLegend.textStyle ?? {}) },
      pageTextStyle: { color: t.textMuted },
      pageIconColor: t.text,
      pageIconInactiveColor: t.border,
      ...legendPlacement(legendPosition, showTitle),
    }
  } else {
    next.legend = { show: false }
  }

  if (xAxisLabelRotate && option.xAxis) {
    const applyRotate = (axis: Record<string, unknown>) => ({
      ...axis,
      axisLabel: {
        ...((axis.axisLabel as object) ?? {}),
        rotate: xAxisLabelRotate,
        hideOverlap: true,
      },
    })
    next.xAxis = Array.isArray(option.xAxis)
      ? option.xAxis.map((a) => applyRotate(a as Record<string, unknown>))
      : applyRotate(option.xAxis as Record<string, unknown>)
  }

  const hasCartesian = Boolean(option.grid || option.xAxis || option.yAxis)
  if (hasCartesian) {
    const baseGrid = (Array.isArray(option.grid) ? option.grid[0] : option.grid) ?? {}
    let top = num(baseGrid.top, 16)
    let right = num(baseGrid.right, 16)
    let bottom = num(baseGrid.bottom, 28)
    let left = num(baseGrid.left, 40)

    if (showTitle) top = Math.max(top, 40)
    if (xAxisLabelRotate) bottom = Math.max(bottom, 64)
    if (legendOn) {
      if (legendPosition === 'top') top = Math.max(top, showTitle ? 64 : 44)
      if (legendPosition === 'bottom') bottom = Math.max(bottom, 48)
      if (legendPosition === 'left') left = Math.max(left, 100)
      if (legendPosition === 'right') right = Math.max(right, 100)
    }

    next.grid = { containLabel: true, ...baseGrid, top, right, bottom, left }
  }

  return next
}

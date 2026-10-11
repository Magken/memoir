import { useEffect, useMemo, useRef, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption, EChartsType } from 'echarts'
import { echartsTooltip, useChartTheme } from '../lib/charts/chartTheme'

type EChartProps = {
  /** ECharts option object (axes, series, etc.). */
  option: EChartsOption
  /** Pixel height of the canvas (width is responsive). */
  height?: number
  /** Show a loading veil. */
  loading?: boolean
  /** Receives the ECharts instance once ready (e.g. for PNG export). */
  onReady?: (chart: EChartsType) => void
  onEvents?: Record<string, (params: unknown) => void>
  /** Prefer `svg` when labels must paint past the chart box (`overflow: visible`). */
  renderer?: 'canvas' | 'svg'
  /**
   * Keep a sized slot until the chart is near the viewport. Off-screen Results
   * radars / cadence plots must not all init ECharts on first paint.
   */
  deferUntilVisible?: boolean
  className?: string
  debug?: boolean
}

/**
 * Theme-aware Apache ECharts wrapper. Injects the live theme palette, transparent
 * background, themed text + tooltip; pass `option` for axes/series specifics
 * (use the `echarts*` helpers in chartTheme for on-theme axes).
 */
export function EChart({
  option,
  height = 288,
  loading = false,
  onReady,
  onEvents,
  renderer = 'canvas',
  deferUntilVisible = false,
  className = '',
  debug = false,
}: EChartProps) {
  const theme = useChartTheme()
  const hostRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(!deferUntilVisible)

  useEffect(() => {
    if (!deferUntilVisible || visible) return
    const el = hostRef.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        setVisible(true)
        io.disconnect()
      },
      { root: null, rootMargin: '160px 0px', threshold: 0 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [deferUntilVisible, visible])

  const themedOption = useMemo<EChartsOption>(
    () => ({
      color: theme.palette,
      backgroundColor: 'transparent',
      textStyle: { color: theme.text, fontFamily: 'inherit' },
      ...option,
      tooltip: { ...echartsTooltip(theme), ...(option.tooltip as object) },
    }),
    [option, theme],
  )

  if (debug) {
    console.debug('[EChart]', { height, palette: theme.palette, renderer, visible })
  }

  if (!visible) {
    return (
      <div
        ref={hostRef}
        className={className}
        aria-hidden
        style={{ height, width: '100%' }}
      />
    )
  }

  return (
    <div ref={hostRef} className={className}>
      <ReactECharts
        option={themedOption}
        showLoading={loading}
        style={{ height, width: '100%', overflow: 'visible' }}
        opts={{ renderer }}
        onChartReady={onReady}
        onEvents={onEvents}
        notMerge
      />
    </div>
  )
}

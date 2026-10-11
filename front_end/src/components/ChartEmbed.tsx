import { useMemo, useState } from 'react'
import type { EChartsOption } from 'echarts'
import {
  buildChartDisplayOption,
  type ChartLegendPosition,
} from '../lib/charts/chartDisplayOption'
import { chartPaletteMenuItems, useChartTheme } from '../lib/charts/chartTheme'
import { EChart } from './EChart'
import { NanoStackedMenu } from './NanoStackedMenu'

type ChartEmbedProps = {
  /** Base ECharts option — legend/grid/palette merged like [ChartPanel](ChartPanel.tsx). */
  option: EChartsOption
  height?: number
  title?: string
  subtitle?: string
  /** Horizontal nano palette rail beside the title. */
  paletteControl?: boolean
  paletteId?: string
  onPaletteChange?: (id: string) => void
  legend?: boolean
  legendPosition?: ChartLegendPosition
  chartTitle?: boolean
  showLegendControl?: boolean
  xAxisLabelRotate?: number
  deferUntilVisible?: boolean
  onEvents?: Record<string, (params: unknown) => void>
  className?: string
  debug?: boolean
}

/**
 * Clean ECharts embed — no window chrome, overlay, or download toolbar.
 * Drop inside [Card](Card.tsx) or any surface; optional title row + nano palette rail.
 */
export function ChartEmbed({
  option,
  height = 240,
  title,
  subtitle,
  paletteControl = false,
  paletteId: paletteIdProp,
  onPaletteChange,
  legend = true,
  legendPosition = 'bottom',
  chartTitle = false,
  showLegendControl = true,
  xAxisLabelRotate = 0,
  deferUntilVisible = false,
  onEvents,
  className = '',
  debug = false,
}: ChartEmbedProps) {
  const t = useChartTheme()
  const [internalPaletteId, setInternalPaletteId] = useState('theme')
  const paletteId = paletteIdProp ?? internalPaletteId
  const setPaletteId = onPaletteChange ?? setInternalPaletteId

  const paletteItems = useMemo(() => chartPaletteMenuItems(t), [t])

  const displayOption = useMemo(
    () =>
      buildChartDisplayOption({
        option,
        t,
        paletteId,
        showLegend: legend,
        showLegendControl,
        chartTitle,
        title: title ?? '',
        legendPosition,
        xAxisLabelRotate,
      }),
    [
      option,
      t,
      paletteId,
      legend,
      showLegendControl,
      chartTitle,
      title,
      legendPosition,
      xAxisLabelRotate,
    ],
  )

  const showHeader = Boolean(title || subtitle || paletteControl)

  if (debug) {
    console.debug('[ChartEmbed]', { paletteId, legend, height })
  }

  return (
    <div className={['min-w-0', className].filter(Boolean).join(' ')}>
      {showHeader ? (
        <div className="mb-3 flex items-start justify-between gap-3">
          {title || subtitle ? (
            <span className="min-w-0">
              {title ? <span className="type-h5 block truncate">{title}</span> : null}
              {subtitle ? <span className="type-caption type-muted block">{subtitle}</span> : null}
            </span>
          ) : null}
          {paletteControl ? (
            <div className="theme-nmenu-dock theme-nmenu-dock--horizontal shrink-0">
              <NanoStackedMenu
                label="Chart palette"
                orientation="horizontal"
                items={paletteItems}
                selectedId={paletteId}
                onSelect={setPaletteId}
                menuScale={0.85}
              />
            </div>
          ) : null}
        </div>
      ) : null}
      <EChart
        option={displayOption}
        height={height}
        deferUntilVisible={deferUntilVisible}
        onEvents={onEvents}
        debug={debug}
      />
    </div>
  )
}

export type { ChartLegendPosition }

import { useEffect, useMemo, useRef, useState } from 'react'
import type { EChartsOption, EChartsType } from 'echarts'
import { Download, Settings2, Table } from 'lucide-react'
import gsap, { useGSAP } from '../lib/gsap'
import { buildChartDisplayOption, type ChartLegendPosition } from '../lib/charts/chartDisplayOption'
import { chartPaletteMenuItems, useChartTheme } from '../lib/charts/chartTheme'
import { chartOptionToCsv } from '../lib/charts/chartExport'
import { EChart } from './EChart'
import { IconButton } from './IconButton'
import { Switch } from './Switch'
import { Tooltip } from './Tooltip'
import { NanoStackedMenu } from './NanoStackedMenu'

type ChartPanelProps = {
  title: string
  subtitle?: string
  /** Title typography — default `type-h5`. */
  titleClassName?: string
  /** Library tag in the title bar (hidden by default). */
  badge?: string
  /** Base ECharts option — axes/series/tooltip/dataZoom. The panel injects legend/title/color + grid room. */
  option: EChartsOption
  height?: number
  /** Legend visible initially (toggled in the settings menu). */
  legend?: boolean
  /** Legend placement (prop only — defaults to bottom). */
  legendPosition?: ChartLegendPosition
  /** Show an in-chart title (prop only — the header already names the chart). */
  chartTitle?: boolean
  /** Hide the legend toggle in the settings menu (single-series charts). */
  showLegendControl?: boolean
  /** Slant x-axis labels by N degrees to avoid clipping long text/dates. */
  xAxisLabelRotate?: number
  className?: string
  debug?: boolean
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'chart'
}

function triggerDownload(href: string, filename: string) {
  const link = document.createElement('a')
  link.href = href
  link.download = filename
  link.click()
}

/**
 * Unified ECharts "chart window" — title bar (title/subtitle/badge + CSV/PNG
 * download) with a gear that reveals a GSAP-animated settings overlay covering
 * the whole chart area (tints the chart behind it). The overlay holds the basics:
 * legend on/off + a nano palette rail. Pass a base `option`; the panel
 * injects legend/title/color + grid room so every chart shares one shell.
 */
export function ChartPanel({
  title,
  subtitle,
  titleClassName = 'type-h5 block truncate',
  badge,
  option,
  height = 300,
  legend = true,
  legendPosition = 'bottom',
  chartTitle = false,
  showLegendControl = true,
  xAxisLabelRotate = 0,
  className = '',
  debug = false,
}: ChartPanelProps) {
  const t = useChartTheme()
  const chartRef = useRef<EChartsType | null>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const gearRef = useRef<HTMLSpanElement>(null)
  const tlRef = useRef<gsap.core.Timeline | null>(null)

  const [open, setOpen] = useState(false)
  const [showLegend, setShowLegend] = useState(legend)
  const [paletteId, setPaletteId] = useState('theme')

  const paletteItems = useMemo(() => chartPaletteMenuItems(t), [t])

  useGSAP(
    () => {
      const overlay = overlayRef.current
      if (!overlay) return
      const card = overlay.querySelector('[data-chart-menu]')
      const rows = overlay.querySelectorAll('[data-chart-menu-row]')
      const reduce =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const d = reduce ? 0.001 : 1

      gsap.set(overlay, { autoAlpha: 0 })
      const tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } })
      tl.to(overlay, { autoAlpha: 1, duration: 0.2 * d })
      if (gearRef.current) tl.to(gearRef.current, { rotate: 90, duration: 0.26 * d }, 0)
      if (card)
        tl.fromTo(
          card,
          { y: 10, scale: 0.98, autoAlpha: 0 },
          { y: 0, scale: 1, autoAlpha: 1, duration: 0.26 * d },
          '-=0.1',
        )
      tl.fromTo(
        rows,
        { autoAlpha: 0, y: 8 },
        { autoAlpha: 1, y: 0, stagger: reduce ? 0 : 0.06, duration: 0.22 * d },
        '-=0.12',
      )
      tlRef.current = tl
    },
    { scope: bodyRef },
  )

  useEffect(() => {
    const tl = tlRef.current
    if (!tl) return
    if (open) tl.play()
    else tl.reverse()
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const displayOption = useMemo(
    () =>
      buildChartDisplayOption({
        option,
        t,
        paletteId,
        showLegend,
        showLegendControl,
        chartTitle,
        title,
        legendPosition,
        xAxisLabelRotate,
      }),
    [
      option,
      t,
      paletteId,
      showLegend,
      showLegendControl,
      chartTitle,
      title,
      legendPosition,
      xAxisLabelRotate,
    ],
  )

  function handleDownloadImage() {
    const chart = chartRef.current
    if (!chart) return
    const url = chart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: t.surface })
    triggerDownload(url, `${slugify(title)}.png`)
  }

  function handleDownloadData() {
    const csv = chartOptionToCsv(option)
    if (!csv) return
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    triggerDownload(url, `${slugify(title)}.csv`)
    URL.revokeObjectURL(url)
  }

  if (debug) {
    console.debug('[ChartPanel]', { title, open, showLegend, paletteId })
  }

  return (
    <figure
      className={[
        'relative flex flex-col rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)]',
        open ? 'z-30' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <figcaption className="flex items-start justify-between gap-3 border-b border-[var(--theme-border)] px-4 py-2.5">
        <span className="min-w-0">
          <span className={titleClassName}>{title}</span>
          {subtitle ? <span className="type-caption type-muted block">{subtitle}</span> : null}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {badge ? (
            <span className="type-caption font-mono rounded border border-[var(--theme-border)] px-2 py-0.5 type-faint">
              {badge}
            </span>
          ) : null}
          <Tooltip content="Download CSV">
            <IconButton
              icon={Table}
              aria-label="Download data as CSV"
              size="xs"
              variant="ghost"
              className="[&_svg]:size-4"
              onClick={handleDownloadData}
            />
          </Tooltip>
          <Tooltip content="Download PNG">
            <IconButton
              icon={Download}
              aria-label="Download chart as PNG"
              size="xs"
              variant="ghost"
              className="[&_svg]:size-4"
              onClick={handleDownloadImage}
            />
          </Tooltip>
          <Tooltip content="Chart settings">
            <span ref={gearRef} className="inline-flex">
              <IconButton
                icon={Settings2}
                aria-label="Chart settings"
                aria-pressed={open}
                size="xs"
                variant="ghost"
                className="[&_svg]:size-4"
                active={open}
                onClick={() => setOpen((v) => !v)}
              />
            </span>
          </Tooltip>
        </span>
      </figcaption>

      <div ref={bodyRef} className="relative p-4">
        <EChart
          option={displayOption}
          height={height}
          onReady={(chart) => {
            chartRef.current = chart
          }}
          debug={debug}
        />

        <div
          ref={overlayRef}
          role="dialog"
          aria-label="Chart settings"
          aria-hidden={!open}
          className="absolute inset-0 z-20"
        >
          <button
            type="button"
            aria-label="Close settings"
            tabIndex={open ? 0 : -1}
            onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-default bg-[color-mix(in_srgb,var(--theme-surface)_72%,transparent)] backdrop-blur-[2px]"
          />
          <div
            data-chart-menu
            className="theme-chart-panel__settings absolute inset-3"
          >
            <span className="type-overline">Chart settings</span>
            <div className="theme-chart-panel__settings-body">
              {showLegendControl ? (
                <div data-chart-menu-row className="theme-chart-panel__settings-row">
                  <span className="type-label theme-chart-panel__settings-label">Legend</span>
                  <div className="theme-chart-panel__settings-control">
                    <Switch size="xs" checked={showLegend} onChange={setShowLegend} />
                  </div>
                </div>
              ) : null}
              <div data-chart-menu-row className="theme-chart-panel__settings-row">
                <span className="type-label theme-chart-panel__settings-label">Color palette</span>
                <div className="theme-chart-panel__settings-control">
                  <div className="theme-nmenu-dock theme-nmenu-dock--horizontal">
                    <NanoStackedMenu
                      label="Chart palette"
                      orientation="horizontal"
                      items={paletteItems}
                      selectedId={paletteId}
                      onSelect={setPaletteId}
                      menuScale={0.85}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </figure>
  )
}

export type { ChartLegendPosition }

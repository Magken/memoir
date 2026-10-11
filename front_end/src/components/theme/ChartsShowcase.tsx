import { useMemo } from 'react'
import { ResponsiveBar } from '@nivo/bar'
import { ResponsiveLine } from '@nivo/line'
import { ResponsivePie } from '@nivo/pie'
import { ResponsiveRadar } from '@nivo/radar'
import type { EChartsOption } from 'echarts'
import { ChartCard } from '../ChartCard'
import { ChartEmbed } from '../ChartEmbed'
import { ChartPanel } from '../ChartPanel'
import { Card } from '../Card'
import {
  echartsAxisLabel,
  echartsAxisLine,
  echartsAxisName,
  echartsSplitLine,
  nivoChartTheme,
  useChartTheme,
} from '../../lib/charts/chartTheme'

/* ---- demo data (showcase-local) ----------------------------------------- */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']

const REVENUE = MONTHS.map((month, i) => ({
  month,
  desktop: [4200, 3800, 5100, 4700, 6100, 7200][i],
  mobile: [2400, 3100, 2800, 3600, 4200, 4800][i],
}))

const STACK = MONTHS.map((month, i) => ({
  month,
  desktop: [4200, 3800, 5100, 4700, 6100, 7200][i],
  mobile: [2400, 3100, 2800, 3600, 4200, 4800][i],
  tablet: [900, 1100, 1000, 1250, 1400, 1600][i],
}))

const NIVO_LINE = [
  { id: 'Desktop', data: REVENUE.map((d) => ({ x: d.month, y: d.desktop })) },
  { id: 'Mobile', data: REVENUE.map((d) => ({ x: d.month, y: d.mobile })) },
]

const TRAFFIC = [
  { id: 'Organic', label: 'Organic', value: 38 },
  { id: 'Direct', label: 'Direct', value: 24 },
  { id: 'Referral', label: 'Referral', value: 18 },
  { id: 'Social', label: 'Social', value: 12 },
  { id: 'Email', label: 'Email', value: 8 },
]

const RADAR = [
  { axis: 'Speed', A: 88, B: 64 },
  { axis: 'Reliability', A: 72, B: 81 },
  { axis: 'Comfort', A: 60, B: 90 },
  { axis: 'Safety', A: 95, B: 78 },
  { axis: 'Efficiency', A: 70, B: 85 },
  { axis: 'Price', A: 55, B: 72 },
]

/** Boxplot rows: [min, Q1, median, Q3, max]. */
const LATENCY = [
  { name: 'API', data: [20, 42, 55, 68, 96] },
  { name: 'Web', data: [12, 28, 40, 52, 74] },
  { name: 'Database', data: [30, 55, 70, 88, 120] },
  { name: 'Cache', data: [5, 10, 14, 19, 28] },
]

const REGIONS = [
  'North America',
  'South America',
  'Europe',
  'Asia Pacific',
  'Middle East & Africa',
]
const REGION_VALUES = [820, 540, 710, 930, 360]

const HEAT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HEAT_HOURS = ['0h', '4h', '8h', '12h', '16h', '20h']

function makeCluster(n: number, cx: number, cy: number, spread: number): [number, number][] {
  const out: [number, number][] = []
  for (let i = 0; i < n; i++) {
    out.push([
      Math.round((cx + (Math.random() - 0.5) * spread) * 10) / 10,
      Math.round((cy + (Math.random() - 0.5) * spread) * 10) / 10,
    ])
  }
  return out
}

/** ~2,000-point series to exercise ECharts canvas + dataZoom. */
function makeLargeSeries(count: number) {
  const base = Date.UTC(2024, 0, 1)
  const out: [number, number][] = []
  let value = 120
  for (let i = 0; i < count; i++) {
    value += (Math.random() - 0.5) * 8 + Math.sin(i / 28) * 1.6
    out.push([base + i * 3_600_000, Math.round(value * 100) / 100])
  }
  return out
}

export function ChartsShowcase() {
  const t = useChartTheme()
  const nivoTheme = useMemo(() => nivoChartTheme(t), [t])

  const largeData = useMemo(() => makeLargeSeries(2000), [])
  const scatterA = useMemo(() => makeCluster(60, 40, 55, 40), [])
  const scatterB = useMemo(() => makeCluster(60, 65, 35, 46), [])
  const heatData = useMemo(() => {
    const out: [number, number, number][] = []
    for (let y = 0; y < HEAT_DAYS.length; y++) {
      for (let x = 0; x < HEAT_HOURS.length; x++) {
        out.push([x, y, Math.round(Math.random() * 80 + (x === 3 ? 20 : 0))])
      }
    }
    return out
  }, [])

  /* ECharts base options — ChartPanel injects legend + grid room. */

  const echartsBar = useMemo<EChartsOption>(
    () => ({
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        name: 'Month',
        ...echartsAxisName(t, 'x'),
        data: MONTHS,
        axisLabel: echartsAxisLabel(t),
        axisLine: echartsAxisLine(t),
      },
      yAxis: {
        type: 'value',
        name: 'Revenue ($)',
        ...echartsAxisName(t, 'y'),
        axisLabel: echartsAxisLabel(t),
        splitLine: echartsSplitLine(t),
      },
      series: [
        { name: 'Desktop', type: 'bar', data: REVENUE.map((d) => d.desktop) },
        { name: 'Mobile', type: 'bar', data: REVENUE.map((d) => d.mobile) },
      ],
    }),
    [t],
  )

  const echartsDonut = useMemo<EChartsOption>(
    () => ({
      tooltip: { trigger: 'item' },
      series: [
        {
          type: 'pie',
          radius: ['42%', '64%'],
          center: ['50%', '46%'],
          itemStyle: { borderColor: t.surface, borderWidth: 2 },
          label: { color: t.text },
          data: TRAFFIC.map((d) => ({ name: d.label, value: d.value })),
        },
      ],
    }),
    [t],
  )

  const echartsStack = useMemo<EChartsOption>(
    () => ({
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        name: 'Month',
        ...echartsAxisName(t, 'x'),
        data: MONTHS,
        axisLabel: echartsAxisLabel(t),
        axisLine: echartsAxisLine(t),
      },
      yAxis: {
        type: 'value',
        name: 'Sessions',
        ...echartsAxisName(t, 'y'),
        axisLabel: echartsAxisLabel(t),
        splitLine: echartsSplitLine(t),
      },
      series: (['desktop', 'mobile', 'tablet'] as const).map((key) => ({
        name: key[0].toUpperCase() + key.slice(1),
        type: 'line',
        stack: 'total',
        smooth: true,
        showSymbol: false,
        areaStyle: { opacity: 0.25 },
        emphasis: { focus: 'series' },
        data: STACK.map((d) => d[key]),
      })),
    }),
    [t],
  )

  const echartsRadar = useMemo<EChartsOption>(
    () => ({
      tooltip: {},
      radar: {
        indicator: RADAR.map((r) => ({ name: r.axis, max: 100 })),
        axisName: { color: t.textMuted, fontSize: 13, fontWeight: 700 as const },
        splitLine: { lineStyle: { color: t.border } },
        splitArea: { show: false },
        axisLine: { lineStyle: { color: t.border } },
      },
      series: [
        {
          type: 'radar',
          areaStyle: { opacity: 0.1 },
          data: [
            { value: RADAR.map((r) => r.A), name: 'Model A' },
            { value: RADAR.map((r) => r.B), name: 'Model B' },
          ],
        },
      ],
    }),
    [t],
  )

  const echartsBox = useMemo<EChartsOption>(
    () => ({
      tooltip: { trigger: 'item' },
      xAxis: {
        type: 'category',
        name: 'Service',
        ...echartsAxisName(t, 'x'),
        data: LATENCY.map((d) => d.name),
        axisLabel: echartsAxisLabel(t),
        axisLine: echartsAxisLine(t),
      },
      yAxis: {
        type: 'value',
        name: 'Latency (ms)',
        ...echartsAxisName(t, 'y'),
        axisLabel: echartsAxisLabel(t),
        splitLine: echartsSplitLine(t),
      },
      series: [
        {
          type: 'boxplot',
          itemStyle: { color: t.surfaceRaised, borderColor: t.palette[0] },
          data: LATENCY.map((d) => d.data),
        },
      ],
    }),
    [t],
  )

  const echartsScatter = useMemo<EChartsOption>(
    () => ({
      tooltip: { trigger: 'item' },
      xAxis: {
        type: 'value',
        name: 'Adoption %',
        ...echartsAxisName(t, 'x'),
        axisLabel: echartsAxisLabel(t),
        splitLine: echartsSplitLine(t),
      },
      yAxis: {
        type: 'value',
        name: 'Engagement',
        ...echartsAxisName(t, 'y'),
        axisLabel: echartsAxisLabel(t),
        splitLine: echartsSplitLine(t),
      },
      series: [
        { name: 'Cohort A', type: 'scatter', symbolSize: 9, data: scatterA },
        { name: 'Cohort B', type: 'scatter', symbolSize: 9, data: scatterB },
      ],
    }),
    [t, scatterA, scatterB],
  )

  const echartsHeat = useMemo<EChartsOption>(
    () => ({
      grid: { top: 12, right: 12, bottom: 56, left: 48 },
      tooltip: { position: 'top' },
      xAxis: { type: 'category', data: HEAT_HOURS, axisLabel: echartsAxisLabel(t), splitArea: { show: true } },
      yAxis: { type: 'category', data: HEAT_DAYS, axisLabel: echartsAxisLabel(t), splitArea: { show: true } },
      visualMap: {
        min: 0,
        max: 100,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: 4,
        textStyle: { color: t.textMuted },
        inRange: { color: [t.grid, t.palette[1], t.palette[0]] },
      },
      series: [{ type: 'heatmap', data: heatData, label: { show: false } }],
    }),
    [t, heatData],
  )

  const echartsGauge = useMemo<EChartsOption>(
    () => ({
      series: [
        {
          type: 'gauge',
          progress: { show: true, width: 14 },
          axisLine: { lineStyle: { width: 14, color: [[1, t.grid]] } },
          axisTick: { show: false },
          splitLine: { length: 10, lineStyle: { color: t.textMuted } },
          axisLabel: { color: t.textMuted, distance: 18, fontSize: 13, fontWeight: 700 as const },
          pointer: { itemStyle: { color: t.palette[0] } },
          itemStyle: { color: t.palette[0] },
          detail: { valueAnimation: true, color: t.text, fontSize: 26, formatter: '{value}%' },
          data: [{ value: 72 }],
        },
      ],
    }),
    [t],
  )

  const echartsLarge = useMemo<EChartsOption>(
    () => ({
      grid: { top: 16, right: 16, bottom: 56, left: 48 },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'time',
        name: 'Time',
        ...echartsAxisName(t, 'x'),
        axisLabel: echartsAxisLabel(t),
        axisLine: echartsAxisLine(t),
      },
      yAxis: {
        type: 'value',
        name: 'Value',
        ...echartsAxisName(t, 'y'),
        scale: true,
        axisLabel: echartsAxisLabel(t),
        splitLine: echartsSplitLine(t),
      },
      dataZoom: [
        { type: 'inside', start: 60, end: 100 },
        { type: 'slider', start: 60, end: 100, height: 18, bottom: 12 },
      ],
      series: [
        {
          name: 'Signal',
          type: 'line',
          showSymbol: false,
          smooth: true,
          lineStyle: { width: 1 },
          areaStyle: { opacity: 0.12 },
          data: largeData,
        },
      ],
    }),
    [t, largeData],
  )

  const echartsRegion = useMemo<EChartsOption>(
    () => ({
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: REGIONS,
        axisLabel: echartsAxisLabel(t),
        axisLine: echartsAxisLine(t),
      },
      yAxis: {
        type: 'value',
        name: 'Revenue ($K)',
        ...echartsAxisName(t, 'y'),
        axisLabel: echartsAxisLabel(t),
        splitLine: echartsSplitLine(t),
      },
      series: [{ name: 'Revenue', type: 'bar', data: REGION_VALUES, itemStyle: { borderRadius: [3, 3, 0, 0] } }],
    }),
    [t],
  )

  const echartsReference = useMemo<EChartsOption>(
    () => ({
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        name: 'Month',
        ...echartsAxisName(t, 'x'),
        data: MONTHS,
        axisLabel: echartsAxisLabel(t),
        axisLine: echartsAxisLine(t),
      },
      yAxis: {
        type: 'value',
        name: 'Revenue ($)',
        ...echartsAxisName(t, 'y'),
        axisLabel: echartsAxisLabel(t),
        splitLine: echartsSplitLine(t),
      },
      series: [
        {
          name: 'Desktop',
          type: 'line',
          smooth: true,
          showSymbol: false,
          areaStyle: { opacity: 0.1 },
          data: REVENUE.map((d) => d.desktop),
          markLine: {
            symbol: ['none', 'none'],
            label: { color: t.text, fontSize: 11 },
            emphasis: { disabled: true },
            data: [
              {
                yAxis: 5000,
                name: 'Target',
                lineStyle: { color: t.palette[4], type: 'dashed', width: 2 },
                label: { formatter: 'Target $5k', position: 'insideEndTop' },
              },
              {
                xAxis: 'Apr',
                name: 'Launch',
                lineStyle: { color: t.palette[1], type: 'dashed', width: 2 },
                label: { formatter: 'Launch', position: 'insideEndTop' },
              },
            ],
          },
        },
      ],
    }),
    [t],
  )

  return (
    <div className="space-y-12">
      <section className="space-y-4">
        <p className="type-overline">Data visualization</p>
        <p className="type-body-sm type-muted prose-measure">
          <strong>Apache ECharts</strong> is the default engine — every chart lives in a unified{' '}
          <code className="type-code">ChartPanel</code> window with a title bar (PNG + CSV download),
          a legend toggle, and prop-driven legend placement / axis-label slant. <strong>Nivo</strong>{' '}
          is the polished SVG backup. Both read the live theme via{' '}
          <code className="type-code">useChartTheme</code>; <code className="type-code">d3</code> is
          installed for bespoke visuals later.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4">
            <p className="type-overline mb-1">ECharts — default</p>
            <ul className="type-body-sm type-muted list-disc space-y-1 pl-5">
              <li>Canvas rendering — handles massive datasets &amp; real-time streaming.</li>
              <li>Deep zoom/pan, brushing, geo-mapping, rich interactions.</li>
              <li>Unified <code className="type-code">ChartPanel</code> shell for every chart.</li>
            </ul>
          </div>
          <div className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4">
            <p className="type-overline mb-1">Nivo — backup</p>
            <ul className="type-body-sm type-muted list-disc space-y-1 pl-5">
              <li>SVG, declarative, beautiful defaults with little config.</li>
              <li>Reach for it for standard data sizes when you want SVG output.</li>
              <li>Stays installed &amp; demoed — not the first choice.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Apache ECharts (default) — ChartPanel windows</p>
        <div className="grid gap-5 lg:grid-cols-2">
          <ChartPanel title="Bar chart" option={echartsBar} />
          <ChartPanel title="Donut chart" option={echartsDonut} />
          <ChartPanel title="Stacked area chart" option={echartsStack} />
          <ChartPanel title="Radar chart" option={echartsRadar} />
          <ChartPanel
            title="Box plot"
            option={echartsBox}
            showLegendControl={false}
          />
          <ChartPanel
            title="Scatter chart"
            option={echartsScatter}
            legendPosition="top"
          />
          <ChartPanel
            title="Heatmap"
            option={echartsHeat}
            showLegendControl={false}
          />
          <ChartPanel
            title="Gauge chart"
            option={echartsGauge}
            showLegendControl={false}
          />
          <ChartPanel title="Time-series line chart" option={echartsLarge} showLegendControl={false} />
          <ChartPanel
            title="Column chart"
            option={echartsRegion}
            showLegendControl={false}
            xAxisLabelRotate={30}
          />
          <ChartPanel
            title="Line with reference lines"
            option={echartsReference}
            showLegendControl={false}
          />
        </div>
      </section>

      <section className="space-y-4">
        <p className="type-overline">ChartEmbed — cards &amp; dashboards</p>
        <p className="type-body-sm type-muted prose-measure">
          <code className="type-code">ChartEmbed</code> is the light shell — no download toolbar or
          settings overlay. Pair with <code className="type-code">Card</code> or drop inside any
          surface; optional title row + nano palette rail for series colors.
        </p>
        <div className="grid gap-5 lg:grid-cols-2">
          <Card variant="raised" className="p-4">
            <ChartEmbed
              title="Bar chart"
              option={echartsBar}
              paletteControl
            />
          </Card>
          <Card variant="outline" className="p-4">
            <ChartEmbed
              title="Donut chart"
              option={echartsDonut}
              paletteControl
              showLegendControl={false}
            />
          </Card>
          <Card variant="flat" className="p-4">
            <ChartEmbed title="Stacked area chart" option={echartsStack} />
          </Card>
          <Card variant="inset" className="p-4">
            <ChartEmbed
              title="Radar chart"
              option={echartsRadar}
              paletteControl
              legendPosition="top"
            />
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Nivo (backup) — SVG</p>
        <div className="grid gap-5 lg:grid-cols-2">
          <ChartCard title="Bar chart" badge="Nivo">
            <div className="h-72">
              <ResponsiveBar
                data={REVENUE}
                keys={['desktop', 'mobile']}
                indexBy="month"
                groupMode="grouped"
                margin={{ top: 16, right: 16, bottom: 40, left: 48 }}
                padding={0.28}
                innerPadding={3}
                colors={t.palette}
                theme={nivoTheme}
                borderRadius={3}
                axisBottom={{ tickSize: 0, tickPadding: 8 }}
                axisLeft={{ tickSize: 0, tickPadding: 8 }}
                enableLabel={false}
                animate
              />
            </div>
          </ChartCard>

          <ChartCard title="Line chart" badge="Nivo">
            <div className="h-72">
              <ResponsiveLine
                data={NIVO_LINE}
                margin={{ top: 16, right: 16, bottom: 40, left: 48 }}
                xScale={{ type: 'point' }}
                yScale={{ type: 'linear', min: 0, max: 'auto' }}
                curve="monotoneX"
                colors={t.palette}
                theme={nivoTheme}
                pointSize={7}
                pointColor={{ from: 'serieColor' }}
                pointBorderWidth={2}
                pointBorderColor={{ from: 'serieColor' }}
                enableArea
                areaOpacity={0.08}
                axisBottom={{ tickSize: 0, tickPadding: 8 }}
                axisLeft={{ tickSize: 0, tickPadding: 8 }}
                useMesh
                animate
              />
            </div>
          </ChartCard>

          <ChartCard title="Pie chart" badge="Nivo">
            <div className="h-72">
              <ResponsivePie
                data={TRAFFIC}
                margin={{ top: 16, right: 16, bottom: 16, left: 16 }}
                innerRadius={0.55}
                padAngle={1.2}
                cornerRadius={3}
                activeOuterRadiusOffset={6}
                colors={t.palette}
                theme={nivoTheme}
                borderWidth={0}
                arcLabelsSkipAngle={12}
                arcLinkLabelsColor={{ from: 'color' }}
                arcLinkLabelsTextColor={t.textMuted}
                animate
              />
            </div>
          </ChartCard>

          <ChartCard title="Radar chart" badge="Nivo">
            <div className="h-72">
              <ResponsiveRadar
                data={RADAR}
                keys={['A', 'B']}
                indexBy="axis"
                margin={{ top: 24, right: 36, bottom: 24, left: 36 }}
                colors={t.palette}
                theme={nivoTheme}
                gridLabelOffset={12}
                dotSize={6}
                dotBorderWidth={2}
                fillOpacity={0.15}
                blendMode="multiply"
                animate
              />
            </div>
          </ChartCard>
        </div>
      </section>
    </div>
  )
}

/**
 * Ledger LCL: 4-column table that leaves, then re-enters as 2 columns on drill.
 */
import { forwardRef, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { gsap, ScrollTrigger, useGSAP } from '../../lib/gsap'
import {
  applyScrollHairline,
  playLclProseIn,
  playLclProseOut,
  playScrollHairlineIn,
  startLclCountIn,
  startLclCrumbIn,
  startLclCrumbOut,
  startLclDimIn,
  startLclDimOut,
  startLclListIn,
  startLclListOut,
  startLclMediaIn,
  startLclMediaOut,
  startLclProseIn,
  startLclTitleIn,
  startLclTitleOut,
} from '../../lib/animations/scrollEnter'
import { PROSE_INLINE_CLASS, PROSE_INLINE_P_CLASS } from '../../lib/animations/proseInlineLinks'
import { LclBreadcrumb } from '../LclBreadcrumb'
import { GrasUnderlineButton } from '../GrasUnderlineButton'
import { LclMediaFrame } from '../LclMediaFrame'
import { LclStat } from '../LclStat'
import { LclTable, type LclTableColumn, type LclTableRow } from '../LclTable'
import { ScrollEnterText } from '../ScrollEnterText'
import {
  createLclHoverIntent,
  lclSwap,
  type LclPreviewHandle,
} from '../../lib/lcl/lclChoreo'
import {
  LCL_LEDGER_COASTS,
  LCL_LEDGER_REST_NOTE,
  LCL_LEDGER_ROWS,
  LEDGER_LEAVE_KEYS,
  lclLedgerFilter,
  type LclLedgerRow,
} from '../../lib/lcl/lclLedgerContent'
import { LCL_LEDGER_FIXTURE } from '../../lib/lcl/viewportSections'
import { LclPreviewHost } from './LclPreviewHost'

export { LEDGER_LEAVE_KEYS }

const INDEX_COLS: LclTableColumn[] = [
  { id: 'name', label: 'Name' },
  { id: 'coast', label: 'Coast' },
  { id: 'lit', label: 'Lit', align: 'end' },
  { id: 'views', label: 'Views' },
]
const DETAIL_COLS: LclTableColumn[] = [
  { id: 'field', label: 'Field' },
  { id: 'value', label: 'Value' },
]
export const VIEW_COLS: LclTableColumn[] = [{ id: 'view', label: 'View' }]

function indexRows(rows: readonly LclLedgerRow[]): LclTableRow[] {
  return rows.map((row) => ({
    id: row.id,
    cells: [row.name, row.coast, String(row.lit), `${row.views.length} views`],
    viewsLabel: `${row.views.length} views`,
  }))
}

function detailRows(row: LclLedgerRow): LclTableRow[] {
  return [
    { id: 'coast', cells: ['Coast', row.coast] },
    { id: 'lit', cells: ['Lit', String(row.lit)] },
    { id: 'height', cells: ['Height', `${row.heightM} m`] },
    { id: 'range', cells: ['Range', `${row.rangeNm} nm`] },
    { id: 'keeper', cells: ['Keeper', row.keeper] },
    { id: 'views', cells: ['Views', String(row.views.length)] },
  ]
}

export const LclLedgerPreview = forwardRef<LclPreviewHandle>(function LclLedgerPreview(_, ref) {
  const hostRef = useRef<HTMLElement | null>(null)
  const scrollerRef = useRef<HTMLElement | null>(null)
  const titleRef = useRef<HTMLElement | null>(null)
  const headRef = useRef<HTMLDivElement | null>(null)
  const kickerRef = useRef<HTMLElement | null>(null)
  const chipsRef = useRef<HTMLUListElement | null>(null)
  const crumbRef = useRef<HTMLElement | null>(null)
  const tableRef = useRef<HTMLTableElement | null>(null)
  const theadRef = useRef<HTMLTableSectionElement | null>(null)
  const tbodyRef = useRef<HTMLTableSectionElement | null>(null)
  const noteRef = useRef<HTMLElement | null>(null)
  const mediaRef = useRef<HTMLElement | null>(null)
  const statRefs = [useRef<HTMLElement | null>(null), useRef<HTMLElement | null>(null), useRef<HTMLElement | null>(null)]
  const busyRef = useRef(false)
  const listRef = useRef<HTMLUListElement | null>(null)

  const [path, setPath] = useState<string[]>([])
  const [coast, setCoast] = useState<(typeof LCL_LEDGER_COASTS)[number]>('All')
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>(null)
  const [note, setNote] = useState(LCL_LEDGER_REST_NOTE)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [, setViewId] = useState<string | null>(null)

  const mode = path.length === 0 ? 'index' : path.length === 1 ? 'detail' : 'views'
  const filtered = lclLedgerFilter(coast)
  const sorted = [...filtered].sort((a, b) => {
    if (!sortKey || !sortDir) return 0
    const dir = sortDir === 'asc' ? 1 : -1
    if (sortKey === 'name') return a.name.localeCompare(b.name) * dir
    if (sortKey === 'coast') return a.coast.localeCompare(b.coast) * dir
    if (sortKey === 'lit') return (a.lit - b.lit) * dir
    if (sortKey === 'views') return (a.views.length - b.views.length) * dir
    return 0
  })
  const current = LCL_LEDGER_ROWS.find((row) => row.name === path[0]) ?? null
  const currentView = current?.views.find((view) => view.label === path[1]) ?? current?.views[0] ?? null

  useGSAP(
    () => {
      const root = hostRef.current
      if (!root) return
      let cancelled = false
      let attempts = 0
      let frameId = 0
      const tweens: gsap.core.Tween[] = []
      const attach = () => {
        if (cancelled) return
        const scroller = scrollerRef.current
        if (!scroller) {
          attempts += 1
          if (attempts < 16) frameId = requestAnimationFrame(attach)
          return
        }
        tweens.push(...applyScrollHairline({ root, gsap, ScrollTrigger, scroller }))
      }
      frameId = requestAnimationFrame(attach)
      return () => {
        cancelled = true
        cancelAnimationFrame(frameId)
        tweens.forEach((tween) => tween.scrollTrigger?.kill())
        tweens.forEach((tween) => tween.kill())
      }
    },
    { scope: hostRef, revertOnUpdate: true },
  )

  useLayoutEffect(() => {
    const title = titleRef.current
    if (title) void startLclTitleIn(title, gsap)
    const head = headRef.current
    if (head) playScrollHairlineIn(head, gsap)
    const kicker = kickerRef.current
    if (kicker) void startLclTitleIn(kicker, gsap)
    const chips = chipsRef.current
    if (chips) void startLclListIn(chips, gsap)
    const thead = theadRef.current
    if (thead) void startLclListIn(thead, gsap)
    const tbody = tbodyRef.current
    if (tbody) void startLclListIn(tbody, gsap)
    const list = listRef.current
    if (list) void startLclListIn(list, gsap)
    statRefs[0].current && startLclCountIn(statRefs[0].current, gsap, sorted.length)
    statRefs[1].current && startLclCountIn(statRefs[1].current, gsap, current?.heightM ?? Math.max(...sorted.map((row) => row.heightM)))
    statRefs[2].current && startLclCountIn(statRefs[2].current, gsap, current?.rangeNm ?? Math.max(...sorted.map((row) => row.rangeNm)))
    const noteEl = noteRef.current
    if (noteEl) playLclProseIn(noteEl, gsap)
    const media = mediaRef.current
    if (media) void startLclMediaIn(media, gsap)
    const crumb = crumbRef.current
    if (crumb) void startLclCrumbIn(crumb, gsap)
    // mount enter only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const hover = useRef(
    createLclHoverIntent<LclLedgerRow>({
      show: async (row) => {
        const el = noteRef.current
        if (!el || path.length > 0) return
        await playLclProseOut(el, gsap).done
        setNote(row ? `${row.coast} · ${row.heightM} m · ${row.rangeNm} nm. ${row.note}` : LCL_LEDGER_REST_NOTE)
        await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))
        const next = noteRef.current
        if (next) await playLclProseIn(next, gsap)
      },
    }),
  )

  useLayoutEffect(() => () => hover.current.dispose(), [])

  async function leaveVisible() {
    const parts = [
      { key: 'stats', el: statRefs[0].current, out: startLclTitleOut, in: startLclTitleIn },
      { key: 'tbody', el: tbodyRef.current ?? listRef.current, out: startLclListOut, in: startLclListIn },
      { key: 'thead', el: theadRef.current, out: startLclListOut, in: startLclListIn },
      { key: 'kicker', el: kickerRef.current ?? crumbRef.current, out: startLclTitleOut, in: startLclTitleIn },
      { key: 'note', el: noteRef.current, out: (el: HTMLElement) => playLclProseOut(el, gsap), in: startLclTitleIn },
    ]
    if (mediaRef.current) {
      await startLclMediaOut(mediaRef.current, gsap).done
    }
    await lclSwap(
      {
        leave: parts,
        commit: () => undefined,
        enter: () => [],
      },
      gsap,
    )
  }

  useImperativeHandle(ref, () => ({
    leave: async () => {
      if (busyRef.current) return
      busyRef.current = true
      await leaveVisible()
      busyRef.current = false
    },
  }))

  async function drill(row: LclLedgerRow, viewLabel?: string) {
    if (busyRef.current) return
    busyRef.current = true
    await lclSwap(
      {
        leave: [
          { key: 'stats', el: statRefs[0].current, out: startLclTitleOut, in: startLclTitleIn },
          { key: 'tbody', el: tbodyRef.current, out: startLclListOut, in: startLclListIn },
          { key: 'thead', el: theadRef.current, out: startLclListOut, in: startLclListIn },
          { key: 'kicker', el: kickerRef.current, out: startLclTitleOut, in: startLclTitleIn },
          { key: 'chips', el: chipsRef.current, out: startLclListOut, in: startLclListIn },
          { key: 'note', el: noteRef.current, out: (el) => playLclProseOut(el, gsap), in: startLclTitleIn },
        ],
        commit: () => {
          setExpandedId(null)
          setPath(viewLabel ? [row.name, viewLabel] : [row.name])
          setViewId(viewLabel ?? row.views[0]?.id ?? null)
          setNote(row.note)
        },
        enter: () => [
          { key: 'crumb', el: crumbRef.current, out: startLclCrumbOut, in: startLclCrumbIn },
          { key: 'media', el: mediaRef.current, out: (el) => startLclMediaOut(el, gsap), in: (el) => startLclMediaIn(el, gsap) },
          { key: 'tbody', el: tbodyRef.current ?? listRef.current, out: startLclListOut, in: startLclListIn },
          { key: 'note', el: noteRef.current, out: (el) => playLclProseOut(el, gsap), in: (el) => startLclProseIn(el, gsap) },
        ],
      },
      gsap,
    )
    busyRef.current = false
  }

  async function goToDepth(depth: number) {
    if (busyRef.current || depth >= path.length) return
    busyRef.current = true
    await lclSwap(
      {
        leave: [
          { key: 'stats', el: statRefs[0].current, out: startLclTitleOut, in: startLclTitleIn },
          { key: 'rows', el: tbodyRef.current ?? listRef.current, out: startLclListOut, in: startLclListIn },
          { key: 'media', el: mediaRef.current, out: (el) => startLclMediaOut(el, gsap), in: (el) => startLclMediaIn(el, gsap) },
          { key: 'crumb', el: crumbRef.current, out: startLclCrumbOut, in: startLclCrumbIn },
        ],
        commit: () => {
          const next = path.slice(0, depth)
          setPath(next)
          if (next.length === 0) setNote(LCL_LEDGER_REST_NOTE)
        },
        enter: () => [
          { key: 'crumb', el: crumbRef.current, out: startLclCrumbOut, in: startLclCrumbIn },
          { key: 'kicker', el: kickerRef.current ?? crumbRef.current, out: startLclTitleOut, in: startLclTitleIn },
          { key: 'chips', el: chipsRef.current, out: startLclListOut, in: startLclListIn },
          { key: 'thead', el: theadRef.current, out: startLclListOut, in: startLclListIn },
          { key: 'tbody', el: tbodyRef.current ?? listRef.current, out: startLclListOut, in: startLclListIn },
        ],
      },
      gsap,
    )
    busyRef.current = false
  }

  async function onSort(id: string) {
    if (busyRef.current || mode !== 'index') return
    const tbody = tbodyRef.current
    if (tbody) await startLclListOut(tbody, gsap).done
    if (sortKey === id) {
      if (sortDir === 'asc') setSortDir('desc')
      else {
        setSortKey(null)
        setSortDir(null)
      }
    } else {
      setSortKey(id)
      setSortDir('asc')
    }
    await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))
    if (tbodyRef.current) await startLclListIn(tbodyRef.current, gsap).done
  }

  async function onFilter(next: (typeof LCL_LEDGER_COASTS)[number]) {
    if (busyRef.current || mode !== 'index') return
    const tbody = tbodyRef.current
    if (tbody) await startLclListOut(tbody, gsap).done
    setCoast(next)
    await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))
    if (tbodyRef.current) await startLclListIn(tbodyRef.current, gsap).done
  }

  function onHeaderHover(id: string | null) {
    const table = tableRef.current
    if (!table || mode !== 'index') return
    const cells = [...table.querySelectorAll<HTMLTableCellElement>('tbody td')]
    if (!id) {
      void startLclDimOut(table, gsap, cells)
      return
    }
    const colIndex = INDEX_COLS.findIndex((col) => col.id === id)
    const dim = cells.filter((cell) => cell.cellIndex !== colIndex)
    void startLclDimIn(table, gsap, dim)
  }

  const kickerCopy = `${sorted.length === 1 ? 'One light' : `${['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six'][sorted.length] ?? sorted.length} lights`} · 4 columns`

  return (
    <LclPreviewHost
      fixture={LCL_LEDGER_FIXTURE}
      hostRef={(node) => {
        hostRef.current = node
        scrollerRef.current = node?.closest('.theme-webgl-toolkit') ?? null
      }}
      label="LCL Ledger"
      layoutId="ledger"
    >
      {(id) => {
        if (id === 'head') {
          return (
            <div ref={headRef} className="theme-hairline-fx">
              <div className="theme-lcl-preview__display-head">
                <div ref={(node) => { titleRef.current = node }}>
                  <ScrollEnterText className="type-display-lg mb-0" bind="none">
                    Ledger
                  </ScrollEnterText>
                </div>
                <span className="theme-hairline-fx__wipe" aria-hidden>
                  <span className="theme-hairline-fx__rule" />
                </span>
              </div>
            </div>
          )
        }
        if (id === 'table') {
          return (
            <div className="theme-lcl-table-shell" data-split={mode === 'index' ? 'index' : mode}>
              {mode !== 'index' && currentView ? (
                <LclMediaFrame
                  src={currentView.src}
                  alt={currentView.label}
                  caption={currentView.caption}
                  frameRef={(node) => {
                    mediaRef.current = node
                  }}
                />
              ) : null}
              <div className="flex min-h-0 flex-col gap-2">
                {mode === 'index' ? (
                  <>
                    <p ref={(node) => { kickerRef.current = node }} className="type-caption mb-0">
                      {kickerCopy}
                    </p>
                    <ul ref={chipsRef} className="theme-lcl-chips">
                      {LCL_LEDGER_COASTS.map((item) => (
                        <li key={item}>
                          <button
                            type="button"
                            className="theme-lcl-chips__item theme-hairline-fx theme-hairline-fx--eirene type-caption"
                            onClick={() => void onFilter(item)}
                          >
                            {item}
                            <span className="theme-hairline-fx__wipe" aria-hidden>
                              <span className="theme-hairline-fx__pill" />
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <LclBreadcrumb
                      ref={crumbRef}
                      key={path.join('|')}
                      path={path}
                      rootLabel="Ledger"
                      onSelect={(depth) => void goToDepth(depth)}
                    />
                    {mode === 'detail' && current ? (
                      <span className="flex gap-1">
                        <button
                          type="button"
                          aria-label="Previous light"
                          onClick={() => {
                            const at = LCL_LEDGER_ROWS.findIndex((row) => row.id === current.id)
                            const prev = LCL_LEDGER_ROWS[at - 1]
                            if (prev) void drill(prev)
                          }}
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <button
                          type="button"
                          aria-label="Next light"
                          onClick={() => {
                            const at = LCL_LEDGER_ROWS.findIndex((row) => row.id === current.id)
                            const next = LCL_LEDGER_ROWS[at + 1]
                            if (next) void drill(next)
                          }}
                        >
                          <ChevronRight size={14} />
                        </button>
                      </span>
                    ) : null}
                  </div>
                )}
                <div className="theme-lcl-table__scroll">
                  {mode === 'views' && current ? (
                    <ul ref={listRef} className="theme-lcl-layout__nest" key={path.join('/')}>
                      {current.views.map((view) => (
                        <li key={view.id}>
                          <GrasUnderlineButton layout="nest" onClick={() => void drill(current, view.label)}>
                            <ScrollEnterText split="line" bind="none">
                              {view.label}
                            </ScrollEnterText>
                          </GrasUnderlineButton>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <LclTable
                      mode={mode}
                      columns={mode === 'index' ? INDEX_COLS : DETAIL_COLS}
                      rows={mode === 'index' ? indexRows(sorted) : current ? detailRows(current) : []}
                      sortKey={sortKey}
                      sortDir={sortDir}
                      expandedId={expandedId}
                      expand={
                        expandedId
                          ? {
                              id: expandedId,
                              thumbs: (LCL_LEDGER_ROWS.find((row) => row.id === expandedId)?.views ?? []).map((view) => ({
                                id: view.id,
                                src: view.src,
                                alt: view.label,
                              })),
                            }
                          : null
                      }
                      onSort={(col) => void onSort(col)}
                      onRow={(rowId) => {
                        if (mode === 'detail' && current && rowId === 'views') {
                          void drill(current, current.views[0]?.label)
                          return
                        }
                        const row = LCL_LEDGER_ROWS.find((item) => item.id === rowId)
                        if (row) void drill(row)
                      }}
                      onViews={(rowId) => {
                        if (expandedId === rowId) setExpandedId(null)
                        else setExpandedId(rowId)
                      }}
                      onThumb={(rowId, viewIdNext) => {
                        const row = LCL_LEDGER_ROWS.find((item) => item.id === rowId)
                        const view = row?.views.find((item) => item.id === viewIdNext)
                        if (row && view) void drill(row, view.label)
                      }}
                      onRowHover={(rowId) => {
                        if (mode !== 'index') return
                        const row = LCL_LEDGER_ROWS.find((item) => item.id === rowId)
                        if (row) hover.current.enter(row)
                        else hover.current.leaveRegion()
                      }}
                      onHeaderHover={onHeaderHover}
                      tableRef={(node) => {
                        tableRef.current = node
                      }}
                      theadRef={(node) => {
                        theadRef.current = node
                      }}
                      tbodyRef={(node) => {
                        tbodyRef.current = node
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          )
        }
        if (id === 'stats') {
          return (
            <div className="flex h-full flex-col justify-end gap-3">
              <LclStat label={mode === 'index' ? 'Lights' : 'Lit'} valueRef={(node) => { statRefs[0].current = node }} />
              <LclStat label="Height m" valueRef={(node) => { statRefs[1].current = node }} />
              <LclStat label="Range nm" valueRef={(node) => { statRefs[2].current = node }} />
            </div>
          )
        }
        if (id === 'note') {
          return (
            <div ref={(node) => { noteRef.current = node }} className={`${PROSE_INLINE_CLASS} theme-lcl-preview__text-steps`}>
              <p className={`${PROSE_INLINE_P_CLASS} type-body-sm`}>{note}</p>
            </div>
          )
        }
        return null
      }}
    </LclPreviewHost>
  )
})

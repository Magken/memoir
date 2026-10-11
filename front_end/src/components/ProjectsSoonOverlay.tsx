/**
 * Projects LCL on `/`. Search + LCL table (ScrollEnter + eirene rows), same recipe as LclTable.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Eye, GitBranch, Globe, Package, Box } from 'lucide-react'
import { gsap, Flip } from '../lib/gsap'
import { startLclListIn, startLclListOut } from '../lib/animations/scrollEnter'
import {
  filterProjectsCatalog,
  pageProjectsCatalog,
  PROJECT_ACCESS_FILTERS,
  PROJECTS_CATALOG_FIXTURES,
  type ProjectAccessKind,
  type ProjectCatalogRow,
} from '../lib/lcl/projectsSoonContent'
import { gridPlacementFromCells } from '../lib/lcl/viewportSections'
import { lclScene } from '../lib/lcl/lclScenes'
import { Fab } from './Fab'
import { GrasSearch } from './GrasSearch'
import { IconButton } from './IconButton'
import { ScrollEnterText } from './ScrollEnterText'
import { ThemeScroll } from './ThemeScroll'
import { Tooltip } from './Tooltip'

/** Most of the Projects entrance before the panel enters. */
export const PROJECTS_SOON_LCL_IN_S = 2.6

/** Search settles before the catalog sync runs. */
const SEARCH_SWAP_MS = 160
/** Stayers Flip into the gaps after leaving rows unmount. */
const ROW_FLIP_S = 0.55
/** Soft enter for newly matching rows. */
const ROW_ENTER_S = 0.48
/** Access Fab seat travel. */
const FAB_SEAT_S = 0.55

type ProjectsSoonOverlayProps = {
  active: boolean
  awaitingSettle: boolean
  /** Catalog row selected → page flies to text canvas. */
  onSelectProject?: (id: string) => void
}

function AccessIcon({ kind, size = 14 }: { kind: ProjectAccessKind; size?: number }) {
  const common = { size, strokeWidth: 2.35, 'aria-hidden': true as const }
  if (kind === 'git') return <GitBranch {...common} />
  if (kind === 'npm') return <Package {...common} />
  if (kind === 'pip') return <Box {...common} />
  return <Globe {...common} />
}

function truncateDesc(text: string, max = 40): string {
  const trimmed = text.trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max - 1).trimEnd()}...`
}

function AccessLabel(kind: ProjectAccessKind): string {
  if (kind === 'git') return 'Git'
  if (kind === 'npm') return 'npm'
  if (kind === 'pip') return 'pip'
  return 'Website'
}

function AccessLucide(kind: ProjectAccessKind) {
  if (kind === 'git') return GitBranch
  if (kind === 'npm') return Package
  if (kind === 'pip') return Box
  return Globe
}

/** Horizontal seat for a Fab inside the selected / idle piles (px from center). */
function accessFabX(
  kind: (typeof PROJECT_ACCESS_FILTERS)[number],
  selected: readonly (typeof PROJECT_ACCESS_FILTERS)[number][],
  idle: readonly (typeof PROJECT_ACCESS_FILTERS)[number][],
): number {
  const on = selected.includes(kind)
  const pile = on ? selected : idle
  const index = Math.max(0, pile.indexOf(kind))
  const local = (index - (pile.length - 1) / 2) * 11
  if (!selected.length || !idle.length) return local
  return (on ? -18 : 18) + local
}

/** Park ScrollEnter chrome at rest so filter Flip / row fades are not fighting chars. */
function settleRowChrome(row: HTMLElement) {
  const chars = row.querySelectorAll('.theme-scroll-enter__char')
  const wipes = row.querySelectorAll('.theme-hairline-fx__wipe')
  if (chars.length) {
    gsap.killTweensOf(chars)
    // Keep an explicit rest pose - clearProps can drop chars back to a clipped mount state.
    gsap.set(chars, { yPercent: 0, rotateX: 0, xPercent: 0, x: 0, y: 0, force3D: true })
  }
  if (wipes.length) {
    gsap.killTweensOf(wipes)
    gsap.set(wipes, { scaleX: 1 })
  }
}

function playRowEnter(row: HTMLElement) {
  settleRowChrome(row)
  gsap.killTweensOf(row)
  gsap.fromTo(
    row,
    { autoAlpha: 0, y: 8 },
    { autoAlpha: 1, y: 0, duration: ROW_ENTER_S, ease: 'power1.out', overwrite: 'auto' },
  )
}

function revealPaintedRows(tbody: HTMLElement, joinerIds: readonly string[] = []) {
  const joinerSet = new Set(joinerIds)
  for (const row of tbody.querySelectorAll<HTMLElement>('[data-project-id]')) {
    const id = row.dataset.projectId ?? ''
    settleRowChrome(row)
    if (joinerSet.has(id)) continue
    gsap.set(row, { autoAlpha: 1, y: 0, clearProps: 'transform' })
  }
}

/** ThemeScroll edge fades sit outside list hosts - fade with catalog leave. */
const SCROLL_CLOUD_OUT_S = 0.55

function projectsScrollClouds(root: HTMLElement) {
  return root.querySelectorAll<HTMLElement>('.theme-scroll__cloud')
}

function restoreProjectsScrollClouds(root: HTMLElement) {
  const clouds = projectsScrollClouds(root)
  if (!clouds.length) return
  gsap.set(clouds, { clearProps: 'opacity,visibility' })
}

function playProjectsScrollCloudsOut(root: HTMLElement) {
  const clouds = projectsScrollClouds(root)
  if (!clouds.length) return Promise.resolve()
  return new Promise<void>((resolve) => {
    gsap.to(clouds, {
      autoAlpha: 0,
      duration: SCROLL_CLOUD_OUT_S,
      ease: 'power2.out',
      overwrite: 'auto',
      onComplete: () => resolve(),
    })
  })
}

function beginProjectsLeaveChrome(root: HTMLElement) {
  root.classList.add('is-leaving')
  const focused = document.activeElement
  if (focused instanceof HTMLElement && root.contains(focused)) focused.blur()
}

function endProjectsLeaveChrome(root: HTMLElement) {
  root.classList.remove('is-leaving')
}

/** Same hosts for page enter and canvas dive leave/return - search, head, tbody. */
function projectsListHosts(root: HTMLElement) {
  const panel = root.querySelector<HTMLElement>('.theme-projects-lcl__panel')
  const host = panel ?? root
  return {
    host,
    search: host.querySelector<HTMLElement>('.theme-projects-lcl__search'),
    head: host.querySelector<HTMLElement>('.theme-projects-lcl__head-block'),
    tbody: host.querySelector<HTMLElement>('tbody'),
  }
}

function playProjectsHostsIn(root: HTMLElement) {
  const { search, head, tbody } = projectsListHosts(root)
  endProjectsLeaveChrome(root)
  restoreProjectsScrollClouds(root)
  if (search) startLclListIn(search, gsap)
  if (head) startLclListIn(head, gsap)
  if (tbody) startLclListIn(tbody, gsap)
}

function playProjectsHostsOut(root: HTMLElement) {
  beginProjectsLeaveChrome(root)
  const { search, head, tbody } = projectsListHosts(root)
  // Kill filter Flip / row fades so dive leave is the same list out as page leave.
  if (tbody) {
    const rows = tbody.querySelectorAll<HTMLElement>('[data-project-id]')
    Flip.killFlipsOf(rows)
    gsap.killTweensOf(rows)
  }
  return Promise.all([
    search ? startLclListOut(search, gsap).done : Promise.resolve(),
    head ? startLclListOut(head, gsap).done : Promise.resolve(),
    tbody ? startLclListOut(tbody, gsap).done : Promise.resolve(),
    playProjectsScrollCloudsOut(root),
  ])
}

function ProjectsPanel({
  live,
  active,
  enterTicket,
  onSelectProject,
}: {
  live: boolean
  /** False while hosts are leaving - freeze filter / page sync so settle cannot kill out. */
  active: boolean
  enterTicket: number
  onSelectProject?: (id: string) => void
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const tbodyRef = useRef<HTMLTableSectionElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const scrollViewportRef = useRef<HTMLDivElement>(null)
  const filtersRef = useRef<HTMLDivElement>(null)
  const fabMounted = useRef(false)
  const entered = useRef(false)
  const rowCount = useRef(0)
  const swapGen = useRef(0)
  const paintedRef = useRef<readonly ProjectCatalogRow[]>([])
  const pendingJoinIds = useRef<readonly string[]>([])
  const pendingFlip = useRef<ReturnType<typeof Flip.getState> | null>(null)
  const wantRef = useRef({ query: '', accessOn: [] as readonly ProjectAccessKind[] })
  const prevFilterKey = useRef('')
  const [draft, setDraft] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [accessOn, setAccessOn] = useState<readonly ProjectAccessKind[]>(() => [...PROJECT_ACCESS_FILTERS])
  const [painted, setPainted] = useState<readonly ProjectCatalogRow[]>(() =>
    pageProjectsCatalog(
      filterProjectsCatalog(PROJECTS_CATALOG_FIXTURES, '', [...PROJECT_ACCESS_FILTERS]),
      1,
    ),
  )

  paintedRef.current = painted

  const filtered = useMemo(
    () => filterProjectsCatalog(PROJECTS_CATALOG_FIXTURES, query, accessOn),
    [query, accessOn],
  )
  const target = useMemo(() => pageProjectsCatalog(filtered, page), [filtered, page])
  const hasMore = painted.length < filtered.length
  const filterKey = `${query}|${accessOn.join(',')}`
  const filtersSplit =
    accessOn.length > 0 && accessOn.length < PROJECT_ACCESS_FILTERS.length

  wantRef.current = { query, accessOn }

  const toggleAccess = useCallback((kind: ProjectAccessKind) => {
    setAccessOn((prev) => (prev.includes(kind) ? prev.filter((item) => item !== kind) : [...prev, kind]))
  }, [])

  /* Seat Fabs with gsap x - Flip + overlapping margins jerked. */
  useLayoutEffect(() => {
    const root = filtersRef.current
    if (!root) return
    const selected = PROJECT_ACCESS_FILTERS.filter((kind) => accessOn.includes(kind))
    const idle = PROJECT_ACCESS_FILTERS.filter((kind) => !accessOn.includes(kind))
    const animate = fabMounted.current
    fabMounted.current = true
    for (const kind of PROJECT_ACCESS_FILTERS) {
      const slot = root.querySelector<HTMLElement>(`[data-fab-kind="${kind}"]`)
      if (!slot) continue
      const x = accessFabX(kind, selected, idle)
      const on = accessOn.includes(kind)
      gsap.killTweensOf(slot)
      if (!animate) {
        gsap.set(slot, { xPercent: -50, yPercent: -50, x, zIndex: on ? 3 : 1 })
        continue
      }
      gsap.to(slot, {
        xPercent: -50,
        yPercent: -50,
        x,
        zIndex: on ? 3 : 1,
        duration: FAB_SEAT_S,
        ease: 'power2.out',
        overwrite: 'auto',
      })
    }
  }, [accessOn])

  useEffect(() => {
    const id = window.setTimeout(() => setQuery(draft), SEARCH_SWAP_MS)
    return () => window.clearTimeout(id)
  }, [draft])

  useEffect(() => {
    setPage(1)
  }, [query, accessOn])

  useLayoutEffect(() => {
    if (!live) {
      entered.current = false
      rowCount.current = 0
      swapGen.current += 1
      pendingJoinIds.current = []
      pendingFlip.current = null
      fabMounted.current = false
      const tbody = tbodyRef.current
      if (tbody) Flip.killFlipsOf(tbody.querySelectorAll('[data-project-id]'))
      return
    }
    if (!active) return
    const panel = panelRef.current
    if (panel) playProjectsHostsIn(panel)
    rowCount.current = paintedRef.current.length
    entered.current = true
    prevFilterKey.current = filterKey
  }, [live, active, enterTicket])

  /*
   * Filter / search catalog sync:
   * 1. Capture Flip of current rows.
   * 2. Commit next painted immediately (leavers unmount - no empty-height hold).
   * 3. Flip stayers into the gaps; soft-enter joiners.
   * Never play full list out/in - that left gaps then snapped.
   * Skip while `active` is false so leave hosts-out is not killed by settleRowChrome.
   */
  useLayoutEffect(() => {
    if (!live || !active || !entered.current) return
    if (prevFilterKey.current === filterKey) return
    prevFilterKey.current = filterKey
    const tbody = tbodyRef.current
    const gen = ++swapGen.current
    const next = pageProjectsCatalog(
      filterProjectsCatalog(PROJECTS_CATALOG_FIXTURES, wantRef.current.query, wantRef.current.accessOn),
      1,
    )
    const current = paintedRef.current
    if (next.length === current.length && next.every((row, index) => row.id === current[index]?.id)) {
      return
    }
    const currentIds = new Set(current.map((row) => row.id))
    const joiners = next.filter((row) => !currentIds.has(row.id)).map((row) => row.id)

    if (tbody) {
      Flip.killFlipsOf(tbody.querySelectorAll('[data-project-id]'))
      const rows = tbody.querySelectorAll<HTMLElement>('[data-project-id]')
      pendingFlip.current = rows.length ? Flip.getState(rows) : null
    } else {
      pendingFlip.current = null
    }
    if (gen !== swapGen.current) return
    pendingJoinIds.current = joiners
    setPainted(next)
    rowCount.current = next.length
  }, [live, active, filterKey])

  useLayoutEffect(() => {
    if (!live || !active || !entered.current) return
    const state = pendingFlip.current
    const joiners = pendingJoinIds.current
    pendingFlip.current = null
    pendingJoinIds.current = []
    if (!state && !joiners.length) return
    const tbody = tbodyRef.current
    if (!tbody) return

    const joinerSet = new Set(joiners)
    const targets = [...tbody.querySelectorAll<HTMLElement>('[data-project-id]')]
    const stayers = targets.filter((row) => !joinerSet.has(row.dataset.projectId ?? ''))

    // Stayers: text + hairline rest before Flip so we never flash empty rules.
    // nested:false - Flip must not touch scroll-enter char transforms (clipped empty lines).
    for (const row of stayers) {
      settleRowChrome(row)
      gsap.set(row, { autoAlpha: 1 })
    }

    if (state && stayers.length) {
      Flip.from(state, {
        targets: stayers,
        duration: ROW_FLIP_S,
        ease: 'power1.inOut',
        absolute: false,
        nested: false,
        simple: true,
        prune: true,
        onComplete: () => {
          revealPaintedRows(tbody)
        },
      })
    } else {
      revealPaintedRows(tbody)
    }

    // Joiners always soft-enter explicitly - Flip onEnter is unreliable on <tr>.
    for (const id of joiners) {
      const row = tbody.querySelector<HTMLElement>(`[data-project-id="${id}"]`)
      if (row) playRowEnter(row)
    }
  }, [live, active, painted])

  /* Same filter, more pages: append and soft-enter only the new rows. */
  useLayoutEffect(() => {
    if (!live || !active || !entered.current) return
    if (pendingFlip.current) return
    if (target.length <= painted.length) return
    const prefixOk = painted.every((row, index) => row.id === target[index]?.id)
    if (!prefixOk) return
    const joiners = target.slice(painted.length).map((row) => row.id)
    pendingJoinIds.current = joiners
    pendingFlip.current = null
    setPainted(target)
    rowCount.current = target.length
  }, [live, active, target, painted])

  useEffect(() => {
    if (!live || !active || !hasMore) return
    const sentinel = sentinelRef.current
    const root = scrollViewportRef.current
    if (!sentinel || !root) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        setPage((prev) => prev + 1)
      },
      { root, rootMargin: '80px 0px', threshold: 0 },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [live, active, hasMore, painted.length])

  const onSearch = useCallback((value: string) => {
    setDraft(value)
  }, [])

  return (
    <div ref={panelRef} className="theme-projects-lcl__panel" data-scene-nest-scroll>
      <GrasSearch
        label="Search projects"
        className="theme-projects-lcl__search"
        onValueChange={onSearch}
      />
      <div className="theme-projects-lcl__table-shell">
        <div className="theme-projects-lcl__head-block theme-hairline-fx">
          <table className="theme-lcl-table theme-projects-lcl__table theme-projects-lcl__table-head" data-mode="index">
            <thead className="theme-projects-lcl__thead">
              <tr>
                <th scope="col">
                  <span className="theme-lcl-table__head theme-projects-lcl__head">
                    <ScrollEnterText split="line" bind="none" className="type-body mb-0">
                      Name
                    </ScrollEnterText>
                  </span>
                </th>
                <th scope="col">
                  <span className="theme-lcl-table__head theme-projects-lcl__head">
                    <ScrollEnterText split="line" bind="none" className="type-body mb-0">
                      Description
                    </ScrollEnterText>
                  </span>
                </th>
                <th scope="col" className="theme-projects-lcl__access-head">
                  <div
                    ref={filtersRef}
                    className="theme-projects-lcl__access-filters"
                    data-split={filtersSplit ? 'yes' : 'no'}
                    role="group"
                    aria-label="Filter by access"
                  >
                    {PROJECT_ACCESS_FILTERS.map((kind) => {
                      const on = accessOn.includes(kind)
                      return (
                        <span key={kind} data-fab-kind={kind} className="theme-projects-lcl__access-fab-slot">
                          <ScrollEnterText split="line" bind="none">
                            <Tooltip content={AccessLabel(kind)} placement="top">
                              <Fab
                                size="xs"
                                variant="ghost"
                                icon={AccessLucide(kind)}
                                aria-label={`${on ? 'Clear' : 'Filter'} ${AccessLabel(kind)}`}
                                aria-pressed={on}
                                className={[
                                  'theme-fab--inline',
                                  'theme-projects-lcl__access-fab',
                                  `theme-projects-lcl__access-fab--${kind}`,
                                  on ? 'is-on' : '',
                                ]
                                  .filter(Boolean)
                                  .join(' ')}
                                onClick={() => toggleAccess(kind)}
                              />
                            </Tooltip>
                          </ScrollEnterText>
                        </span>
                      )
                    })}
                  </div>
                </th>
                <th scope="col">
                  <span className="theme-lcl-table__head theme-projects-lcl__head theme-projects-lcl__more-head">
                    <ScrollEnterText split="line" bind="none" className="type-body mb-0">
                      See more
                    </ScrollEnterText>
                  </span>
                </th>
              </tr>
            </thead>
          </table>
          <span className="theme-hairline-fx__wipe" aria-hidden>
            <span className="theme-hairline-fx__rule" />
          </span>
        </div>
        <ThemeScroll
          rail="nano"
          scrollClouds
          smooth
          viewportRef={scrollViewportRef}
          className="theme-projects-lcl__scroll theme-lcl-table__scroll"
          contentClassName="theme-projects-lcl__scroll-content"
        >
          <table className="theme-lcl-table theme-projects-lcl__table theme-projects-lcl__table-body" data-mode="index">
            <tbody ref={tbodyRef}>
              {painted.map((row) => (
                <ProjectRow key={row.id} row={row} onSelectProject={onSelectProject} />
              ))}
            </tbody>
          </table>
          {hasMore ? <div ref={sentinelRef} className="theme-projects-lcl__sentinel" aria-hidden /> : null}
          {filtered.length === 0 && painted.length === 0 ? (
            <p className="theme-projects-lcl__empty type-caption type-muted mb-0">No projects match.</p>
          ) : null}
        </ThemeScroll>
      </div>
    </div>
  )
}

function ProjectRow({
  row,
  onSelectProject,
}: {
  row: ProjectCatalogRow
  onSelectProject?: (id: string) => void
}) {
  const desc = truncateDesc(row.desc)
  // Do not settle on mount - bind=none parks for playProjectsHostsIn; Flip / playRowEnter settle remounts.
  const open = () => onSelectProject?.(row.id)
  return (
    <tr
      className="theme-lcl-table__row theme-hairline-fx theme-hairline-fx--eirene"
      data-project-id={row.id}
    >
      <td className="theme-projects-lcl__name">
        <button type="button" className="theme-lcl-table__cell type-caption mb-0" onClick={open}>
          <ScrollEnterText split="line" bind="none">
            {row.name}
          </ScrollEnterText>
        </button>
      </td>
      <td className="theme-projects-lcl__desc" title={row.desc}>
        <span className="theme-lcl-table__cell type-caption mb-0">
          <ScrollEnterText split="line" bind="none">
            {desc}
          </ScrollEnterText>
        </span>
      </td>
      <td className="theme-projects-lcl__access">
        <span className="theme-lcl-table__cell">
          <ul className="theme-projects-lcl__access-list">
            {row.access.map((kind) => (
              <li key={kind} title={AccessLabel(kind)}>
                <ScrollEnterText split="line" bind="none">
                  <span className={`theme-projects-lcl__access-icon theme-projects-lcl__access-icon--${kind}`}>
                    <AccessIcon kind={kind} size={13} />
                  </span>
                </ScrollEnterText>
              </li>
            ))}
          </ul>
        </span>
      </td>
      <td className="theme-projects-lcl__more">
        <span className="theme-lcl-table__cell">
          <ScrollEnterText split="line" bind="none">
            <span className="theme-projects-lcl__more-icon">
              <IconButton
                type="button"
                size="xs"
                variant="ghost"
                icon={Eye}
                aria-label={`Open ${row.name}`}
                className="theme-projects-lcl__more-btn"
                onClick={open}
              />
            </span>
          </ScrollEnterText>
        </span>
        <span className="theme-hairline-fx__wipe" aria-hidden>
          <span className="theme-hairline-fx__pill" />
        </span>
      </td>
    </tr>
  )
}

export function ProjectsSoonOverlay({ active, awaitingSettle, onSelectProject }: ProjectsSoonOverlayProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const entered = useRef(false)
  const leaving = useRef(false)
  const motionGen = useRef(0)
  const activeRef = useRef(active)
  const timer = useRef(0)
  const [live, setLive] = useState(false)
  const [enterTicket, setEnterTicket] = useState(0)

  activeRef.current = active

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    if (!active) {
      window.clearTimeout(timer.current)
      if (!entered.current) {
        setLive(false)
        return
      }
      // Already leaving - keep live until outs finish; do not unmount mid-tween.
      if (leaving.current) return
      leaving.current = true
      const gen = ++motionGen.current
      void playProjectsHostsOut(root).then(() => {
        if (gen !== motionGen.current) return
        leaving.current = false
        if (activeRef.current) {
          // Scroll back during / after leave - re-enter instead of staying blank.
          entered.current = true
          setLive(true)
          setEnterTicket((ticket) => ticket + 1)
          return
        }
        entered.current = false
        setLive(false)
      })
      return
    }
    window.clearTimeout(timer.current)
    if (leaving.current) {
      // Interrupt leave: cancel completion, rise chrome back in.
      motionGen.current += 1
      leaving.current = false
      entered.current = true
      setLive(true)
      setEnterTicket((ticket) => ticket + 1)
      return
    }
    if (entered.current) return
    const playIn = () => {
      const host = rootRef.current
      if (!host || entered.current || !activeRef.current) return
      entered.current = true
      setLive(true)
      setEnterTicket((ticket) => ticket + 1)
    }
    if (awaitingSettle) {
      timer.current = window.setTimeout(playIn, PROJECTS_SOON_LCL_IN_S * 1000)
      return () => window.clearTimeout(timer.current)
    }
    playIn()
    return undefined
  }, [active, awaitingSettle])

  useEffect(() => {
    return () => window.clearTimeout(timer.current)
  }, [])

  return (
    <div
      ref={rootRef}
      className={`theme-lcl-layout theme-about-home-lcl theme-projects-lcl${live ? ' is-live' : ''}`}
      aria-hidden={!live}
      aria-label="Projects"
    >
      {lclScene('projectsSoon').sections.map((section, index) => {
        const place = gridPlacementFromCells(section.cells)
        if (!place) return null
        return (
          <div
            key={section.id}
            className="theme-lcl-layout__tile"
            data-id={section.id}
            data-tone={String(index % 8)}
            data-cs={String(place.columnStart)}
            data-ce={String(place.columnEnd)}
            data-rs={String(place.rowStart)}
            data-re={String(place.rowEnd)}
            aria-label={section.label}
          >
            {section.id === 's1' && live ? (
              <ProjectsPanel
                live={live}
                active={active}
                enterTicket={enterTicket}
                onSelectProject={onSelectProject}
              />
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

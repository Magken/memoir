/**
 * Projects text-canvas LCL on `/`. Top s1 is the project / section title.
 * Center s2: breadcrumb (top left), prose, nest list.
 * Trail starts Search → project title; only Search leaves to the catalog.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { flushSync } from 'react-dom'
import { gsap } from '../lib/gsap'
import {
  playLclProseIn,
  playLclProseOut,
  playScrollHairlineIn,
  playScrollHairlineOut,
  startLclCrumbIn,
  startLclCrumbOut,
  startLclListIn,
  startLclListOut,
  tweenChainReady,
  type LclPlayHandle,
} from '../lib/animations/scrollEnter'
import { PROSE_INLINE_CLASS, PROSE_INLINE_P_CLASS, proseInlineLinkClass, type ProseInlineLinkSize } from '../lib/animations/proseInlineLinks'
import {
  projectsDetailById,
  projectsDetailSectionByLabel,
  projectsDetailStub,
  type ProjectsDetailDoc,
} from '../lib/lcl/projectsDetailContent'
import { PROJECTS_CATALOG_FIXTURES } from '../lib/lcl/projectsSoonContent'
import { gridPlacementFromCells } from '../lib/lcl/viewportSections'
import { lclScene } from '../lib/lcl/lclScenes'
import { LclBreadcrumb } from './LclBreadcrumb'
import { GrasUnderlineButton } from './GrasUnderlineButton'
import { ScrollEnterText } from './ScrollEnterText'
import { TypeAnimText } from './TypeAnimText'

/** Most of the 2 s Home → Text canvas hop. */
export const PROJECTS_DETAIL_LCL_IN_S = 1.6
/** Catalog root crumb - only this depth leaves the detail LCL. */
export const PROJECTS_DETAIL_SEARCH_LABEL = 'Search'

type ProjectsDetailOverlayProps = {
  active: boolean
  awaitingSettle: boolean
  /** Catalog row id. Null while inactive. */
  projectId: string | null
  /** Leave detail → catalog (Search crumb or page wheel-back). */
  onBackToCatalog: () => void
}

function NoteLink({
  label,
  children,
  onOpen,
  size = 'sm',
}: {
  label: string
  children: ReactNode
  onOpen: (label: string) => void
  size?: ProseInlineLinkSize
}) {
  return (
    <a
      href={`#project-${encodeURIComponent(label)}`}
      className={proseInlineLinkClass(size)}
      onClick={(event) => {
        event.preventDefault()
        onOpen(label)
      }}
    >
      {children}
    </a>
  )
}

function DisplayChars({ text, className }: { text: string; className?: string }) {
  return (
    <span className={`theme-scroll-enter${className ? ` ${className}` : ''}`}>
      <span className="theme-scroll-enter__mask">
        <span className="theme-scroll-enter__line">
          <span className="theme-scroll-enter__word">
            {text.split('').map((char, index) =>
              char === ' ' ? (
                <span key={`sp-${index}`} className="theme-scroll-enter__space" aria-hidden>
                  {' '}
                </span>
              ) : (
                <span key={`ch-${index}`} className="theme-scroll-enter__char" aria-hidden>
                  {char}
                </span>
              ),
            )}
          </span>
        </span>
      </span>
    </span>
  )
}

function ProjectDisplay({ title, displayRef }: { title: string; displayRef: RefObject<HTMLDivElement | null> }) {
  return (
    <div ref={displayRef} className="theme-hairline-fx theme-about-collab-lcl__display">
      <div className="theme-lcl-preview__display-head theme-about-home-lcl__head">
        <p className="theme-about-home-lcl__stack type-display-lg mb-0" aria-label={title}>
          <DisplayChars text={title} />
        </p>
        <span className="theme-hairline-fx__wipe" aria-hidden>
          <span className="theme-hairline-fx__rule" />
        </span>
      </div>
    </div>
  )
}

function resolveDoc(projectId: string | null): ProjectsDetailDoc | null {
  if (!projectId) return null
  const known = projectsDetailById(projectId)
  if (known) return known
  const row = PROJECTS_CATALOG_FIXTURES.find((item) => item.id === projectId)
  if (!row) return projectsDetailStub(projectId, projectId, 'Project detail.')
  return projectsDetailStub(row.id, row.name, row.desc)
}

function DetailPanel({
  live,
  doc,
  path,
  setPath,
  displayRef,
  onBackToCatalog,
}: {
  live: boolean
  doc: ProjectsDetailDoc
  path: string[]
  setPath: (next: string[]) => void
  displayRef: RefObject<HTMLDivElement | null>
  onBackToCatalog: () => void
}) {
  const headRef = useRef<HTMLDivElement>(null)
  const crumbHostRef = useRef<HTMLElement | null>(null)
  const nestRef = useRef<HTMLUListElement>(null)
  const stepsRef = useRef<HTMLDivElement>(null)
  const busyRef = useRef(false)
  const lineReady = useRef(false)
  const pendingIn = useRef<'crumb' | 'body' | null>(null)

  const [showList, setShowList] = useState(false)
  const [showCrumb, setShowCrumb] = useState(false)
  const [showSteps, setShowSteps] = useState(false)

  // Path is [projectName, ...opened sections]. Root landing is already two crumbs deep.
  const atRoot = path.length <= 1
  const current = atRoot ? undefined : projectsDetailSectionByLabel(doc, path[path.length - 1] ?? '')

  useLayoutEffect(() => {
    if (!live) {
      setShowList(false)
      setShowCrumb(false)
      setShowSteps(false)
      busyRef.current = false
      lineReady.current = false
      pendingIn.current = null
      return
    }
    pendingIn.current = 'crumb'
    setShowCrumb(true)
  }, [live])

  useLayoutEffect(() => {
    if (!live || pendingIn.current !== 'crumb' || !showCrumb) return
    const crumb = crumbHostRef.current
    const head = headRef.current
    if (!crumb) return
    pendingIn.current = null
    void (async () => {
      const crumbIn = startLclCrumbIn(crumb, gsap)
      if (head && !lineReady.current) {
        playScrollHairlineIn(head, gsap)
        lineReady.current = true
      }
      await crumbIn.ready
      pendingIn.current = 'body'
      setShowSteps(true)
      if (atRoot) setShowList(true)
    })()
  }, [live, showCrumb, atRoot, path])

  useLayoutEffect(() => {
    if (!live || pendingIn.current !== 'body' || !showSteps) return
    const steps = stepsRef.current
    const list = nestRef.current
    pendingIn.current = null
    void (async () => {
      const prose = steps ? playLclProseIn(steps, gsap) : null
      await tweenChainReady(prose)
      if (list && atRoot) await startLclListIn(list, gsap).done
      else if (prose) await tweenChainReady(prose, 'complete')
      busyRef.current = false
    })()
  }, [live, showSteps, showList, atRoot, path])

  async function openSection(label: string) {
    if (busyRef.current) return
    if (atRoot) {
      if (!projectsDetailSectionByLabel(doc, label)) return
    } else {
      const parent = projectsDetailSectionByLabel(doc, path[path.length - 1] ?? '')
      const child = parent?.subsections?.find((section) => section.label === label)
      if (!child) return
    }
    const list = nestRef.current
    const steps = stepsRef.current
    const crumb = crumbHostRef.current
    const head = headRef.current
    const display = displayRef.current
    if (!crumb || !display) return
    busyRef.current = true
    const lineOut = head ? playScrollHairlineOut(head, gsap) : null

    let listOut: LclPlayHandle | null = null
    if (list && showList) {
      listOut = startLclListOut(list, gsap)
      await listOut.ready
    }

    let stepsOut: LclPlayHandle | null = null
    if (steps && showSteps) {
      stepsOut = playLclProseOut(steps, gsap)
      await stepsOut.ready
    }

    const crumbOut = startLclCrumbOut(crumb, gsap)
    await crumbOut.ready

    const displayOut = startLclListOut(display, gsap)
    await displayOut.ready

    await Promise.all([
      listOut?.done ?? Promise.resolve(),
      stepsOut?.done ?? Promise.resolve(),
      crumbOut.done,
      displayOut.done,
      tweenChainReady(lineOut, 'complete'),
    ])
    lineReady.current = false
    setShowList(false)
    setShowSteps(false)
    setShowCrumb(false)
    flushSync(() => {
      setPath([...path, label])
    })
    const nextDisplay = displayRef.current
    if (nextDisplay) {
      const displayIn = startLclListIn(nextDisplay, gsap)
      await displayIn.ready
    }
    pendingIn.current = 'crumb'
    setShowCrumb(true)
  }

  async function goToDepth(depth: number) {
    if (busyRef.current) return
    // Search crumb (depth 0) leaves the detail LCL back to the catalog.
    if (depth === 0) {
      onBackToCatalog()
      return
    }
    // Project title is depth 1; deeper ancestors truncate path without leaving.
    if (atRoot || depth < 1 || depth >= path.length) return
    const crumb = crumbHostRef.current
    const head = headRef.current
    const steps = stepsRef.current
    const display = displayRef.current
    if (!display) return
    busyRef.current = true
    const lineOut = head ? playScrollHairlineOut(head, gsap) : null

    let stepsOut: LclPlayHandle | null = null
    if (steps && showSteps) {
      stepsOut = playLclProseOut(steps, gsap)
      await stepsOut.ready
    }

    let crumbOut: LclPlayHandle | null = null
    if (crumb && showCrumb) {
      crumbOut = startLclCrumbOut(crumb, gsap)
      await crumbOut.ready
    }

    const displayOut = startLclListOut(display, gsap)
    await displayOut.ready

    await Promise.all([
      stepsOut?.done ?? Promise.resolve(),
      crumbOut?.done ?? Promise.resolve(),
      displayOut.done,
      tweenChainReady(lineOut, 'complete'),
    ])
    lineReady.current = false

    setShowList(false)
    setShowSteps(false)
    setShowCrumb(false)
    flushSync(() => {
      setPath(path.slice(0, depth))
    })
    const nextDisplay = displayRef.current
    if (nextDisplay) {
      const displayIn = startLclListIn(nextDisplay, gsap)
      await displayIn.ready
    }
    pendingIn.current = 'crumb'
    setShowCrumb(true)
  }

  if (!live) return null

  return (
    <>
      <div className="theme-hairline-fx" ref={headRef}>
        <div className="theme-lcl-preview__display-head">
          {showCrumb ? (
            <LclBreadcrumb
              ref={crumbHostRef}
              key={path.join('|') || doc.id}
              path={path}
              rootLabel={PROJECTS_DETAIL_SEARCH_LABEL}
              onSelect={(depth) => void goToDepth(depth)}
            />
          ) : null}
          <span className="theme-hairline-fx__wipe" aria-hidden>
            <span className="theme-hairline-fx__rule" />
          </span>
        </div>
      </div>

      {showSteps && atRoot ? (
        <div
          ref={stepsRef}
          className={`theme-lcl-preview__text-steps theme-about-home-lcl__steps ${PROSE_INLINE_CLASS}`}
          aria-label={doc.name}
          key="intro"
        >
          <p className={`${PROSE_INLINE_P_CLASS} type-body-lg`}>{doc.intro}</p>
        </div>
      ) : null}

      {showList && atRoot ? (
        <ul ref={nestRef} className="theme-lcl-layout__nest" key="pillars" aria-label={doc.name}>
          {doc.pillars.map((pillar) => (
            <li key={pillar.id}>
              <GrasUnderlineButton layout="nest" onClick={() => void openSection(pillar.label)}>
                <ScrollEnterText split="line" bind="none">
                  <TypeAnimText anim="slide-left" trigger="hover" className="type-h3 mb-0">
                    {pillar.label}
                  </TypeAnimText>
                </ScrollEnterText>
              </GrasUnderlineButton>
            </li>
          ))}
        </ul>
      ) : null}

      {showSteps && current ? (
        <div
          ref={stepsRef}
          className={`theme-lcl-preview__text-steps theme-about-home-lcl__steps ${PROSE_INLINE_CLASS}`}
          aria-label={current.label}
          key={current.id}
        >
          <p className={`${PROSE_INLINE_P_CLASS} type-body-lg`}>
            {current.relation}
            {current.subsections && current.subsections.length > 0 ? (
              <>
                {' '}
                {current.subsections.map((sub, index) => (
                  <span key={sub.id}>
                    {index > 0 ? ', ' : null}
                    <NoteLink label={sub.label} onOpen={(label) => void openSection(label)}>
                      {sub.linkText ?? sub.label}
                    </NoteLink>
                  </span>
                ))}
              </>
            ) : null}
            {current.relationAfter ?? null}
          </p>
          {current.links && current.links.length > 0 ? (
            <ul className="theme-about-home-lcl__refs" aria-label="Links">
              {current.links.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="theme-about-home-lcl__ref-link type-body-sm"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </>
  )
}

export function ProjectsDetailOverlay({
  active,
  awaitingSettle,
  projectId,
  onBackToCatalog,
}: ProjectsDetailOverlayProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const displayRef = useRef<HTMLDivElement | null>(null)
  const entered = useRef(false)
  const leaving = useRef(false)
  const motionGen = useRef(0)
  const activeRef = useRef(active)
  const timer = useRef(0)
  const [live, setLive] = useState(false)
  const [path, setPath] = useState<string[]>([])

  activeRef.current = active

  const doc = useMemo(() => resolveDoc(projectId), [projectId])
  const displayTitle = path.length === 0 ? (doc?.name ?? '') : (path[path.length - 1] ?? doc?.name ?? '')

  useLayoutEffect(() => {
    if (!live || !doc) {
      setPath([])
      return
    }
    setPath([doc.name])
  }, [live, projectId, doc])

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    if (!active) {
      window.clearTimeout(timer.current)
      if (!entered.current) {
        setLive(false)
        return
      }
      if (leaving.current) return
      leaving.current = true
      const gen = ++motionGen.current
      const display = displayRef.current ?? root.querySelector<HTMLElement>('.theme-about-collab-lcl__display')
      const nest = root.querySelector<HTMLElement>('.theme-about-home-lcl__panel .theme-lcl-layout__nest')
      const steps = root.querySelector<HTMLElement>('.theme-about-home-lcl__steps')
      const crumb = root.querySelector<HTMLElement>('.theme-lcl-breadcrumb')
      const head = root.querySelector<HTMLElement>('.theme-about-home-lcl__panel > .theme-hairline-fx')
      const lineOut = head ? playScrollHairlineOut(head, gsap) : null
      const plays = [
        display ? startLclListOut(display, gsap) : null,
        nest ? startLclListOut(nest, gsap) : null,
        steps ? playLclProseOut(steps, gsap) : null,
        crumb ? startLclCrumbOut(crumb, gsap) : null,
      ]
      void Promise.all([
        ...plays.map((play) => (play ? play.done : Promise.resolve())),
        tweenChainReady(lineOut, 'complete'),
      ]).then(() => {
        if (gen !== motionGen.current) return
        leaving.current = false
        if (activeRef.current) {
          entered.current = true
          setLive(true)
          return
        }
        entered.current = false
        setLive(false)
      })
      return
    }
    window.clearTimeout(timer.current)
    if (leaving.current) {
      motionGen.current += 1
      leaving.current = false
      entered.current = true
      setLive(true)
      const display = displayRef.current
      if (display) startLclListIn(display, gsap)
      return
    }
    if (entered.current) return
    const playIn = () => {
      const host = rootRef.current
      if (!host || entered.current || !activeRef.current) return
      entered.current = true
      setLive(true)
      const display = displayRef.current ?? host.querySelector<HTMLElement>('.theme-about-collab-lcl__display')
      if (display) startLclListIn(display, gsap)
    }
    if (awaitingSettle) {
      timer.current = window.setTimeout(playIn, PROJECTS_DETAIL_LCL_IN_S * 1000)
      return () => window.clearTimeout(timer.current)
    }
    playIn()
    return undefined
  }, [active, awaitingSettle])

  useEffect(() => {
    return () => window.clearTimeout(timer.current)
  }, [])

  if (!doc) return null

  return (
    <div
      ref={rootRef}
      className={`theme-lcl-layout theme-about-home-lcl theme-about-collab-lcl${live ? ' is-live' : ''}`}
      aria-hidden={!live}
      aria-label={doc.name}
    >
      {lclScene('projectsDetail').sections.map((section, index) => {
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
              <ProjectDisplay title={displayTitle} displayRef={displayRef} />
            ) : null}
            {section.id === 's2' ? (
              <div className="theme-about-home-lcl__panel">
                <DetailPanel
                  live={live}
                  doc={doc}
                  path={path}
                  setPath={setPath}
                  displayRef={displayRef}
                  onBackToCatalog={onBackToCatalog}
                />
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

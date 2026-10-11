/**
 * About Text canvas stage-2 LCL on `/`. Left s1 matches stage 1 and holds
 * flipped **how we work** (or the open note). Center s2: motto, nest list,
 * and a breadcrumb section for each collaboration note.
 */
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { flushSync } from 'react-dom'
import { gsap } from '../lib/gsap'
import {
  playLclProseIn,
  playLclProseOut,
  playScrollHairlineIn,
  playScrollHairlineOut,
  startAboutHomeLclIn,
  startAboutHomeLclOut,
  startLclCrumbIn,
  startLclCrumbOut,
  startLclListIn,
  startLclListOut,
  tweenChainReady,
  type LclPlayHandle,
} from '../lib/animations/scrollEnter'
import { PROSE_INLINE_CLASS, PROSE_INLINE_P_CLASS, proseInlineLinkClass, type ProseInlineLinkSize } from '../lib/animations/proseInlineLinks'
import { splitAboutDisplayTitle } from '../lib/lcl/aboutHomeContent'
import {
  ABOUT_WORK_INTRO_REST,
  ABOUT_WORK_PILLARS,
  aboutWorkSectionByLabel,
} from '../lib/lcl/aboutWorkContent'
import { gridPlacementFromCells } from '../lib/lcl/viewportSections'
import { lclScene } from '../lib/lcl/lclScenes'
import { LclBreadcrumb } from './LclBreadcrumb'
import { GrasUnderlineButton } from './GrasUnderlineButton'
import { ScrollEnterText } from './ScrollEnterText'
import { TypeAnimText } from './TypeAnimText'

/** Most of the 2 s Home → Text canvas hop: play in as that shot is about to settle. */
export const ABOUT_WORK_LCL_IN_S = 1.6

/** Sideways display copy (two-line stack). */
export const ABOUT_WORK_DISPLAY = 'how we work'

/** Breadcrumb root while the section is still empty. */
export const ABOUT_WORK_ROOT_LABEL = 'How we work'

type AboutWorkOverlayProps = {
  /** Stage 2 is on (Text canvas forward, or settled). */
  active: boolean
  /** Hop still running: wait `ABOUT_WORK_LCL_IN_S` before enter. */
  awaitingSettle: boolean
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
      href={`#work-${encodeURIComponent(label)}`}
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

function TitleStack({ title }: { title: string }) {
  const lines = splitAboutDisplayTitle(title)
  if (lines.length === 1) {
    return (
      <p className="theme-about-home-lcl__stack type-display-xl mb-0" aria-label={title}>
        <DisplayChars text={lines[0]} className="theme-about-home-lcl__who" />
      </p>
    )
  }
  return (
    <p className="theme-about-home-lcl__stack type-display-xl mb-0" aria-label={title}>
      <DisplayChars text={lines[0]} className="theme-about-home-lcl__who" />
      <DisplayChars text={lines[1]} className="theme-about-home-lcl__are" />
    </p>
  )
}

function WorkDisplay({ title, displayRef }: { title: string; displayRef: RefObject<HTMLDivElement | null> }) {
  return (
    <div ref={displayRef} className="theme-hairline-fx theme-about-home-lcl__display">
      <div className="theme-lcl-preview__display-head theme-about-home-lcl__head">
        <TitleStack title={title} />
        <span className="theme-hairline-fx__wipe" aria-hidden>
          <span className="theme-hairline-fx__rule" />
        </span>
      </div>
    </div>
  )
}

function WorkPanel({
  live,
  path,
  setPath,
  displayRef,
}: {
  live: boolean
  path: string[]
  setPath: (next: string[]) => void
  displayRef: RefObject<HTMLDivElement | null>
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

  const atRoot = path.length === 0
  const current = atRoot ? undefined : aboutWorkSectionByLabel(path[path.length - 1] ?? '')

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
      if (!aboutWorkSectionByLabel(label)) return
    } else {
      const parent = aboutWorkSectionByLabel(path[path.length - 1] ?? '')
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

    const displayOut = startAboutHomeLclOut(display, gsap)
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
      setPath(atRoot ? [label] : [...path, label])
    })
    const nextDisplay = displayRef.current
    if (nextDisplay) {
      const displayIn = startAboutHomeLclIn(nextDisplay, gsap)
      await displayIn.ready
    }
    pendingIn.current = 'crumb'
    setShowCrumb(true)
  }

  async function goToDepth(depth: number) {
    if (busyRef.current || atRoot || depth < 0 || depth >= path.length) return
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

    const displayOut = startAboutHomeLclOut(display, gsap)
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
      const displayIn = startAboutHomeLclIn(nextDisplay, gsap)
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
              key={path.join('|') || 'work'}
              path={path}
              rootLabel={ABOUT_WORK_ROOT_LABEL}
              rootWhenEmpty
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
          aria-label="How we work"
          key="intro"
        >
          <p className={`${PROSE_INLINE_P_CLASS} type-body-lg`}>
            <NoteLink label="SEARCH" size="sm" onOpen={(label) => void openSection(label)}>
              SEARCH
            </NoteLink>
            {', '}
            <NoteLink label="CREATE" size="sm" onOpen={(label) => void openSection(label)}>
              CREATE
            </NoteLink>
            {', '}
            <NoteLink label="CONNECT" size="sm" onOpen={(label) => void openSection(label)}>
              CONNECT
            </NoteLink>
            {'. '}
            {ABOUT_WORK_INTRO_REST}
          </p>
        </div>
      ) : null}

      {showList && atRoot ? (
        <ul ref={nestRef} className="theme-lcl-layout__nest" key="pillars" aria-label="How we work">
          {ABOUT_WORK_PILLARS.map((pillar) => (
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

export function AboutWorkOverlay({ active, awaitingSettle }: AboutWorkOverlayProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const displayRef = useRef<HTMLDivElement | null>(null)
  const entered = useRef(false)
  const leaving = useRef(false)
  const timer = useRef(0)
  const [live, setLive] = useState(false)
  const [path, setPath] = useState<string[]>([])

  const displayTitle = path.length === 0 ? ABOUT_WORK_DISPLAY : (path[path.length - 1] ?? ABOUT_WORK_DISPLAY)

  useLayoutEffect(() => {
    if (!live) setPath([])
  }, [live])

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    if (!active) {
      window.clearTimeout(timer.current)
      if (!entered.current || leaving.current) {
        setLive(false)
        return
      }
      leaving.current = true
      const display = displayRef.current ?? root.querySelector<HTMLElement>('.theme-about-home-lcl__display')
      const nest = root.querySelector<HTMLElement>('.theme-about-home-lcl__panel .theme-lcl-layout__nest')
      const steps = root.querySelector<HTMLElement>('.theme-about-home-lcl__steps')
      const crumb = root.querySelector<HTMLElement>('.theme-lcl-breadcrumb')
      const head = root.querySelector<HTMLElement>('.theme-about-home-lcl__panel > .theme-hairline-fx')
      const lineOut = head ? playScrollHairlineOut(head, gsap) : null
      const plays = [
        display ? startAboutHomeLclOut(display, gsap) : null,
        nest ? startLclListOut(nest, gsap) : null,
        steps ? playLclProseOut(steps, gsap) : null,
        crumb ? startLclCrumbOut(crumb, gsap) : null,
      ]
      void Promise.all([
        ...plays.map((play) => (play ? play.done : Promise.resolve())),
        tweenChainReady(lineOut, 'complete'),
      ]).then(() => {
        leaving.current = false
        entered.current = false
        setLive(false)
      })
      return
    }
    if (entered.current || leaving.current) return
    const playIn = () => {
      const host = rootRef.current
      if (!host || entered.current) return
      entered.current = true
      setLive(true)
      const display = displayRef.current ?? host.querySelector<HTMLElement>('.theme-about-home-lcl__display')
      if (display) startAboutHomeLclIn(display, gsap)
    }
    if (awaitingSettle) {
      timer.current = window.setTimeout(playIn, ABOUT_WORK_LCL_IN_S * 1000)
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
      className={`theme-lcl-layout theme-about-home-lcl${live ? ' is-live' : ''}`}
      aria-hidden={!live}
      aria-label="How we work"
    >
      {lclScene('aboutWork').sections.map((section, index) => {
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
            {section.id === 's1' ? <WorkDisplay title={displayTitle} displayRef={displayRef} /> : null}
            {section.id === 's2' ? (
              <div className="theme-about-home-lcl__panel">
                <WorkPanel live={live} path={path} setPath={setPath} displayRef={displayRef} />
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

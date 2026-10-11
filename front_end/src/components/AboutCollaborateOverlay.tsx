/**
 * About Text inset stage-3 LCL on `/`. Top-right s1 is the horizontal title.
 * Center s2 is the breadcrumb, the paragraph, and a one-row Coming soon list.
 */
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
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
} from '../lib/animations/scrollEnter'
import { PROSE_INLINE_CLASS, PROSE_INLINE_P_CLASS } from '../lib/animations/proseInlineLinks'
import { ABOUT_COLLAB_DISPLAY, ABOUT_COLLAB_INTRO, ABOUT_COLLAB_SOON, aboutCollabTitleRows } from '../lib/lcl/aboutCollaborateContent'
import { gridPlacementFromCells } from '../lib/lcl/viewportSections'
import { lclScene } from '../lib/lcl/lclScenes'
import { LclBreadcrumb } from './LclBreadcrumb'
import { GrasUnderlineButton } from './GrasUnderlineButton'
import { ScrollEnterText } from './ScrollEnterText'
import { TypeAnimText } from './TypeAnimText'

/** Most of the 3.2 s Text canvas → Text inset hop. */
export const ABOUT_COLLAB_LCL_IN_S = 2.6

type AboutCollaborateOverlayProps = {
  /** Stage 3 is on (Text inset forward, or settled). */
  active: boolean
  /** Hop still running: wait `ABOUT_COLLAB_LCL_IN_S` before enter. */
  awaitingSettle: boolean
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

function TitleLine({ displayRef }: { displayRef: RefObject<HTMLDivElement | null> }) {
  const rows = aboutCollabTitleRows()
  return (
    <div ref={displayRef} className="theme-hairline-fx theme-about-collab-lcl__display">
      <div className="theme-lcl-preview__display-head theme-about-home-lcl__head">
        <p className="theme-about-home-lcl__stack type-display-lg mb-0" aria-label={ABOUT_COLLAB_DISPLAY}>
          {rows.map((row) => (
            <DisplayChars key={row} text={row} />
          ))}
        </p>
        <span className="theme-hairline-fx__wipe" aria-hidden>
          <span className="theme-hairline-fx__rule" />
        </span>
      </div>
    </div>
  )
}

function CollabPanel({ live }: { live: boolean }) {
  const headRef = useRef<HTMLDivElement>(null)
  const crumbHostRef = useRef<HTMLElement | null>(null)
  const stepsRef = useRef<HTMLDivElement>(null)
  const nestRef = useRef<HTMLUListElement>(null)
  const lineReady = useRef(false)
  const pendingIn = useRef<'crumb' | 'body' | null>(null)
  const [showCrumb, setShowCrumb] = useState(false)
  const [showSteps, setShowSteps] = useState(false)
  const [showList, setShowList] = useState(false)

  useLayoutEffect(() => {
    if (!live) {
      setShowCrumb(false)
      setShowSteps(false)
      setShowList(false)
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
      setShowList(true)
    })()
  }, [live, showCrumb])

  useLayoutEffect(() => {
    if (!live || pendingIn.current !== 'body' || !showSteps) return
    const steps = stepsRef.current
    const list = nestRef.current
    pendingIn.current = null
    void (async () => {
      const prose = steps ? playLclProseIn(steps, gsap) : null
      await tweenChainReady(prose)
      if (list) await startLclListIn(list, gsap).done
    })()
  }, [live, showSteps])

  if (!live) return null

  return (
    <div className="theme-about-home-lcl__panel">
      <div className="theme-hairline-fx" ref={headRef}>
        <div className="theme-lcl-preview__display-head">
          {showCrumb ? (
            <LclBreadcrumb
              ref={crumbHostRef}
              path={[]}
              rootLabel={ABOUT_COLLAB_DISPLAY}
              rootWhenEmpty
              onSelect={() => {}}
            />
          ) : null}
          <span className="theme-hairline-fx__wipe" aria-hidden>
            <span className="theme-hairline-fx__rule" />
          </span>
        </div>
      </div>
      {showSteps ? (
        <div
          ref={stepsRef}
          className={`theme-lcl-preview__text-steps theme-about-home-lcl__steps ${PROSE_INLINE_CLASS}`}
          aria-label="Collaborate with us"
        >
          <p className={`${PROSE_INLINE_P_CLASS} type-body-lg`}>{ABOUT_COLLAB_INTRO}</p>
        </div>
      ) : null}
      {showList ? (
        <ul ref={nestRef} className="theme-lcl-layout__nest" aria-label="Collaborate with us">
          <li>
            <GrasUnderlineButton layout="nest">
              <ScrollEnterText split="line" bind="none">
                <TypeAnimText anim="slide-left" trigger="hover" className="type-h3 mb-0">
                  {ABOUT_COLLAB_SOON}
                </TypeAnimText>
              </ScrollEnterText>
            </GrasUnderlineButton>
          </li>
        </ul>
      ) : null}
    </div>
  )
}

export function AboutCollaborateOverlay({ active, awaitingSettle }: AboutCollaborateOverlayProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const displayRef = useRef<HTMLDivElement | null>(null)
  const entered = useRef(false)
  const leaving = useRef(false)
  const timer = useRef(0)
  const [live, setLive] = useState(false)

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
      const display = displayRef.current
      const crumb = root.querySelector<HTMLElement>('.theme-lcl-breadcrumb')
      const head = root.querySelector<HTMLElement>('.theme-about-home-lcl__panel > .theme-hairline-fx')
      const steps = root.querySelector<HTMLElement>('.theme-about-home-lcl__steps')
      const nest = root.querySelector<HTMLElement>('.theme-about-home-lcl__panel .theme-lcl-layout__nest')
      const plays = [
        display ? startLclListOut(display, gsap) : null,
        nest ? startLclListOut(nest, gsap) : null,
        steps ? playLclProseOut(steps, gsap) : null,
        crumb ? startLclCrumbOut(crumb, gsap) : null,
      ]
      const lineOut = head ? playScrollHairlineOut(head, gsap) : null
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
      const display = displayRef.current
      if (display) startLclListIn(display, gsap)
    }
    if (awaitingSettle) {
      timer.current = window.setTimeout(playIn, ABOUT_COLLAB_LCL_IN_S * 1000)
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
      className={`theme-lcl-layout theme-about-home-lcl theme-about-collab-lcl${live ? ' is-live' : ''}`}
      aria-hidden={!live}
      aria-label="Collaborate with us"
    >
      {lclScene('aboutCollaborate').sections.map((section, index) => {
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
            {section.id === 's1' ? <TitleLine displayRef={displayRef} /> : null}
            {section.id === 's2' ? <CollabPanel live={live} /> : null}
          </div>
        )
      })}
    </div>
  )
}

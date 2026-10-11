/**
 * Footer LCL on `/`. One tile: home subtitle, hairline, compact left links.
 */
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { gsap } from '../lib/gsap'
import { startLclListIn, startLclListOut } from '../lib/animations/scrollEnter'
import { FOOTER_COPYRIGHT, FOOTER_HOME_LABEL, FOOTER_LINKS, FOOTER_MARK, type FooterLinkId } from '../lib/lcl/footerLinksContent'
import { gridPlacementFromCells } from '../lib/lcl/viewportSections'
import { lclScene } from '../lib/lcl/lclScenes'
import { GrasUnderlineButton } from './GrasUnderlineButton'
import { ScrollEnterText } from './ScrollEnterText'
import { TypeAnimText } from './TypeAnimText'

/** Most of the 4 s Footer entrance. */
export const FOOTER_LCL_IN_S = 3.2

type FooterLinksOverlayProps = {
  /** Footer is on (entrance forward, or settled at Home). */
  active: boolean
  /** Entrance still running: wait `FOOTER_LCL_IN_S` before enter. */
  awaitingSettle: boolean
  onOpen: (id: FooterLinkId) => void
}

function DisplayChars({ text }: { text: string }) {
  return (
    <span className="theme-scroll-enter">
      <span className="theme-scroll-enter__mask">
        <span className="theme-scroll-enter__line">
          <span className="theme-scroll-enter__word">
            {text.split('').map((char, index) => (
              <span key={`ch-${index}`} className="theme-scroll-enter__char" aria-hidden>
                {char}
              </span>
            ))}
          </span>
        </span>
      </span>
    </span>
  )
}

function MarkBlock({ markRef }: { markRef: RefObject<HTMLDivElement | null> }) {
  return (
    <div ref={markRef} className="theme-footer-mark">
      <p className="theme-footer-mark__name mb-0" aria-label={FOOTER_MARK}>
        <DisplayChars text={FOOTER_MARK} />
      </p>
      <p className="theme-footer-mark__legal type-body-sm mb-0">{FOOTER_COPYRIGHT}</p>
    </div>
  )
}

function LinkPanel({
  headRef,
  nestRef,
  onOpen,
}: {
  headRef: RefObject<HTMLDivElement | null>
  nestRef: RefObject<HTMLUListElement | null>
  onOpen: (id: FooterLinkId) => void
}) {
  return (
    <div className="theme-about-home-lcl__panel">
      <div className="theme-hairline-fx" ref={headRef}>
        <div className="theme-lcl-preview__display-head theme-about-home-lcl__head">
          <p className="theme-footer-home mb-0" aria-label={FOOTER_HOME_LABEL}>
            <DisplayChars text={FOOTER_HOME_LABEL} />
          </p>
          <span className="theme-hairline-fx__wipe" aria-hidden>
            <span className="theme-hairline-fx__rule" />
          </span>
        </div>
      </div>
      <ul ref={nestRef} className="theme-lcl-layout__nest" aria-label="Sections">
        {FOOTER_LINKS.map((link) => (
          <li key={link.id}>
            <GrasUnderlineButton layout="nest" onClick={() => onOpen(link.id)}>
              <ScrollEnterText split="line" bind="none">
                <TypeAnimText anim="slide-left" trigger="hover" className="type-body mb-0">
                  {link.label}
                </TypeAnimText>
              </ScrollEnterText>
            </GrasUnderlineButton>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function FooterLinksOverlay({ active, awaitingSettle, onOpen }: FooterLinksOverlayProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const headRef = useRef<HTMLDivElement | null>(null)
  const nestRef = useRef<HTMLUListElement | null>(null)
  const markRef = useRef<HTMLDivElement | null>(null)
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
      const head = headRef.current
      const nest = nestRef.current
      const mark = markRef.current
      const headOut = head ? startLclListOut(head, gsap) : null
      const nestOut = nest ? startLclListOut(nest, gsap) : null
      const markOut = mark ? startLclListOut(mark, gsap) : null
      void Promise.all([
        headOut ? headOut.done : Promise.resolve(),
        nestOut ? nestOut.done : Promise.resolve(),
        markOut ? markOut.done : Promise.resolve(),
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
      const head = headRef.current
      const nest = nestRef.current
      const mark = markRef.current
      if (head) startLclListIn(head, gsap)
      if (nest) startLclListIn(nest, gsap)
      if (mark) startLclListIn(mark, gsap)
    }
    if (awaitingSettle) {
      timer.current = window.setTimeout(playIn, FOOTER_LCL_IN_S * 1000)
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
      className={`theme-lcl-layout theme-about-home-lcl theme-footer-lcl${live ? ' is-live' : ''}`}
      aria-hidden={!live}
      aria-label="home"
    >
      {lclScene('footerLinks').sections.map((section, index) => {
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
            {section.id === 's1' ? <LinkPanel headRef={headRef} nestRef={nestRef} onOpen={onOpen} /> : null}
            {section.id === 's2' ? <MarkBlock markRef={markRef} /> : null}
          </div>
        )
      })}
    </div>
  )
}

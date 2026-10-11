/**
 * Menu LCL on `/` Home — top-center Menu, bottom-left Quick access (About · Projects).
 * Enter/out uses startLclListIn / Out (scroll-enter chars + hairline), same as Footer LCL.
 * Opening Menu eases lamp intensity to 0 and dims object RGB by 150; Quick access leaves.
 * Menu control: StrokeMenuIcon (hamburger → X) beside the underlined Menu label.
 * Icon is the same scroll-enter __char markup as Menu letters (driven only by startLclListIn / Out).
 * The menu body is empty for now.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { gsap } from '../lib/gsap'
import { startLclListIn, startLclListOut } from '../lib/animations/scrollEnter'
import {
  MENU_LCL_LABEL,
  MENU_LCL_QUICK_ACCESS_TITLE,
  MENU_LCL_QUICK_LINKS,
  MENU_LCL_RETREAT_DURATION,
  type MenuLclQuickId,
} from '../lib/lcl/menuLcl'
import { GrasUnderlineButton } from './GrasUnderlineButton'
import { ScrollEnterText } from './ScrollEnterText'
import { StrokeMenuIcon } from './StrokeMenuIcon'

type MenuLclOverlayProps = {
  /** Landing Home is on screen. */
  active: boolean
  /** Retreat progress 0–1 for lamp intensity → 0 + RGB dim. */
  onRetreat: (amount: number) => void
  /** Menu panel open — landing locks the scene wheel while true. */
  onMenuOpenChange?: (open: boolean) => void
  /** Quick access → About / Projects. */
  onOpen: (id: MenuLclQuickId) => void
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

export function MenuLclOverlay({ active, onRetreat, onMenuOpenChange, onOpen }: MenuLclOverlayProps) {
  const [open, setOpen] = useState(false)
  const [live, setLive] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const quickHeadRef = useRef<HTMLDivElement>(null)
  const quickRowRef = useRef<HTMLUListElement>(null)
  const entered = useRef(false)
  const leaving = useRef(false)
  const retreatTween = useRef<gsap.core.Tween | null>(null)
  const retreatProxy = useRef({ t: 0 })

  const playRetreat = (to: number) => {
    retreatTween.current?.kill()
    const proxy = retreatProxy.current
    retreatTween.current = gsap.to(proxy, {
      t: to,
      duration: MENU_LCL_RETREAT_DURATION,
      ease: 'power2.out',
      onUpdate: () => onRetreat(proxy.t),
      onComplete: () => onRetreat(to),
    })
  }

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    if (!active) {
      retreatTween.current?.kill()
      retreatProxy.current.t = 0
      onRetreat(0)
      setOpen(false)
      if (!entered.current || leaving.current) {
        setLive(false)
        return
      }
      leaving.current = true
      const menu = menuRef.current
      const head = quickHeadRef.current
      const row = quickRowRef.current
      const menuOut = menu ? startLclListOut(menu, gsap) : null
      const headOut = head ? startLclListOut(head, gsap) : null
      const rowOut = row ? startLclListOut(row, gsap) : null
      void Promise.all([
        menuOut?.done ?? Promise.resolve(),
        headOut?.done ?? Promise.resolve(),
        rowOut?.done ?? Promise.resolve(),
      ]).then(() => {
        leaving.current = false
        entered.current = false
        setLive(false)
      })
      return
    }
    if (entered.current || leaving.current) return
    entered.current = true
    setLive(true)
    const menu = menuRef.current
    const head = quickHeadRef.current
    const row = quickRowRef.current
    if (menu) startLclListIn(menu, gsap)
    if (head) startLclListIn(head, gsap)
    if (row) startLclListIn(row, gsap)
  }, [active, onRetreat])

  useLayoutEffect(() => {
    if (!live || !active) return
    const head = quickHeadRef.current
    const row = quickRowRef.current
    if (open) {
      if (head) void startLclListOut(head, gsap).done
      if (row) void startLclListOut(row, gsap).done
      return
    }
    if (head) startLclListIn(head, gsap)
    if (row) startLclListIn(row, gsap)
  }, [live, active, open])

  useEffect(() => {
    onMenuOpenChange?.(open)
  }, [open, onMenuOpenChange])

  useEffect(() => {
    if (!active) return
    playRetreat(open ? 1 : 0)
    return () => {
      retreatTween.current?.kill()
    }
  }, [open, active])

  if (!active && !live) return null

  return (
    <div
      ref={rootRef}
      className={`theme-menu-lcl${live ? ' is-live' : ''}${open ? ' is-open' : ''}`}
      aria-hidden={!live}
      aria-label="Menu LCL"
    >
      <div ref={menuRef} className="theme-menu-lcl__menu">
        {/* Same scroll-enter char unit as Menu letters — no ScrollEnterText useGSAP race. */}
        <span className="theme-scroll-enter theme-menu-lcl__menu-icon-enter">
          <span className="theme-scroll-enter__mask">
            <span className="theme-scroll-enter__line">
              <span className="theme-scroll-enter__word">
                <span className="theme-scroll-enter__char" aria-hidden>
                  <StrokeMenuIcon
                    variant="cross-1"
                    checked={open}
                    onCheckedChange={setOpen}
                    hit={false}
                    /* Tight crop around the three strokes — fills letter height, long bars. */
                    viewBox="0 38 62 24"
                    label={open ? 'Close menu' : 'Open menu'}
                    className="theme-menu-lcl__menu-icon"
                  />
                </span>
              </span>
            </span>
          </span>
        </span>
        <GrasUnderlineButton
          layout="inline"
          className="theme-menu-lcl__menu-btn"
          aria-expanded={open}
          aria-controls="menu-lcl-panel"
          onClick={(event) => {
            const button = event.currentTarget
            setOpen((prev) => !prev)
            if (open) button.blur()
          }}
        >
          <DisplayChars text={MENU_LCL_LABEL} className="type-display mb-0" />
        </GrasUnderlineButton>
      </div>

      <div id="menu-lcl-panel" className="theme-menu-lcl__panel" hidden={!open} aria-hidden={!open} />

      <div className="theme-menu-lcl__quick" aria-label={MENU_LCL_QUICK_ACCESS_TITLE}>
        <div ref={quickHeadRef} className="theme-menu-lcl__quick-head theme-hairline-fx">
          <p className="theme-menu-lcl__quick-title type-overline mb-0">
            <ScrollEnterText split="line" bind="none">
              {MENU_LCL_QUICK_ACCESS_TITLE}
            </ScrollEnterText>
          </p>
          <span className="theme-hairline-fx__wipe" aria-hidden>
            <span className="theme-hairline-fx__rule" />
          </span>
        </div>
        <ul ref={quickRowRef} className="theme-menu-lcl__quick-row">
          {MENU_LCL_QUICK_LINKS.map((link) => (
            <li key={link.id} className="theme-menu-lcl__quick-item">
              <GrasUnderlineButton
                layout="inline"
                onClick={() => {
                  setOpen(false)
                  onOpen(link.id)
                }}
              >
                <ScrollEnterText split="line" bind="none" className="type-h3 mb-0">
                  {link.label}
                </ScrollEnterText>
              </GrasUnderlineButton>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

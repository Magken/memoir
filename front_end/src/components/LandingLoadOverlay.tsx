/**
 * HTML load overlay on the landing canvas. One layout for the whole load:
 * LCL scroll-enter on fixed slots, then a hairline wipe under the word.
 * Flip is only a later digit change, or a letter turning into a shape.
 * The percent is the loaded-byte fraction, always three digits (`000%`).
 */
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { gsap } from '../lib/gsap'
import { startLclListIn, startLclListOut } from '../lib/animations/scrollEnter'
import { gridPlacementFromCells } from '../lib/lcl/viewportSections'
import { lclScene } from '../lib/lcl/lclScenes'
import { formatLoadPercent, pacedLoadPercent } from '../lib/webgl/assetPreload'

const WORD = 'loading'
const FLIP_S = 1.2
const SHAPES = ['plus', 'triangle', 'circle'] as const
type Shape = (typeof SHAPES)[number]

type LandingLoadOverlayProps = {
  progress: number
  onComplete: () => void
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function LoadShape({ shape }: { shape: Shape }) {
  if (shape === 'plus') {
    return (
      <svg className="theme-landing-load__shape" viewBox="0 0 24 24" aria-hidden>
        <path d="M12 5v14M5 12h14" />
      </svg>
    )
  }
  if (shape === 'triangle') {
    return (
      <svg className="theme-landing-load__shape" viewBox="0 0 24 24" aria-hidden>
        <path d="M12 5 20 19H4z" />
      </svg>
    )
  }
  return (
    <svg className="theme-landing-load__shape" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="7" />
    </svg>
  )
}

function GlyphFace({ value }: { value: string }) {
  if (value === 'plus' || value === 'triangle' || value === 'circle') {
    return <LoadShape shape={value} />
  }
  return <span className="theme-landing-load__letter">{value}</span>
}

function FlipChar({ char, offset, instant = false }: { char: string; offset: number; instant?: boolean }) {
  const [shown, setShown] = useState(char)
  const [phase, setPhase] = useState<'rest' | 'out' | 'in'>('rest')
  const pending = useRef(char)
  const busy = useRef(false)

  useEffect(() => {
    pending.current = char
    if (char === shown) return
    if (instant || prefersReducedMotion()) {
      setShown(char)
      setPhase('rest')
      busy.current = false
      return
    }
    if (busy.current) return
    busy.current = true
    setPhase('out')
  }, [char, shown, instant])

  return (
    <span
      className={`type-anim type-anim--flip theme-landing-load__flip${phase === 'rest' ? '' : phase === 'out' ? ' is-out' : ' is-in'}`}
      data-offset={String(offset)}
      onAnimationEnd={(event) => {
        const inner = event.currentTarget.querySelector('.type-anim__unit-inner')
        if (event.target !== inner) return
        if (phase === 'out' && event.animationName.includes('flip-out')) {
          setShown(pending.current)
          setPhase('in')
          return
        }
        if (phase === 'in' && event.animationName.includes('flip-in')) {
          if (pending.current !== shown) {
            busy.current = true
            setPhase('out')
            return
          }
          busy.current = false
          setPhase('rest')
        }
      }}
    >
      <span className="type-anim__unit">
        <span className="type-anim__unit-inner">
          <span className="type-anim__face">
            <GlyphFace value={shown} />
          </span>
        </span>
      </span>
    </span>
  )
}

/** Width is the sizer. The face sits in that box, so a shape cannot push the word. */
function Slot({
  sizer,
  char,
  offset,
  instant = false,
}: {
  sizer: string
  char: string
  offset: number
  instant?: boolean
}) {
  return (
    <span className="theme-scroll-enter__char theme-landing-load__slot">
      <span className="theme-landing-load__sizer" aria-hidden>
        {sizer}
      </span>
      <span className="theme-landing-load__glyph">
        <FlipChar char={char} offset={offset} instant={instant} />
      </span>
    </span>
  )
}

function EnterLine({ children, label }: { children: ReactNode; label: string }) {
  return (
    <span className="theme-scroll-enter type-display-lg mb-0" aria-label={label}>
      <span className="theme-scroll-enter__mask">
        <span className="theme-scroll-enter__line">
          <span className="theme-scroll-enter__word">{children}</span>
        </span>
      </span>
    </span>
  )
}

function LoadingWord({ active }: { active: boolean }) {
  const [chars, setChars] = useState(WORD.split(''))

  useEffect(() => {
    if (!active) return
    let timer = 0
    let restore = 0
    const tick = () => {
      const index = Math.floor(Math.random() * WORD.length)
      const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)] ?? 'circle'
      setChars(WORD.split('').map((letter, i) => (i === index ? shape : letter)))
      restore = window.setTimeout(() => {
        setChars(WORD.split(''))
        timer = window.setTimeout(tick, 2200 + Math.random() * 1800)
      }, FLIP_S * 2 * 1000 + 200)
    }
    timer = window.setTimeout(tick, 1800)
    return () => {
      window.clearTimeout(timer)
      window.clearTimeout(restore)
    }
  }, [active])

  return (
    <EnterLine label="loading">
      {WORD.split('').map((letter, index) => (
        <Slot key={index} sizer={letter} char={chars[index] ?? letter} offset={index} />
      ))}
    </EnterLine>
  )
}

function PercentReadout({ value }: { value: string }) {
  return (
    <EnterLine label={`${value} percent`}>
      {value.split('').map((digit, index) => (
        <Slot key={index} sizer="0" char={digit} offset={index} instant />
      ))}
      <Slot sizer="%" char="%" offset={3} instant />
    </EnterLine>
  )
}

export function LandingLoadOverlay({ progress, onComplete }: LandingLoadOverlayProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [entered, setEntered] = useState(false)
  const [shown, setShown] = useState(0)
  const onCompleteRef = useRef(onComplete)
  const progressRef = useRef(progress)
  const leaving = useRef(false)
  const liveRef = useRef(true)
  onCompleteRef.current = onComplete
  progressRef.current = progress

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    let live = true
    const play = startLclListIn(root, gsap)
    void play.done.then(() => {
      if (live) setEntered(true)
    })
    return () => {
      live = false
    }
  }, [])

  useEffect(() => {
    const started = performance.now()
    let frame = 0
    const tick = (now: number) => {
      setShown(pacedLoadPercent(progressRef.current, now - started))
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    liveRef.current = true
    return () => {
      liveRef.current = false
    }
  }, [])

  useEffect(() => {
    if (shown < 100 || progress < 100 || leaving.current) return
    const root = rootRef.current
    if (!root) return
    leaving.current = true
    const play = startLclListOut(root, gsap)
    void play.done.then(() => {
      if (liveRef.current) onCompleteRef.current()
    })
  }, [shown, progress])

  return (
    <div
      ref={rootRef}
      className="theme-lcl-layout theme-landing-load"
      role="status"
      aria-label="Loading"
    >
      {lclScene('loader').sections.map((section) => {
        const place = gridPlacementFromCells(section.cells)
        if (!place) return null
        return (
          <div
            key={section.id}
            className="theme-lcl-layout__tile"
            data-id={section.id}
            data-cs={String(place.columnStart)}
            data-ce={String(place.columnEnd)}
            data-rs={String(place.rowStart)}
            data-re={String(place.rowEnd)}
          >
            {section.id === 's1' ? (
              <div className="theme-landing-load__stack">
                <div className="theme-hairline-fx">
                  <div className="theme-lcl-preview__display-head">
                    <LoadingWord active={entered} />
                    <span className="theme-hairline-fx__wipe" aria-hidden>
                      <span className="theme-hairline-fx__rule" />
                    </span>
                  </div>
                </div>
                <div className="theme-landing-load__percent">
                  <PercentReadout value={formatLoadPercent(shown)} />
                </div>
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

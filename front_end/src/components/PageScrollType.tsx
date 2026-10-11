import {
  useRef,
  type RefObject,
} from 'react'
import { gsap, ScrollTrigger, useGSAP } from '../lib/gsap'
import {
  applyPageScrollType,
  playPageScrollTypeOnce,
  type PageScrollTypeEffect,
  type PageScrollTypeMode,
} from '../lib/animations/pageScrollType'

export type PageScrollTypeProps = {
  text: string
  effect: PageScrollTypeEffect
  /** `scrub` needs ThemeScroll viewport; `enter` plays on intersect; `once` plays on mount/deps. */
  mode?: PageScrollTypeMode | 'once'
  scrollerRef?: RefObject<HTMLElement | null>
  as?: 'span' | 'p' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'label' | 'b'
  id?: string
  className?: string
  /** Extra class on the inner title root (holds chars). */
  textClassName?: string
  /** Extra classes on exact word tokens (no spaces), e.g. `{ beyond: '…accent' }`. */
  wordClassNames?: Record<string, string>
  start?: string
  end?: string
  scrub?: boolean | number
  /** When `mode === 'once'`, re-run when this key changes (e.g. menu preview id). */
  replayKey?: string | number | boolean
  /** Delay in seconds before `once` playback (landing line stagger). */
  delay?: number
}

function splitLine(line: string, wordClassNames?: Record<string, string>) {
  return line.split(/(\s+)/).map((part, partIndex) => {
    if (/^\s+$/.test(part)) {
      return (
        <span key={`sp-${partIndex}`} className="theme-scroll-type__space" aria-hidden="true">
          {'\u00a0'}
        </span>
      )
    }
    const chars = part.split('').map((char, charIndex) => (
      <span key={charIndex} className="theme-scroll-type__char">
        {char}
      </span>
    ))
    const wordExtra = wordClassNames?.[part]
    return (
      <span
        key={partIndex}
        className={['theme-scroll-type__word', wordExtra].filter(Boolean).join(' ')}
      >
        {chars}
      </span>
    )
  })
}

/**
 * Page-scene typography using Codrops Effect 2 / 6 with ThemeScroll `scroller` support.
 * Reuses `.theme-scroll-type__*` char/word classes from scroll-type-fx.css.
 */
export function PageScrollType({
  text,
  effect,
  mode = 'enter',
  scrollerRef,
  as: Tag = 'span',
  id,
  className = '',
  textClassName = '',
  wordClassNames,
  start,
  end,
  scrub,
  replayKey,
  delay = 0,
}: PageScrollTypeProps) {
  const rootRef = useRef<HTMLElement | null>(null)
  const titleRef = useRef<HTMLElement | null>(null)

  useGSAP(
    () => {
      const title = titleRef.current
      if (!title) return

      const chars = title.querySelectorAll('.theme-scroll-type__char')
      // Sync hide before any rAF / scroller wait — CSS also starts at opacity 0.
      if (chars.length > 0) {
        gsap.set(chars, { opacity: 0, force3D: true })
      }

      if (mode === 'once') {
        const anim = playPageScrollTypeOnce({ effect, root: title, gsap, delay })
        return () => {
          anim?.kill()
        }
      }

      let cancelled = false
      let attempts = 0
      let frameId = 0
      const tweens: gsap.core.Tween[] = []

      const bind = () => {
        if (cancelled) return
        const needsScroller = Boolean(scrollerRef)
        const scroller = scrollerRef?.current
        if (needsScroller && !scroller) {
          attempts += 1
          if (attempts < 16) frameId = requestAnimationFrame(bind)
          return
        }

        tweens.push(
          ...applyPageScrollType({
            effect,
            root: title,
            gsap,
            ScrollTrigger,
            scroller: scroller ?? undefined,
            mode,
            start,
            end,
            scrub,
            trigger: rootRef.current ?? title,
          }),
        )
      }

      frameId = requestAnimationFrame(bind)
      return () => {
        cancelled = true
        cancelAnimationFrame(frameId)
        tweens.forEach((tween) => tween.scrollTrigger?.kill())
        tweens.forEach((tween) => tween.kill())
      }
    },
    {
      scope: rootRef,
      dependencies: [effect, mode, scrollerRef, start, end, scrub, replayKey, text, delay],
      revertOnUpdate: true,
    },
  )

  const lines = text.split('\n').filter((line) => line.length > 0)

  return (
    <Tag
      ref={rootRef as never}
      id={id}
      className={['theme-page-scroll-type', className].filter(Boolean).join(' ')}
    >
      <span
        ref={titleRef as never}
        className={['theme-page-scroll-type__text', 'theme-scroll-type__title', textClassName]
          .filter(Boolean)
          .join(' ')}
      >
        {lines.map((line, lineIndex) => (
          <span key={lineIndex} className="theme-scroll-type__line">
            {splitLine(line, wordClassNames)}
          </span>
        ))}
      </span>
    </Tag>
  )
}

/**
 * Codrops Enter type on GSAP scroll — clipped chars rise with rotateX.
 */
import { useRef, type ReactNode, type RefObject } from 'react'
import { gsap, ScrollTrigger, useGSAP } from '../lib/gsap'
import { applyScrollEnter, type ScrollEnterMode } from '../lib/animations/scrollEnter'

export type ScrollEnterTextProps = {
  children: ReactNode
  as?: 'span' | 'p' | 'h2' | 'h3' | 'div'
  className?: string
  /** `chars` splits a string; `line` wraps children as one enter unit (hover TypeAnim inside). */
  split?: 'chars' | 'line'
  mode?: ScrollEnterMode
  /** `scroll` binds ScrollTrigger; `none` waits for a scripted play in/out. */
  bind?: 'scroll' | 'none'
  scrollerRef?: RefObject<HTMLElement | null>
  start?: string
  end?: string
  scrub?: boolean | number
}

function splitLine(line: string) {
  return line.split(/(\s+)/).map((part, partIndex) => {
    if (/^\s+$/.test(part)) {
      return (
        <span key={`sp-${partIndex}`} className="theme-scroll-enter__space" aria-hidden>
          {' '}
        </span>
      )
    }
    return (
      <span key={partIndex} className="theme-scroll-enter__word">
        {part.split('').map((char, charIndex) => (
          <span key={`${char}-${charIndex}`} className="theme-scroll-enter__char" aria-hidden>
            {char}
          </span>
        ))}
      </span>
    )
  })
}

export function ScrollEnterText({
  children,
  as: Tag = 'span',
  className = '',
  split = 'chars',
  mode = 'enter',
  bind = 'scroll',
  scrollerRef,
  start,
  end,
  scrub,
}: ScrollEnterTextProps) {
  const rootRef = useRef<HTMLElement | null>(null)

  useGSAP(
    () => {
      const root = rootRef.current
      if (!root) return

      const chars = root.querySelectorAll('.theme-scroll-enter__char')
      if (chars.length) gsap.set(chars, { yPercent: 100, rotateX: 60, force3D: true })
      if (bind === 'none') return

      let cancelled = false
      let attempts = 0
      let frameId = 0
      const tweens: gsap.core.Tween[] = []

      const attachScroll = () => {
        if (cancelled) return
        const needsScroller = Boolean(scrollerRef)
        const scroller = scrollerRef?.current
        if (needsScroller && !scroller) {
          attempts += 1
          if (attempts < 16) frameId = requestAnimationFrame(attachScroll)
          return
        }
        tweens.push(
          ...applyScrollEnter({
            root,
            gsap,
            ScrollTrigger,
            scroller: scroller ?? undefined,
            mode,
            start,
            end,
            scrub,
            trigger: root,
          }),
        )
      }

      frameId = requestAnimationFrame(attachScroll)
      return () => {
        cancelled = true
        cancelAnimationFrame(frameId)
        tweens.forEach((tween) => tween.scrollTrigger?.kill())
        tweens.forEach((tween) => tween.kill())
      }
    },
    {
      scope: rootRef,
      dependencies: [typeof children === 'string' ? children : split, mode, bind, scrollerRef, start, end, scrub],
      revertOnUpdate: true,
    },
  )

  const label = typeof children === 'string' ? children : undefined
  const content =
    split === 'line' || typeof children !== 'string' ? (
      <span className="theme-scroll-enter__char">{children}</span>
    ) : (
      splitLine(children)
    )

  return (
    <Tag
      ref={rootRef as never}
      className={['theme-scroll-enter', className].filter(Boolean).join(' ')}
      aria-label={label}
    >
      <span className="theme-scroll-enter__mask">
        <span className="theme-scroll-enter__line">{content}</span>
      </span>
    </Tag>
  )
}

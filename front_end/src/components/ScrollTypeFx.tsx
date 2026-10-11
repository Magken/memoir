import { useRef } from 'react'
import { gsap, ScrollTrigger, useGSAP } from '../lib/gsap'
import { applyScrollTypeFx } from '../lib/animations/applyScrollTypeFx'
import type { ScrollTypeFxMeta } from '../lib/animations/scrollTypeFx'

type ScrollTypeFxProps = {
  meta: ScrollTypeFxMeta
}

function splitLine(line: string, needsCharWrap: boolean) {
  return line.split(/(\s+)/).map((part, partIndex) => {
    if (/^\s+$/.test(part)) {
      return (
        <span key={`sp-${partIndex}`} className="theme-scroll-type__space" aria-hidden="true">
          {'\u00a0'}
        </span>
      )
    }
    const chars = part.split('').map((char, charIndex) => {
      const node = (
        <span key={charIndex} className="theme-scroll-type__char">
          {char}
        </span>
      )
      return needsCharWrap ? (
        <span key={charIndex} className="theme-scroll-type__char-wrap">
          {node}
        </span>
      ) : (
        node
      )
    })
    return (
      <span key={partIndex} className="theme-scroll-type__word">
        {chars}
      </span>
    )
  })
}

export function ScrollTypeFx({ meta }: ScrollTypeFxProps) {
  const rootRef = useRef<HTMLElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const isPinned = [14, 15, 25, 26, 27].includes(meta.id)

  useGSAP(
    () => {
      const title = titleRef.current
      if (!title) return
      applyScrollTypeFx(meta.id, title, gsap, ScrollTrigger)
    },
    { scope: rootRef, dependencies: [meta.id], revertOnUpdate: true },
  )

  const prose = meta.layout === 'prose'
  const needsWrap = Boolean(meta.needsCharWrap)

  return (
    <article
      ref={rootRef}
      id={`scroll-fx-${meta.id}`}
      className={[
        'theme-scroll-type theme-shell-divider',
        isPinned ? 'theme-scroll-type--pinned' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="theme-scroll-type__stage">
        <h3
          ref={titleRef}
          className={[
            'theme-scroll-type__title theme-face--3',
            prose ? 'theme-scroll-type__title--prose' : '',
            meta.arrangement === 'sides' ? 'theme-scroll-type__title--sides' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {meta.lines.map((line, lineIndex) => {
            const lineStyle = meta.lineStyles?.[lineIndex]
            return (
              <span
                key={lineIndex}
                className={[
                  'theme-scroll-type__line',
                  lineStyle?.face ? `theme-face--${lineStyle.face}` : '',
                  ...(lineStyle?.treatments?.map(
                    (treatment) => `theme-scroll-type__line--${treatment}`,
                  ) ?? []),
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {splitLine(line, needsWrap)}
              </span>
            )
          })}
        </h3>
      </div>
      <div className="theme-scroll-type__meta">
        <p className="type-label mb-1">
          Effect {meta.id} — {meta.label}
        </p>
        <p className="type-caption type-muted mb-0">{meta.purpose}</p>
      </div>
    </article>
  )
}

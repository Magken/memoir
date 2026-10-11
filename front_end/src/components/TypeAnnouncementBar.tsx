import type { ReactNode } from 'react'
import type { TypeAnimPreset } from '../lib/animations/typeAnimPresets'
import { TypeTicker } from './TypeTicker'

export type TypeAnnouncementBarProps = {
  /** Single line or rotating messages. */
  messages: readonly string[] | string
  label?: string
  href?: string
  linkLabel?: string
  className?: string
  /** Rotate when multiple messages. */
  cycle?: boolean
  /** TypeAnimText preset when cycling — default `fade`. */
  anim?: TypeAnimPreset
}

/** Top-of-page announcement strip — theme card flat + optional ticker. */
export function TypeAnnouncementBar({
  messages,
  label,
  href,
  linkLabel = 'Learn more',
  className = '',
  cycle = true,
  anim = 'fade',
}: TypeAnnouncementBarProps) {
  const items = typeof messages === 'string' ? [messages] : messages
  const rootClass = ['theme-type-announcement theme-card theme-card--flat', className]
    .filter(Boolean)
    .join(' ')

  let body: ReactNode
  if (items.length > 1 && cycle) {
    body = (
      <TypeTicker items={items} typeClass="type-body-sm mb-0" anim={anim} split="line" interval={4000} />
    )
  } else {
    body = <p className="type-body-sm mb-0">{items[0]}</p>
  }

  return (
    <div className={rootClass} role="region" aria-label={label ?? 'Announcement'}>
      {label ? <span className="theme-type-announcement__label type-overline">{label}</span> : null}
      <div className="theme-type-announcement__body">{body}</div>
      {href ? (
        <a href={href} className="theme-type-announcement__link type-label type-link">
          {linkLabel}
        </a>
      ) : null}
    </div>
  )
}

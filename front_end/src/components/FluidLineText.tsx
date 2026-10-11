/**
 * Lusion-style clip-curtain type — chars or one line rise through overflow hidden.
 */

export type FluidLineTextProps = {
  children: string
  as?: 'span' | 'p' | 'h2' | 'h3' | 'div'
  className?: string
  split?: 'chars' | 'line'
  flipId?: string
}

export function FluidLineText({
  children,
  as: Tag = 'span',
  className = '',
  split = 'chars',
  flipId,
}: FluidLineTextProps) {
  const rootClass = ['theme-fluid-line', split === 'chars' ? 'theme-fluid-chars' : '', className]
    .filter(Boolean)
    .join(' ')

  if (split === 'line') {
    return (
      <Tag className={rootClass} data-flip-id={flipId} aria-label={children}>
        <span className="theme-fluid-line__mask" aria-hidden>
          <span className="theme-fluid-line__fill">{children}</span>
        </span>
      </Tag>
    )
  }

  return (
    <Tag className={rootClass} data-flip-id={flipId} aria-label={children}>
      {children.split('').map((char, index) =>
        char === ' ' ? (
          <span key={`s-${index}`} className="theme-fluid-chars__space" aria-hidden>
            {' '}
          </span>
        ) : (
          <span key={`${char}-${index}`} className="theme-fluid-chars__unit" aria-hidden>
            <span className="theme-fluid-chars__fill">{char}</span>
          </span>
        ),
      )}
    </Tag>
  )
}

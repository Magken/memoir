type VurifyAvatarProps = {
  /** Profile photo URL — when set, replaces the letter fallback. */
  src?: string | null
  /** Display name — used for accessible label / title when set. */
  name?: string | null
  /** Public handle — letter initial prefers this over `name`. */
  username?: string | null
  /** Frame size — rem ramp matches VurifyIcon bordered (`sm` 1.9 · `md` 2.4 · `lg` 2.9). */
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

function letterFrom(name?: string | null, username?: string | null): string {
  const raw = (username?.trim() || name?.trim() || '').trim()
  if (!raw) return '?'
  const first = raw[0]
  return first ? first.toUpperCase() : '?'
}

/**
 * Circular Vurify identity mark — 2px housing border (VurifyIcon bordered scale), no shadow.
 * Photo when `src` is set; else complement fill + accent letter (from username).
 */
export function VurifyAvatar({
  src,
  name,
  username,
  size = 'lg',
  className = '',
}: VurifyAvatarProps) {
  const label = (name?.trim() || username?.trim() || 'User').trim()
  const letter = letterFrom(name, username)
  const hasPhoto = Boolean(src?.trim())

  return (
    <span
      className={[
        'theme-vurify-avatar',
        `theme-vurify-avatar--${size}`,
        hasPhoto ? 'theme-vurify-avatar--photo' : 'theme-vurify-avatar--letter',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      title={label}
      aria-hidden="true"
    >
      {hasPhoto ? (
        <img src={src!.trim()} alt="" className="theme-vurify-avatar__img" />
      ) : (
        <span className="theme-vurify-avatar__letter">{letter}</span>
      )}
    </span>
  )
}

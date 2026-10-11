type DocArticleDividerProps = {
  variant?: 'default' | 'strong' | 'accent' | 'inset'
  label?: string
  className?: string
}

export function DocArticleDivider({
  variant = 'default',
  label,
  className = '',
}: DocArticleDividerProps) {
  if (label) {
    return (
      <div className={['theme-doc-article__divider-row', 'theme-divider-row', className].filter(Boolean).join(' ')}>
        <hr className="theme-divider theme-divider--strong" />
        <span className="theme-divider-row__label type-overline">{label}</span>
        <hr className="theme-divider theme-divider--strong" />
      </div>
    )
  }

  const variantClass =
    variant === 'strong'
      ? 'theme-divider--strong'
      : variant === 'accent'
        ? 'theme-divider--accent'
        : variant === 'inset'
          ? 'theme-divider--inset'
          : ''

  return <hr className={['theme-doc-article__divider', 'theme-divider', variantClass, className].filter(Boolean).join(' ')} />
}

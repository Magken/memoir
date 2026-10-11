import type { ReactNode } from 'react'

type DocArticleListProps = {
  ordered?: boolean
  checked?: boolean
  compact?: boolean
  muted?: boolean
  children: ReactNode
  className?: string
}

export function DocArticleList({
  ordered = false,
  checked = false,
  compact = false,
  muted = false,
  children,
  className = '',
}: DocArticleListProps) {
  const Tag = ordered ? 'ol' : 'ul'
  return (
    <Tag
      className={[
        'theme-doc-article__list',
        'theme-list',
        ordered ? 'theme-list--ordered' : '',
        checked ? 'theme-list--checked' : '',
        compact ? 'theme-list--compact' : '',
        muted ? 'theme-list--muted' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </Tag>
  )
}

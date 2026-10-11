import { useEffect, useRef, type ReactNode } from 'react'
import { useDocArticleOptional } from '../../lib/docArticle'

type DocArticleHeadingProps = {
  level?: 2 | 3 | 4
  children: ReactNode
  className?: string
  anchor?: boolean
  sectionId?: string
  /** Registers a subsection entry in the TOC (h3/h4). Use heading slug — reference parity. */
  tocId?: string
  tocLabel?: string
}

export function DocArticleHeading({
  level = 2,
  children,
  className = '',
  anchor = true,
  sectionId,
  tocId,
  tocLabel,
}: DocArticleHeadingProps) {
  const ctx = useDocArticleOptional()
  const registerTocEntry = ctx?.registerTocEntry
  const ref = useRef<HTMLHeadingElement>(null)
  const Tag = level === 4 ? 'h4' : level === 3 ? 'h3' : 'h2'
  const typeClass =
    level === 4 ? 'type-body-lg' : level === 3 ? 'type-body-lg type-muted' : 'type-h3 type-serif-italic'
  const tocEntryId = sectionId ?? tocId
  const tocLevel: 2 | 3 | 4 = level === 4 ? 4 : level === 3 ? 3 : 2
  const resolvedTocLabel =
    tocLabel ?? (typeof children === 'string' ? children : tocEntryId ?? '')

  useEffect(() => {
    if (!registerTocEntry || !tocEntryId) return undefined
    return registerTocEntry({
      id: tocEntryId,
      label: resolvedTocLabel,
      level: tocLevel,
      element: ref.current,
    })
  }, [registerTocEntry, tocEntryId, resolvedTocLabel, tocLevel])

  return (
    <Tag
      ref={ref}
      id={tocEntryId}
      data-doc-toc={tocEntryId}
      className={[
        'theme-doc-article__heading',
        typeClass,
        anchor ? 'theme-doc-article__heading--anchor' : '',
        className,
        level === 3 ? 'theme-doc-article__heading--level-3' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {anchor && tocEntryId ? (
        <a href={`#${tocEntryId}`} className="theme-doc-article__heading-link">
          {children}
        </a>
      ) : (
        children
      )}
    </Tag>
  )
}

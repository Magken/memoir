import { useEffect, useRef, type ReactNode } from 'react'
import type { DocArticleSectionKind } from '../../lib/docArticle'
import { useDocArticleOptional } from '../../lib/docArticle'

type DocArticleSectionProps = {
  id: string
  kind?: DocArticleSectionKind
  label?: string
  tags?: readonly string[]
  registerInToc?: boolean
  className?: string
  children: ReactNode
}

export function DocArticleSection({
  id,
  kind = 'custom',
  label,
  tags,
  registerInToc = false,
  className = '',
  children,
}: DocArticleSectionProps) {
  const ctx = useDocArticleOptional()
  const registerSection = ctx?.registerSection
  const registerTocEntry = ctx?.registerTocEntry
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!registerSection) return undefined
    const unregisterSection = registerSection({
      id,
      kind,
      label,
      tags,
      element: ref.current,
    })
    const unregisterToc =
      registerInToc && label && registerTocEntry
        ? registerTocEntry({
            id,
            label,
            level: 2,
            element: ref.current,
          })
        : () => undefined
    return () => {
      unregisterSection()
      unregisterToc()
    }
  }, [registerSection, registerTocEntry, id, kind, label, tags, registerInToc])

  return (
    <section
      ref={ref}
      data-doc-section={id}
      aria-labelledby={label ? `${id}-label` : undefined}
      className={['theme-doc-article__section', className].filter(Boolean).join(' ')}
    >
      {label ? (
        <span id={`${id}-label`} className="sr-only">
          {label}
        </span>
      ) : null}
      {children}
    </section>
  )
}

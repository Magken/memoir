import { ExternalLink } from 'lucide-react'
import type { MouseEvent, ReactNode } from 'react'
import { useDocArticleOptional } from '../../lib/docArticle'

type DocArticleLinkProps = {
  href?: string
  sectionRef?: string
  children: ReactNode
  className?: string
}

export function DocArticleLink({ href, sectionRef, children, className = '' }: DocArticleLinkProps) {
  const ctx = useDocArticleOptional()

  if (sectionRef) {
    return (
      <button
        type="button"
        className={['type-link', className].filter(Boolean).join(' ')}
        onClick={(event: MouseEvent<HTMLButtonElement>) => {
          event.preventDefault()
          ctx?.scrollToSection(sectionRef)
        }}
      >
        {children}
      </button>
    )
  }

  if (!href) return <span className={className}>{children}</span>

  const external = /^https?:\/\//.test(href)

  return (
    <a
      href={href}
      className={['type-link', className].filter(Boolean).join(' ')}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {children}
      {external ? (
        <ExternalLink size={14} strokeWidth={1.75} aria-hidden className="theme-doc-article__link-icon" />
      ) : null}
    </a>
  )
}

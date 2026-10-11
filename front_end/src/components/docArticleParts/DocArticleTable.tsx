import type { ReactNode } from 'react'
import { ThemeScroll } from '../ThemeScroll'

type DocArticleTableProps = {
  caption?: string
  children: ReactNode
  className?: string
}

export function DocArticleTable({ caption, children, className = '' }: DocArticleTableProps) {
  return (
    <ThemeScroll
      axis="horizontal"
      rail="mini"
      className={['theme-doc-article__table-wrap', 'theme-table-wrap', className].filter(Boolean).join(' ')}
    >
      <table className="theme-table theme-doc-article__table">
        {caption ? <caption>{caption}</caption> : null}
        {children}
      </table>
    </ThemeScroll>
  )
}

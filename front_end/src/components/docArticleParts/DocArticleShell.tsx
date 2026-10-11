import type { ReactNode } from 'react'
import { ThemeScroll } from '../ThemeScroll'

type DocArticleShellProps = {
  toc?: ReactNode
  /** Sticky TOC rail — positions shell__toc column (Doc-reference layout) */
  stickyToc?: boolean
  /** Narrower denser rail for `micro-anchor` TOC */
  microToc?: boolean
  /**
   * When false, Contents sticks with the page and does **not** get its own
   * ThemeScroll (Creator-2 / product day timeline). Default true for long Doc articles.
   */
  tocScroll?: boolean
  children: ReactNode
  className?: string
}

/** Large-viewport reading grid — sticky TOC rail + uninterrupted main column (Doc-reference pattern). */
export function DocArticleShell({
  toc,
  stickyToc = false,
  microToc = false,
  tocScroll = true,
  children,
  className = '',
}: DocArticleShellProps) {
  return (
    <div
      className={[
        'theme-doc-article-shell',
        stickyToc ? 'theme-doc-article-shell--sticky-toc' : '',
        microToc ? 'theme-doc-article-shell--micro-toc' : '',
        tocScroll ? '' : 'theme-doc-article-shell--toc-page',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {toc ? (
        <div
          className="theme-doc-article-shell__toc"
          {...(tocScroll ? { 'data-toc-scroll': true } : {})}
        >
          {tocScroll ? (
            <ThemeScroll
              rail="hidden"
              scrollClouds
              className="theme-doc-article-shell__toc-scroll"
            >
              {toc}
            </ThemeScroll>
          ) : (
            <div className="theme-doc-article-shell__toc-flow">{toc}</div>
          )}
        </div>
      ) : null}
      <div className="theme-doc-article-shell__main">{children}</div>
    </div>
  )
}

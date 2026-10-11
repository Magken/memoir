import type { ReactNode, RefObject } from 'react'
import { DocArticleProvider } from '../lib/docArticle'
import { DocArticleMasthead } from './docArticleParts/DocArticleMasthead'

type DocArticleProps = {
  title: string
  slug?: string
  kicker?: string
  byline?: string
  publishedAt?: string
  /** narrow = blog-single measure · wide = blog-sidebar / magazine */
  measure?: 'narrow' | 'wide'
  /** Scroll container for anchor TOC spy — e.g. capped showcase stage */
  scrollRootRef?: RefObject<HTMLElement | null>
  /** false when masthead is rendered inside DocArticleShell main (sticky TOC layout) */
  showMasthead?: boolean
  className?: string
  debug?: boolean
  children: ReactNode
}

export function DocArticle({
  title,
  slug,
  kicker,
  byline,
  publishedAt,
  measure = 'narrow',
  scrollRootRef,
  showMasthead = true,
  className = '',
  debug = false,
  children,
}: DocArticleProps) {
  return (
    <DocArticleProvider
      title={title}
      slug={slug}
      kicker={kicker}
      byline={byline}
      publishedAt={publishedAt}
      scrollRootRef={scrollRootRef}
      debug={debug}
    >
      <article
        className={[
          'theme-doc-article',
          measure === 'wide' ? 'theme-doc-article--wide' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        data-doc-slug={slug}
        aria-label={title}
      >
        {(showMasthead && (kicker || title || byline || publishedAt)) && (
          <DocArticleMasthead
            title={title}
            kicker={kicker}
            byline={byline}
            publishedAt={publishedAt}
          />
        )}
        <div className="theme-doc-article__body">{children}</div>
      </article>
    </DocArticleProvider>
  )
}

export {
  DocArticleSection,
  DocArticleHeading,
  DocArticleParagraph,
  DocArticleLink,
  DocArticleImage,
  DocArticleDivider,
  DocArticleList,
  DocArticleQuote,
  DocArticleCallout,
  DocArticleTable,
  DocArticleLayout,
  DocArticleAside,
  DocArticleStats,
  DocArticleStat,
  DocArticleToc,
  DocArticleShell,
  DocArticleMasthead,
} from './docArticleParts'

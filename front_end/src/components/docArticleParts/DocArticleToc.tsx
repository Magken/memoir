import type { DocArticleTocVariant } from '../../lib/docArticle'
import { useDocArticle } from '../../lib/docArticle'
import type { NanoAnchorMenuVariant } from '../../lib/menus/nanoAnchorMenu'
import { NanoAnchorMenu } from '../NanoAnchorMenu'

type DocArticleTocProps = {
  variant?: DocArticleTocVariant
  title?: string
  className?: string
}

function mapTocToMenuVariant(variant: DocArticleTocVariant): NanoAnchorMenuVariant {
  if (variant === 'sticky-anchor') return 'anchor'
  if (variant === 'micro-anchor') return 'micro'
  return 'list'
}

export function DocArticleToc({
  variant = 'list',
  title = 'Contents',
  className = '',
}: DocArticleTocProps) {
  const { tocEntries, scrollToSection, title: docTitle, scrollRootRef } = useDocArticle()

  if (tocEntries.length === 0) return null

  const isRail = variant === 'sticky-anchor' || variant === 'micro-anchor'
  const menuVariant = mapTocToMenuVariant(variant)

  const scrollToTop = () => {
    const root = scrollRootRef?.current
    if (root) {
      root.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <NanoAnchorMenu
      entries={tocEntries.map((entry) => ({
        id: entry.id,
        label: entry.label,
        level: entry.level,
      }))}
      variant={menuVariant}
      scrollSpy={isRail}
      scrollRootRef={scrollRootRef}
      sticky={false}
      title={title}
      footerLabel={isRail ? docTitle : undefined}
      onBackToTop={isRail ? scrollToTop : undefined}
      onSelect={scrollToSection}
      label="Table of contents"
      className={className}
    />
  )
}

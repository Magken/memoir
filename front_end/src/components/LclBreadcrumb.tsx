/**
 * LCL breadcrumb: visited steps only. Every segment, including the current
 * one, is a ScrollEnterText so the trail animates as one. Ancestors call
 * onSelect(depth). Unopened links never appear here.
 */
import { forwardRef } from 'react'
import { ArrowLeft } from 'lucide-react'
import { ScrollEnterText } from './ScrollEnterText'
import { lclCrumbsForPath } from '../lib/lcl/lclBreadcrumb'

export type LclBreadcrumbProps = {
  path: readonly string[]
  rootLabel: string
  onSelect: (depth: number) => void
  /** Show the root crumb when path is empty (About Home head has no title). */
  rootWhenEmpty?: boolean
}

export const LclBreadcrumb = forwardRef<HTMLElement, LclBreadcrumbProps>(function LclBreadcrumb(
  { path, rootLabel, onSelect, rootWhenEmpty = false },
  ref,
) {
  const crumbs = lclCrumbsForPath(path, rootLabel, { rootWhenEmpty })
  if (crumbs.length === 0) return null

  return (
    <nav ref={ref} className="theme-lcl-breadcrumb" aria-label="Breadcrumb">
      {crumbs.length > 1 ? (
        <span className="theme-lcl-breadcrumb__arrow" aria-hidden>
          <ArrowLeft size={14} strokeWidth={2.25} />
        </span>
      ) : null}
      <ol className="theme-lcl-breadcrumb__trail">
        {crumbs.map((crumb, index) => (
          <li key={`${crumb.depth}-${crumb.label}`} className="theme-lcl-breadcrumb__item">
            {index > 0 ? <span className="theme-lcl-breadcrumb__sep" aria-hidden /> : null}
            {crumb.current ? (
              <span className="theme-lcl-breadcrumb__current" aria-current="page">
                <ScrollEnterText className="type-lead mb-0" bind="none">
                  {crumb.label}
                </ScrollEnterText>
              </span>
            ) : (
              <button
                type="button"
                className="theme-lcl-breadcrumb__btn"
                onClick={() => onSelect(crumb.depth)}
              >
                <ScrollEnterText className="type-lead mb-0" bind="none">
                  {crumb.label}
                </ScrollEnterText>
              </button>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
})

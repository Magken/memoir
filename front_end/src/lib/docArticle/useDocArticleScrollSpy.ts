import type { DocArticleTocEntry } from './docArticleTypes'
import { useAnchorMenuScrollSpy } from '../menus/useAnchorMenuScrollSpy'
import type { RefObject } from 'react'

export function useDocArticleScrollSpy(
  entries: readonly DocArticleTocEntry[],
  options?: {
    enabled?: boolean
    scrollRootRef?: RefObject<HTMLElement | null>
  },
) {
  return useAnchorMenuScrollSpy(
    entries.map((entry) => entry.id),
    options,
  )
}

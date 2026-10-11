import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'
import type {
  DocArticleMeta,
  DocArticleRegisterInput,
  DocArticleRegisterTocInput,
  DocArticleSectionMeta,
  DocArticleTocEntry,
} from './docArticleTypes'
import { createDocArticleSectionRegistry } from './sectionRegistry'
import { createDocArticleTocRegistry } from './tocRegistry'
import { scrollToAnchorTarget } from '../menus/anchorScroll'

export type DocArticleContextValue = DocArticleMeta & {
  rootRef: RefObject<HTMLElement | null>
  scrollRootRef: RefObject<HTMLElement | null>
  sections: readonly DocArticleSectionMeta[]
  tocEntries: readonly DocArticleTocEntry[]
  registerSection: (input: DocArticleRegisterInput) => () => void
  registerTocEntry: (input: DocArticleRegisterTocInput) => () => void
  getSection: (id: string) => DocArticleSectionMeta | undefined
  getTocEntry: (id: string) => DocArticleTocEntry | undefined
  sectionsWithTag: (tag: string) => readonly DocArticleSectionMeta[]
  scrollToSection: (id: string) => void
}

export const DocArticleContext = createContext<DocArticleContextValue | null>(null)

type DocArticleProviderProps = DocArticleMeta & {
  children: ReactNode
  scrollRootRef?: RefObject<HTMLElement | null>
  debug?: boolean
}

export function DocArticleProvider({
  children,
  title,
  slug,
  kicker,
  byline,
  publishedAt,
  scrollRootRef: scrollRootRefProp,
  debug = false,
}: DocArticleProviderProps) {
  const rootRef = useRef<HTMLElement | null>(null)
  const fallbackScrollRootRef = useRef<HTMLElement | null>(null)
  const scrollRootRef = scrollRootRefProp ?? fallbackScrollRootRef
  const registryRef = useRef(createDocArticleSectionRegistry(debug))
  const tocRegistryRef = useRef(createDocArticleTocRegistry(debug))
  const [sections, setSections] = useState<readonly DocArticleSectionMeta[]>([])
  const [tocEntries, setTocEntries] = useState<readonly DocArticleTocEntry[]>([])

  const syncSections = useCallback(() => {
    const next = registryRef.current.listSections()
    setSections((previous) => {
      if (previous.length !== next.length) return next
      const prevKey = previous.map((entry) => entry.id).sort().join('\0')
      const nextKey = next.map((entry) => entry.id).sort().join('\0')
      return prevKey === nextKey ? previous : next
    })
  }, [])

  const syncTocEntries = useCallback(() => {
    const next = tocRegistryRef.current.listEntries()
    setTocEntries((previous) => {
      if (previous.length !== next.length) return next
      const same = previous.every((entry, index) => {
        const other = next[index]
        return (
          other !== undefined &&
          entry.id === other.id &&
          entry.label === other.label &&
          entry.level === other.level &&
          entry.order === other.order
        )
      })
      return same ? previous : next
    })
  }, [])

  const registerSection = useCallback(
    (input: DocArticleRegisterInput) => {
      const unregister = registryRef.current.register(input)
      syncSections()
      return () => {
        unregister()
        syncSections()
      }
    },
    [syncSections],
  )

  const registerTocEntry = useCallback(
    (input: DocArticleRegisterTocInput) => {
      const unregister = tocRegistryRef.current.register(input)
      syncTocEntries()
      return () => {
        unregister()
        syncTocEntries()
      }
    },
    [syncTocEntries],
  )

  const getSection = useCallback((id: string) => registryRef.current.getSection(id), [])

  const getTocEntry = useCallback((id: string) => tocRegistryRef.current.getEntry(id), [])

  const sectionsWithTag = useCallback(
    (tag: string) => registryRef.current.sectionsWithTag(tag),
    [],
  )

  const scrollToSection = useCallback(
    (id: string) => {
      scrollToAnchorTarget(id, scrollRootRef.current)
    },
    [scrollRootRef],
  )

  const value = useMemo<DocArticleContextValue>(
    () => ({
      title,
      slug,
      kicker,
      byline,
      publishedAt,
      rootRef,
      scrollRootRef,
      sections,
      tocEntries,
      registerSection,
      registerTocEntry,
      getSection,
      getTocEntry,
      sectionsWithTag,
      scrollToSection,
    }),
    [
      title,
      slug,
      kicker,
      byline,
      publishedAt,
      sections,
      tocEntries,
      registerSection,
      registerTocEntry,
      getSection,
      getTocEntry,
      sectionsWithTag,
      scrollToSection,
      scrollRootRef,
    ],
  )

  return <DocArticleContext.Provider value={value}>{children}</DocArticleContext.Provider>
}

export function useDocArticle(): DocArticleContextValue {
  const ctx = useContext(DocArticleContext)
  if (!ctx) {
    throw new Error('useDocArticle must be used within DocArticleProvider')
  }
  return ctx
}

export function useDocArticleOptional(): DocArticleContextValue | null {
  return useContext(DocArticleContext)
}

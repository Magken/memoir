import type { DocArticleRegisterInput, DocArticleSectionMeta } from './docArticleTypes'
import { isValidDocArticleSectionId } from './docArticleTypes'

export function createDocArticleSectionRegistry(debug = false) {
  const map = new Map<string, DocArticleSectionMeta>()

  function warn(message: string) {
    if (debug) console.warn(`[DocArticle] ${message}`)
  }

  function register(input: DocArticleRegisterInput): () => void {
    if (!isValidDocArticleSectionId(input.id)) {
      warn(`Invalid section id "${input.id}" — use kebab-case slugs (e.g. intro, body-copy).`)
    }
    if (map.has(input.id)) {
      warn(`Duplicate section id "${input.id}" — later registration replaces the prior entry.`)
    }
    map.set(input.id, { ...input })
    if (debug) {
      console.debug('[DocArticle] register', input.id, input.kind, input.tags)
    }
    return () => {
      map.delete(input.id)
      if (debug) console.debug('[DocArticle] unregister', input.id)
    }
  }

  function unregister(id: string) {
    map.delete(id)
  }

  function getSection(id: string): DocArticleSectionMeta | undefined {
    return map.get(id)
  }

  function listSections(): readonly DocArticleSectionMeta[] {
    return Array.from(map.values())
  }

  function sectionsWithTag(tag: string): readonly DocArticleSectionMeta[] {
    return listSections().filter((section) => section.tags?.includes(tag))
  }

  return {
    register,
    unregister,
    getSection,
    listSections,
    sectionsWithTag,
  }
}

export type DocArticleSectionRegistry = ReturnType<typeof createDocArticleSectionRegistry>

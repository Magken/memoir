import type { DocArticleTocEntry, DocArticleTocLevel } from './docArticleTypes'
import { isValidDocArticleSectionId } from './docArticleTypes'

let orderCounter = 0

export function createDocArticleTocRegistry(debug = false) {
  const map = new Map<string, DocArticleTocEntry>()

  function warn(message: string) {
    if (debug) console.warn(`[DocArticle TOC] ${message}`)
  }

  function register(input: {
    id: string
    label: string
    level: DocArticleTocLevel
    element: HTMLElement | null
  }): () => void {
    if (!isValidDocArticleSectionId(input.id)) {
      warn(`Invalid toc id "${input.id}" — use kebab-case slugs.`)
    }
    const existing = map.get(input.id)
    const entry: DocArticleTocEntry = {
      ...input,
      order: existing?.order ?? orderCounter++,
    }
    map.set(input.id, entry)
    if (debug) console.debug('[DocArticle TOC] register', input.id, input.level)
    return () => {
      map.delete(input.id)
      if (debug) console.debug('[DocArticle TOC] unregister', input.id)
    }
  }

  function listEntries(): readonly DocArticleTocEntry[] {
    return Array.from(map.values()).sort((a, b) => a.order - b.order)
  }

  function getEntry(id: string): DocArticleTocEntry | undefined {
    return map.get(id)
  }

  return { register, listEntries, getEntry }
}

export type DocArticleTocRegistry = ReturnType<typeof createDocArticleTocRegistry>

import type { NanoAnchorMenuEntry } from '../../lib/menus/nanoAnchorMenu'
import type { TestFormDocument, TestFormQuestion, TestFormSection } from '../../lib/testForm'

const SECTION_TOC_PREFIX = 'tf-sec-'
const QUESTION_TOC_PREFIX = 'tf-q-'

export function formSectionTocId(sectionId: string): string {
  return `${SECTION_TOC_PREFIX}${sectionId}`
}

export function formQuestionTocId(questionId: string): string {
  return `${QUESTION_TOC_PREFIX}${questionId}`
}

export function sectionIdFromFormTocId(tocId: string): string | null {
  if (!tocId.startsWith(SECTION_TOC_PREFIX)) return null
  return tocId.slice(SECTION_TOC_PREFIX.length)
}

export function questionIdFromFormTocId(tocId: string): string | null {
  if (!tocId.startsWith(QUESTION_TOC_PREFIX)) return null
  return tocId.slice(QUESTION_TOC_PREFIX.length)
}

function tocLabel(raw: string | undefined, fallback: string): string {
  const t = raw?.trim()
  return t || fallback
}

/** Flat nano-anchor entries: sections (L2) + questions (L3). */
export function buildFormTocEntries(doc: TestFormDocument): NanoAnchorMenuEntry[] {
  const entries: NanoAnchorMenuEntry[] = []
  const bySection = new Map<string, TestFormQuestion[]>()
  const loose: TestFormQuestion[] = []

  for (const q of doc.questions) {
    if (q.sectionId) {
      const list = bySection.get(q.sectionId) ?? []
      list.push(q)
      bySection.set(q.sectionId, list)
    } else {
      loose.push(q)
    }
  }

  let n = 0
  for (const section of doc.sections) {
    entries.push({
      id: formSectionTocId(section.id),
      label: tocLabel(section.title, 'Section'),
      level: 2,
    })
    for (const q of bySection.get(section.id) ?? []) {
      n += 1
      entries.push({
        id: formQuestionTocId(q.id),
        label: `${n}. ${tocLabel(q.prompt, 'Question')}`,
        level: 3,
      })
    }
  }

  if (loose.length > 0) {
    entries.push({
      id: 'tf-sec-loose',
      label: 'Other',
      level: 2,
    })
    for (const q of loose) {
      n += 1
      entries.push({
        id: formQuestionTocId(q.id),
        label: `${n}. ${tocLabel(q.prompt, 'Question')}`,
        level: 3,
      })
    }
  }

  return entries
}

export function buildFormTocSortableSectionIds(doc: TestFormDocument): string[] {
  return doc.sections.map((section) => formSectionTocId(section.id))
}

export function buildFormTocSortableQuestionGroups(
  doc: TestFormDocument,
): { parentId: string; ids: string[] }[] {
  return doc.sections
    .map((section) => ({
      parentId: formSectionTocId(section.id),
      ids: doc.questions
        .filter((q) => q.sectionId === section.id)
        .map((q) => formQuestionTocId(q.id)),
    }))
    .filter((group) => group.ids.length > 0)
}

export function reorderFormSections(
  doc: TestFormDocument,
  orderedSectionIds: string[],
): TestFormDocument {
  const map = new Map(doc.sections.map((s) => [s.id, s] as const))
  const next: TestFormSection[] = []
  for (const id of orderedSectionIds) {
    const section = map.get(id)
    if (section) {
      next.push(section)
      map.delete(id)
    }
  }
  for (const section of map.values()) next.push(section)
  return { ...doc, sections: next }
}

/** Reorder questions that share one section; other questions keep relative order. */
export function reorderFormQuestions(
  doc: TestFormDocument,
  orderedQuestionIds: string[],
): TestFormDocument {
  if (orderedQuestionIds.length === 0) return doc
  const idSet = new Set(orderedQuestionIds)
  const reordered = orderedQuestionIds
    .map((id) => doc.questions.find((q) => q.id === id))
    .filter((q): q is TestFormQuestion => Boolean(q))
  if (reordered.length === 0) return doc

  const questions: TestFormQuestion[] = []
  let inserted = false
  for (const q of doc.questions) {
    if (idSet.has(q.id)) {
      if (!inserted) {
        questions.push(...reordered)
        inserted = true
      }
      continue
    }
    questions.push(q)
  }
  if (!inserted) questions.push(...reordered)
  return { ...doc, questions }
}

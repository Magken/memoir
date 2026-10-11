import {
  defaultTemplateCardMeta,
  resolveAttachTemplateIds,
  serializeTemplateCardMeta,
  type InterviewFlowTemplateCardMeta,
} from './analysisLabels'
import { isCreatorAnalysisLibraryTemplateId } from './analysisTemplateCatalog'
import type { Creator2BriefDocument } from './creator2BriefTypes'
import { DEFAULT_ATTACH_PACKS } from './defaultAttachPacks'
import type { InterviewFlowAnalysisShelfState } from './flowTimelineTypes'
import { isLockedImpliedTemplateId } from '../../../../back_end/supabase/functions/interview-brief-edit/templateRoster.ts'

export type TemplateLibraryState = {
  libraryIds: string[]
  templateMeta: Record<string, InterviewFlowTemplateCardMeta>
}

export type PatchTemplateLibraryResult = {
  doc: Creator2BriefDocument
  warning?: string
}

/** Every template id currently attached on topics or tools. */
export function collectAttachedTemplateIds(doc: Creator2BriefDocument): string[] {
  const ids = new Set<string>()
  const packs = doc.analysis.attachPacks ?? DEFAULT_ATTACH_PACKS
  for (const topic of doc.topicLibrary) {
    for (const id of resolveAttachTemplateIds(topic.analysis, packs)) ids.add(id)
  }
  for (const tool of Object.values(doc.tools)) {
    for (const id of resolveAttachTemplateIds(tool.analysis, packs)) ids.add(id)
  }
  return [...ids]
}

/** How many hosts (topics + tools) reference each template id. */
export function countTemplateUsage(doc: Creator2BriefDocument): Record<string, number> {
  const counts: Record<string, number> = {}
  const packs = doc.analysis.attachPacks ?? DEFAULT_ATTACH_PACKS
  const bump = (id: string) => {
    counts[id] = (counts[id] ?? 0) + 1
  }
  for (const topic of doc.topicLibrary) {
    for (const id of resolveAttachTemplateIds(topic.analysis, packs)) bump(id)
  }
  for (const tool of Object.values(doc.tools)) {
    for (const id of resolveAttachTemplateIds(tool.analysis, packs)) bump(id)
  }
  return counts
}

function scrubTemplateFromHosts(
  doc: Creator2BriefDocument,
  templateId: string,
): Creator2BriefDocument {
  return {
    ...doc,
    topicLibrary: doc.topicLibrary.map((topic) => {
      const ids = topic.analysis?.templateIds
      if (!ids?.includes(templateId)) return topic
      return {
        ...topic,
        analysis: {
          ...topic.analysis,
          attachPack: null,
          templateIds: ids.filter((x) => x !== templateId),
        },
      }
    }),
    tools: Object.fromEntries(
      Object.entries(doc.tools).map(([ref, tool]) => {
        const ids = tool.analysis?.templateIds
        if (!ids?.includes(templateId)) return [ref, tool]
        return [
          ref,
          {
            ...tool,
            analysis: {
              ...tool.analysis,
              attachPack: null,
              templateIds: ids.filter((x) => x !== templateId),
            },
          },
        ]
      }),
    ),
  }
}

/** Persist library order + card meta (titles + shape update everywhere via shared meta). */
export function patchCreator2TemplateLibrary(
  doc: Creator2BriefDocument,
  next: TemplateLibraryState,
): PatchTemplateLibraryResult {
  const prevOverrides = doc.analysis.overrides ?? {}
  const libraryIds = [
    ...new Set(
      next.libraryIds
        .map((id) => id.trim())
        .filter((id) => id && isCreatorAnalysisLibraryTemplateId(id)),
    ),
  ]
  const templateMeta: Record<string, InterviewFlowTemplateCardMeta> = {}
  for (const id of libraryIds) {
    const row = next.templateMeta[id] ?? defaultTemplateCardMeta(id)
    templateMeta[id] = serializeTemplateCardMeta(id, row)
  }

  return {
    doc: {
      ...doc,
      analysis: {
        ...doc.analysis,
        overrides: {
          ...prevOverrides,
          libraryIds,
          templateCards: templateMeta,
        },
      },
    },
  }
}

/**
 * Remove a template from the brief library and every host that attaches it.
 * Catalog bodies are not deleted — only this brief’s attach + display meta.
 */
export function deleteCreator2Template(
  doc: Creator2BriefDocument,
  templateId: string,
  library: TemplateLibraryState,
): PatchTemplateLibraryResult {
  if (isLockedImpliedTemplateId(templateId)) {
    return { doc, warning: 'Locked implied templates cannot be deleted' }
  }
  const scrubbed = scrubTemplateFromHosts(doc, templateId)
  const nextLibrary: TemplateLibraryState = {
    libraryIds: library.libraryIds.filter((id) => id !== templateId),
    templateMeta: { ...library.templateMeta },
  }
  delete nextLibrary.templateMeta[templateId]
  return patchCreator2TemplateLibrary(scrubbed, nextLibrary)
}

/** Merge template library fields into the full analysis shelf patch surface. */
export function withTemplateLibrary(
  shelf: InterviewFlowAnalysisShelfState,
  library: TemplateLibraryState,
): InterviewFlowAnalysisShelfState {
  return {
    ...shelf,
    libraryIds: library.libraryIds,
    templateMeta: library.templateMeta,
  }
}

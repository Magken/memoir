import { isCreatorAnalysisLibraryTemplateId } from './analysisTemplateCatalog'
import type { Creator2BriefDocument } from './creator2BriefTypes'
import { DEFAULT_ATTACH_PACKS } from './defaultAttachPacks'
import type { InterviewFlowAnalysisShelfState } from './flowTimelineTypes'

export type PatchAnalysisShelfResult = {
  doc: Creator2BriefDocument
  warning?: string
}

function packsReferenced(doc: Creator2BriefDocument): Set<string> {
  const used = new Set<string>()
  for (const topic of doc.topicLibrary) {
    const pack = topic.analysis?.attachPack
    if (pack) used.add(pack)
  }
  for (const tool of Object.values(doc.tools)) {
    const pack = tool.analysis?.attachPack
    if (pack) used.add(pack)
  }
  return used
}

/** Patch top Analysis section: attachPacks + templateMeta + probeDefaults + analysisDefaults. */
export function patchCreator2AnalysisShelf(
  doc: Creator2BriefDocument,
  next: InterviewFlowAnalysisShelfState,
): PatchAnalysisShelfResult {
  const referenced = packsReferenced(doc)
  const prevPacks = doc.analysis.attachPacks ?? {}
  const nextPacks = { ...next.attachPacks }

  for (const id of Object.keys(prevPacks)) {
    if (!(id in nextPacks) && referenced.has(id)) {
      return {
        doc,
        warning: `Cannot remove “${id}” — still attached on a topic or tool.`,
      }
    }
  }

  const prevOverrides = doc.analysis.overrides ?? {}
  return {
    doc: {
      ...doc,
      definition: {
        ...doc.definition,
        probeDefaults: { ...next.probeDefaults },
        analysisDefaults: { ...next.analysisDefaults },
      },
      analysis: {
        ...doc.analysis,
        attachPacks: nextPacks,
        overrides: {
          ...prevOverrides,
          libraryIds: [
            ...new Set(
              next.libraryIds
                .map((id) => id.trim())
                .filter((id) => id && isCreatorAnalysisLibraryTemplateId(id)),
            ),
          ],
          templateCards: { ...next.templateMeta },
        },
      },
    },
  }
}

export function resetBuiltinAttachPacks(
  doc: Creator2BriefDocument,
): Creator2BriefDocument {
  const custom: Record<string, string[]> = {}
  for (const [id, ids] of Object.entries(doc.analysis.attachPacks ?? {})) {
    if (!(id in DEFAULT_ATTACH_PACKS)) custom[id] = ids
  }
  return {
    ...doc,
    analysis: {
      ...doc.analysis,
      attachPacks: { ...DEFAULT_ATTACH_PACKS, ...custom },
    },
  }
}

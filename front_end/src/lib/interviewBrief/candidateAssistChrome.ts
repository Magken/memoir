/**
 * Candidate-facing Assist chrome from the catalog — peel open, prep notice, in-gate copy.
 * Do not hardcode None/Assistant/Coach/Copilot tables in GateScene / ToolLive.
 */
import type { Creator2BriefDocument } from './creator2BriefTypes'
import catalog from './toolAssistCatalog.json'
import {
  matchToolAssistBundle,
  toolAssistInterviewerPayload,
  toolAssistPatchFromBundle,
  type ToolAssistBundleMatch,
  type ToolAssistCaps,
} from './toolAssistBundles'

export type CandidateAssistChrome = {
  bundleId: ToolAssistBundleMatch
  caps: ToolAssistCaps
  /** Preamble meta — Off / Assistant / Coach / Copilot. */
  label: string
  candidateNotice: string
  openPeel: boolean
}

function catalogNotice(bundleId: string): string {
  const row = catalog.bundles.find((b) => b.id === bundleId) as
    | { candidateNotice?: string; summary?: string }
    | undefined
  return String(row?.candidateNotice ?? row?.summary ?? '').trim()
}

function noticeFor(bundleId: string, caps: ToolAssistCaps): string {
  if (bundleId !== 'custom') {
    const named = catalogNotice(bundleId)
    if (named) return named
  }
  if (!caps.chat) {
    return catalogNotice('none') || 'There is no helper on this stage. Work through it on your own.'
  }
  if (caps.write) {
    return (
      catalogNotice('copilot') ||
      'A chat is open on the right. Ask it to suggest an edit to one part of your work. Review the suggestion before you apply it.'
    )
  }
  if (caps.spoilers) {
    return (
      catalogNotice('coach') ||
      'A chat is open on the right. Ask for a hint on one part you are stuck on. The helper will not fill in the work.'
    )
  }
  return (
    catalogNotice('assistant') ||
    'A chat is open on the right. Ask if a question, file, or instruction is unclear. The helper will explain, not hint at answers or write for you.'
  )
}

export function candidateAssistChrome(
  assist?: Partial<ToolAssistCaps> | null,
): CandidateAssistChrome {
  const payload = toolAssistInterviewerPayload(assist)
  const named = catalog.bundles.find((b) => b.id === payload.bundleId)
  const label =
    payload.bundleId === 'none'
      ? 'Off'
      : payload.bundleId === 'custom'
        ? 'Custom'
        : named?.label ?? payload.bundleId
  return {
    bundleId: payload.bundleId,
    caps: payload.caps,
    label,
    candidateNotice: noticeFor(payload.bundleId, payload.caps),
    openPeel: Boolean(payload.caps.chat),
  }
}

/** Resolve authored assist on the phase tool. Talk / missing → None. */
export function candidateAssistChromeFromBrief(
  brief: Creator2BriefDocument | null | undefined,
  phaseId: string | null | undefined,
): CandidateAssistChrome {
  if (!brief || !phaseId) return candidateAssistChrome(null)
  const phase = brief.phases.find((p) => p.id === phaseId)
  const tool =
    phase?.toolRef && brief.tools ? brief.tools[phase.toolRef] : undefined
  return candidateAssistChrome(tool?.assist)
}

/** Stamp a named bundle onto a real brief phase — tests, not toy fixtures. */
export function withToolAssist(
  brief: Creator2BriefDocument,
  phaseId: string,
  bundleId: string,
): Creator2BriefDocument {
  const next = structuredClone(brief) as Creator2BriefDocument
  const phase = next.phases.find((p) => p.id === phaseId)
  if (!phase?.toolRef || !next.tools?.[phase.toolRef]) {
    throw new Error(`withToolAssist: no tool on ${phaseId}`)
  }
  const caps = toolAssistPatchFromBundle(bundleId)
  const tool = next.tools[phase.toolRef]!
  if (matchToolAssistBundle(caps) === 'none') {
    delete tool.assist
  } else {
    tool.assist = caps
  }
  return next
}

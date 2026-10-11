/**
 * Candidate-safe section identity injected on every Talk / Assist / Copilot compose.
 */
import catalog from '../interviewBrief/toolAssistCatalog.json'
import { TALK_KIND_LABEL } from '../interviewBrief/interviewLandingView'
import type { ToolAssistCaps } from '../interviewBrief/toolAssistBundles'
import { matchToolAssistBundle, resolveToolAssistCaps } from '../interviewBrief/toolAssistBundles'

export type SectionContractKind = 'talk' | 'form' | 'coding' | 'doc'

export type SectionContract = {
  phaseId: string
  title: string
  kind: SectionContractKind
  purpose: string
  identity: string
  may: string
  mustNot: string
}

export function formatSectionContractBlock(
  contract: SectionContract,
  opts?: { firstTurn?: boolean; openingPeel?: boolean },
): string {
  const first = Boolean(opts?.firstTurn)
  const openingPeel = Boolean(opts?.openingPeel)
  const rest = openingPeel
    ? 'This is the first assessment of the interview. Interview.previousSection is empty - do not thank a prior stage or say Next up / We are moving into / This next piece. Greet once (Hi + persona as interviewer). Invite THIS title and kind of work conversationally, then say what THIS peel can do from identity MAY. Do not recap instructions, samples, constraints, or README - those already sit in the main panel. One short invite if a line is unclear.'
    : first
      ? 'This is the first turn of THIS section. Stay the same interviewer - no Hi, no name re-intro. When Interview.previousSection is set, thank or briefly nod at that title only - never recap that stage\'s README, samples, or answers. Invite THIS title and kind of work conversationally, then say what THIS peel can do from identity MAY. Do not recap instructions, samples, constraints, or README - those already sit in the main panel. One short invite if a line is unclear.'
      : 'Stay in this section. Do not drift into the previous stage job.'
  const purpose = first || openingPeel
    ? '(already on the main panel - do not recite instructions, samples, or constraints)'
    : contract.purpose.trim() || contract.title.trim() || '(none)'
  return `# SECTION CONTRACT
phaseId=${contract.phaseId.trim() || '(none)'}
title=${contract.title.trim() || '(untitled)'}
kind=${contract.kind}
purpose=${purpose}
identity=${contract.identity.trim() || '(interviewer)'}
MAY: ${contract.may.trim() || '(none)'}
MUST NOT: ${contract.mustNot.trim() || '(none)'}
${rest}`
}

type CatalogBundle = {
  id: string
  label: string
  may?: string[]
  mustNot?: string[]
}

function bundleLines(bundleId: string): { identity: string; may: string; mustNot: string } {
  const b = (catalog.bundles as CatalogBundle[]).find((row) => row.id === bundleId)
  const may = b?.may?.[0]?.trim() || ''
  const mustNot = b?.mustNot?.[0]?.trim() || ''
  if (bundleId === 'none') {
    return {
      identity: 'No helper peel (None)',
      may: may || 'Stay silent on answers.',
      mustNot: mustNot || 'Do not invent a helper role, hint, or write.',
    }
  }
  return {
    identity: `${b?.label ?? bundleId} peel`,
    may: may || 'Clarify meaning and chrome in this chat.',
    mustNot: mustNot || 'Do not re-introduce yourself. Do not leave this section.',
  }
}

export function buildTalkSectionContract(input: {
  phaseId?: string | null
  title?: string | null
  topicLabel?: string | null
  topicPurpose?: string | null
}): SectionContract {
  const title = String(input.title ?? '').trim() || String(input.topicLabel ?? '').trim() || TALK_KIND_LABEL
  const label = String(input.topicLabel ?? '').trim() || title
  return {
    phaseId: String(input.phaseId ?? ''),
    title,
    kind: 'talk',
    purpose: String(input.topicPurpose ?? '').trim() || `Talk with the candidate about ${label}.`,
    identity: 'Conversational interviewer',
    may: 'Invite this topic and ask one curious question.',
    mustNot: 'Do not say Hi or re-introduce who you are on later Talk gates.',
  }
}

export function buildAssistSectionContract(input: {
  phaseId: string
  title: string
  kind: 'form' | 'coding' | 'doc'
  purpose?: string | null
  bundleId?: string | null
  caps?: Partial<ToolAssistCaps> | null
}): Omit<SectionContract, 'kind'> & { kind: 'form' | 'coding' | 'doc' } {
  const caps = resolveToolAssistCaps(input.caps)
  const bundleId =
    (input.bundleId && String(input.bundleId).trim()) || matchToolAssistBundle(caps)
  const lines = bundleLines(bundleId)
  const kindWork =
    input.kind === 'coding'
      ? 'coding challenge'
      : input.kind === 'doc'
        ? 'writing brief'
        : 'form'
  return {
    phaseId: input.phaseId,
    title: input.title.trim() || kindWork,
    kind: input.kind,
    purpose:
      String(input.purpose ?? '').trim() ||
      `Help the candidate work through this ${kindWork}.`,
    identity: lines.identity,
    may: lines.may,
    mustNot: lines.mustNot,
  }
}

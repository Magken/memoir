/**
 * Build the headless blank-slate userMessage for interview-brief-edit.
 * String assembly only - does not change Edge detectors.
 */
import type { InterviewComposeMeta } from './compose'

export function buildComposeBlankSlateUserMessage(input: {
  meta: InterviewComposeMeta
  rolePdfText?: string | null
  coverName?: string | null
}): string {
  const m = input.meta
  const role = m.roleTitle.trim() || 'the role'
  const title = m.title.trim() || role
  const description = m.description.trim()
  const candidateDescription = m.candidateDescription.trim()

  const metaLines = [
    `Interview title: ${title}`,
    `Role title: ${role}`,
    m.category.trim() ? `Category: ${m.category.trim()}` : null,
    m.proposedMinutes.trim() ? `Proposed minutes: ${m.proposedMinutes.trim()}` : null,
    m.maxInterviews.trim() ? `Max interviews: ${m.maxInterviews.trim()}` : null,
    m.opensAt.trim() ? `Opens at: ${m.opensAt.trim()}` : null,
    m.closesAt.trim() ? `Closes at: ${m.closesAt.trim()}` : null,
    m.rolePdfName.trim() ? `Role PDF filename: ${m.rolePdfName.trim()}` : null,
    input.coverName?.trim() ? `Cover filename: ${input.coverName.trim()}` : null,
    m.personaName.trim() ? `Assessor name: ${m.personaName.trim()}` : null,
    m.personaVoice.trim() ? `Assessor voice: ${m.personaVoice.trim()}` : null,
    m.personaBehaviour.trim()
      ? `Assessor behaviour: ${m.personaBehaviour.trim()}`
      : null,
  ].filter(Boolean)

  const pdf =
    input.rolePdfText && input.rolePdfText.trim()
      ? `\n\nRole description PDF extract:\n${input.rolePdfText.trim().slice(0, 12000)}`
      : ''

  const candidateBlock = candidateDescription
    ? [
        ``,
        `What candidates see (meta.candidateDescription)`,
        `Keep this text as the interviewee-facing intro (polish lightly if needed; do not replace with agency notes).`,
        candidateDescription,
      ].join('\n')
    : [
        ``,
        `What candidates see (meta.candidateDescription)`,
        `Invent a polished interviewee-facing intro (1-3 short paragraphs and/or light bullets).`,
        `This is NOT meta.roleDescription. Keep an authored Interview description; fill roleDescription only when that field is empty.`,
        `Never copy roleDescription into candidateDescription or the reverse.`,
      ].join('\n')

  return [
    `I'm building a brand-new interview from a blank slate for a ${role} hire.`,
    `Please set this up end to end in one pass from scratch: meta, flow order, sections I describe,`,
    `timers, pass gates, fail jumps, templates when scoring is implied, and Decision weights with section sources.`,
    `Be concrete and role-specific; I don't want generic placeholder copy.`,
    ``,
    `Compose meta`,
    ...metaLines.map((line) => `- ${line}`),
    ``,
    `Identity: if Interview description names a different interview title (Title the interview **…**) or role (Role title: **…**), PATCH definition.meta.title and roleTitle to those values. Compose meta bullets are leftover form fields when they disagree. Assessor persona still comes from description when Compose has no Assessor name.`,
    ``,
    `Interview description (agency notes — keep if already written; fill only when empty unless I ask to change it)`,
    description || `(see compose meta: expand into a full interview from the description and PDF context)`,
    candidateBlock,
    pdf,
  ].join('\n')
}

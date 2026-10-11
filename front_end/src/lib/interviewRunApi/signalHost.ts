/**
 * sig.clarity.v1 host leftovers — collect.scalar, never afterTurnEligible.
 * Grains land on topics/tools then compose Overview Clarity. Hidden from verify cards.
 */
export const CLARITY_TEMPLATE_ID = 'sig.clarity.v1'
export const SECURITY_TEMPLATE_ID = 'sig.security.v1'

export function isSignalTemplateId(templateId: string): boolean {
  return String(templateId ?? '').startsWith('sig.')
}

export function isClarityHostTemplateId(templateId: string): boolean {
  return templateId === CLARITY_TEMPLATE_ID
}

/** Inject sitting-clarity leftover onto every Talk topic_end id list. */
export function withClarityHostLeftover(ids: readonly string[]): string[] {
  const out = ids.filter(Boolean)
  if (!out.includes(CLARITY_TEMPLATE_ID)) out.push(CLARITY_TEMPLATE_ID)
  return out
}

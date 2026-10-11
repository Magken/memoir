/**
 * FE-local Assessor Aid conversation fixture store (localStorage).
 * No chat_messages / RPC this slice — follow-ups persist per fixture+section.
 */
export type AssessorAidFixtureMessage = {
  id: string
  role: 'assistant' | 'candidate'
  text: string
  /** ISO send time — stored with the fixture conversation. */
  at?: string
  citeMessageIds?: string[]
  citeTopicId?: string
  openRefs?: import('./aidPeelAttach').AidOpenRef[]
}

export type AssessorAidConversationFixture = {
  conversationId: string
  fixtureKey: string
  sectionKey: string
  messages: AssessorAidFixtureMessage[]
  draft: string
  updatedAt: string
}

const STORAGE_PREFIX = 'vurify.assessorAid.v1:'

function storageKey(fixtureKey: string, sectionKey: string): string {
  return `${STORAGE_PREFIX}${fixtureKey}:${sectionKey}`
}

export function loadAssessorAidConversation(
  fixtureKey: string,
  sectionKey: string,
): AssessorAidConversationFixture {
  const key = storageKey(fixtureKey, sectionKey)
  const conversationId = `aid:${fixtureKey}:${sectionKey}`
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const parsed = JSON.parse(raw) as AssessorAidConversationFixture
      if (parsed && Array.isArray(parsed.messages)) {
        return {
          conversationId,
          fixtureKey,
          sectionKey,
          messages: parsed.messages,
          draft: typeof parsed.draft === 'string' ? parsed.draft : '',
          updatedAt: parsed.updatedAt || new Date().toISOString(),
        }
      }
    }
  } catch {
    /* ignore */
  }
  return {
    conversationId,
    fixtureKey,
    sectionKey,
    messages: [],
    draft: '',
    updatedAt: new Date().toISOString(),
  }
}

export function saveAssessorAidConversation(
  fixture: AssessorAidConversationFixture,
): void {
  const key = storageKey(fixture.fixtureKey, fixture.sectionKey)
  const next: AssessorAidConversationFixture = {
    ...fixture,
    updatedAt: new Date().toISOString(),
  }
  try {
    localStorage.setItem(key, JSON.stringify(next))
  } catch {
    /* ignore quota */
  }
}

export function clearAssessorAidConversation(
  fixtureKey: string,
  sectionKey: string,
): void {
  try {
    localStorage.removeItem(storageKey(fixtureKey, sectionKey))
  } catch {
    /* ignore */
  }
}

const CANNED_OPENER =
  /\b(Happy to walk|Happy to help|marking rail|which grain|which one should we open|sections are in the overlay|This pack is in front of you|This pack is the|I was initially confused|asked the copilot)\b/i

export function isCannedAidOpener(text: string): boolean {
  return CANNED_OPENER.test(String(text || ''))
}

/** Empty thread, or the old fixture greeting with no recruiter turns yet. */
export function aidConversationNeedsOpen(messages: AssessorAidFixtureMessage[]): boolean {
  if (!messages.length) return true
  if (messages.length === 1 && messages[0]?.role === 'assistant' && isCannedAidOpener(messages[0].text)) {
    return true
  }
  return false
}

export function seedAssessorAidOpener(
  fixtureKey: string,
  sectionKey: string,
  openerText: string,
): AssessorAidConversationFixture {
  const existing = loadAssessorAidConversation(fixtureKey, sectionKey)
  if (!aidConversationNeedsOpen(existing.messages)) return existing
  const seeded: AssessorAidConversationFixture = {
    ...existing,
    messages: [
      {
        id: `aid-open-${Date.now().toString(36)}`,
        role: 'assistant',
        text: openerText,
        at: new Date().toISOString(),
      },
    ],
  }
  saveAssessorAidConversation(seeded)
  return seeded
}

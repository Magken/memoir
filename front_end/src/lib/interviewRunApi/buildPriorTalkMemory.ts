import type { InterviewResponse, InterviewResponseMessage } from './talkTypes'

export type PriorTalkMemory = {
  /** Full pack for Edge compose (~600–900 chars). */
  note: string
  /** Short bridge line for deterministic opener fallback. */
  bridge: string
  /** True when there is usable prior Talk content. */
  hasMemory: boolean
}

const MAX_NOTE = 900
const MAX_BRIDGE = 160
const MAX_QUOTES_PER_PHASE = 3
const MAX_QUOTE_LEN = 120
const MAX_SYNTH_LEN = 220

function clip(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1).trim()}…`
}

function priorPhaseIds(
  messages: readonly InterviewResponseMessage[],
  currentPhaseId: string,
  currentTopicId: string,
): string[] {
  const order: string[] = []
  const seen = new Set<string>()
  for (const m of messages) {
    if (m.phaseId === currentPhaseId) continue
    if (m.topicId === currentTopicId) continue
    if (seen.has(m.phaseId)) continue
    seen.add(m.phaseId)
    order.push(m.phaseId)
  }
  return order
}

/**
 * Compact cross-Talk memory from InterviewResponse for openers + mid-turn compose.
 * Excludes the current topic/phase. Newest prior phases last in quote blocks
 * so the model sees recent context near the end of the note.
 */
export function buildPriorTalkMemory(input: {
  response: InterviewResponse
  currentTopicId: string
  currentPhaseId: string
}): PriorTalkMemory {
  const { response, currentTopicId, currentPhaseId } = input
  const parts: string[] = []
  const bridgeBits: string[] = []

  const synthEntries = Object.entries(response.analysis.topics ?? {})
    .filter(([topicId, stub]) => topicId !== currentTopicId && stub?.synthesisText?.trim())
    .map(([topicId, stub]) => ({
      topicId,
      text: clip(stub!.synthesisText!.trim(), MAX_SYNTH_LEN),
    }))

  if (synthEntries.length > 0) {
    parts.push(
      'Prior topic synthesises:\n' +
        synthEntries.map((e) => `- (${e.topicId}) ${e.text}`).join('\n'),
    )
    bridgeBits.push(synthEntries[synthEntries.length - 1]!.text)
  }

  const phaseIds = priorPhaseIds(response.messages, currentPhaseId, currentTopicId)
  for (const phaseId of phaseIds) {
    const cands = response.messages
      .filter((m) => m.phaseId === phaseId && m.role === 'candidate' && m.text.trim())
      .slice(-MAX_QUOTES_PER_PHASE)
    if (cands.length === 0) continue
    const topicHint = cands.find((m) => m.topicId)?.topicId ?? 'prior'
    const lines = cands.map((m) => `- "${clip(m.text, MAX_QUOTE_LEN)}"`)
    parts.push(`Prior candidate quotes (${topicHint} / ${phaseId}):\n${lines.join('\n')}`)
    const last = cands[cands.length - 1]!
    if (bridgeBits.length < 2) bridgeBits.push(clip(last.text, 80))
  }

  if (parts.length === 0) {
    return { note: '', bridge: '', hasMemory: false }
  }

  let note = parts.join('\n\n')
  if (note.length > MAX_NOTE) note = `${note.slice(0, MAX_NOTE - 1).trim()}…`

  const bridgeRaw = bridgeBits[0] ?? ''
  let bridge = ''
  if (bridgeRaw) {
    const cleaned = bridgeRaw.replace(/^Earlier you (shared|mentioned|said):\s*/i, '').trim()
    if (/^I\b/i.test(cleaned)) {
      bridge = clip(
        `Earlier you said you ${cleaned.replace(/^I\s+/i, '').replace(/[.?!]$/, '')}.`,
        MAX_BRIDGE,
      )
    } else {
      bridge = clip(`Earlier you mentioned ${cleaned.replace(/[.?!]$/, '')}.`, MAX_BRIDGE)
    }
  }

  return { note, bridge, hasMemory: true }
}

/** Messages belonging to the active Talk phase (for Edge transcript focus). */
export function currentPhaseMessages(
  messages: readonly InterviewResponseMessage[],
  phaseId: string,
): InterviewResponseMessage[] {
  return messages.filter((m) => m.phaseId === phaseId)
}

/** Prior-phase messages only (for Edge open with cross-Talk recall). */
export function priorPhaseMessages(
  messages: readonly InterviewResponseMessage[],
  currentPhaseId: string,
  currentTopicId: string,
): InterviewResponseMessage[] {
  return messages.filter(
    (m) => m.phaseId !== currentPhaseId && m.topicId !== currentTopicId,
  )
}

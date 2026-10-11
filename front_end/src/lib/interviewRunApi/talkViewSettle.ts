/**
 * Talk send + stream-settle helpers — keep optimistic/stream React keys stable.
 */
import type { TalkRuntimeView } from './talkTypes'

export function shouldAcceptTalkSend(input: {
  busy: boolean
  sending: boolean
  text: string
}): boolean {
  return Boolean(input.text.trim()) && !input.busy && !input.sending
}

/**
 * When Edge finishes, message ids flip (opt_/stream_ → real) and stripToFinalAsk
 * may change assistant text. Keep the live row's id/at when role+index match so
 * the typed ChatBubble does not remount on settle.
 */
export function stabilizeTalkViewIds(
  prev: TalkRuntimeView | null,
  next: TalkRuntimeView | null,
): TalkRuntimeView | null {
  if (!next || !prev) return next
  const prevMsgs = prev.state.messages
  const nextMsgs = next.state.messages
  if (prevMsgs.length !== nextMsgs.length) return next
  let changed = false
  const messages = nextMsgs.map((m, i) => {
    const p = prevMsgs[i]
    if (!p || p.role !== m.role) return m
    if (p.id === m.id && p.at === m.at) return m
    changed = true
    return { ...m, id: p.id, at: m.at > 0 ? m.at : p.at }
  })
  if (!changed) return next
  return { ...next, state: { ...next.state, messages } }
}

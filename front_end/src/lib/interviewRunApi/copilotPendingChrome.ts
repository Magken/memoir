/**
 * Latest pending proposal in the peel thread. History Apply is disabled unless this id matches.
 */
export function latestCopilotPendingMessageId(
  messages: Array<{ id: string; role: string; pendingStatus?: string | null }>,
): string | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const m = messages[i]
    if (m?.role === 'assistant' && m.pendingStatus === 'pending') return m.id
  }
  return null
}

export function copilotApplyEnabled(input: {
  messages: Array<{ id: string; role: string; pendingStatus?: string | null; editRunId?: string | null }>
  messageId: string
  liveEditRunId?: string | null
}): boolean {
  const live = latestCopilotPendingMessageId(input.messages)
  if (!live || live !== input.messageId) return false
  const msg = input.messages.find((m) => m.id === input.messageId)
  if (!msg || msg.pendingStatus !== 'pending') return false
  if (input.liveEditRunId && msg.editRunId && input.liveEditRunId !== msg.editRunId) return false
  return true
}

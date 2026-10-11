import type { InterviewEditMessagePart } from '../interviewEditApi'
import type { MessagePart } from '../chat/types'
import { scrubBrokenTalkMarkdown } from './stripToFinalAsk'

/** Map Copilot Edge reply_parts onto ChatBubble parts (fold + Apply outside fold). */
export function mapCopilotReplyParts(parts: InterviewEditMessagePart[]): MessagePart[] {
  const out: MessagePart[] = []
  const menus: Extract<MessagePart, { type: 'card' }>['actions'] = []
  const links: Extract<MessagePart, { type: 'card' }>['actions'] = []
  let n = 0
  for (const part of parts) {
    if (part.type === 'markdown') {
      const raw = String(part.text ?? (part as { markdown?: string }).markdown ?? '')
      out.push({ type: 'markdown', markdown: scrubBrokenTalkMarkdown(raw) })
      continue
    }
    if (part.type === 'thinking') {
      out.push({
        type: 'thinking',
        text: part.text,
        summary: part.summary || 'View change',
        collapsed: part.collapsed ?? true,
      })
      continue
    }
    if (part.type === 'divider') {
      continue
    }
    n += 1
    const action = {
      id: `copilot.${part.intent}.${n}`,
      label: part.title,
      actionId: part.actionId,
      value: part.body,
    }
    if (part.intent === 'apply') menus.push(action)
    else links.push(action)
  }
  if (menus.length || links.length) {
    out.push({ type: 'divider', label: 'Actions' })
    if (menus.length) {
      out.push({ type: 'card', title: '', presentation: 'vurify-menu', actions: menus })
    }
    if (links.length) {
      out.push({ type: 'card', title: 'Open', presentation: 'links', actions: links })
    }
  }
  return out
}

/** Keep an open questionnaire sheet; never merge skip-guess markdown into it. */
export function keepCopilotQuestionnaireSheet(existing: MessagePart[] | undefined): MessagePart[] {
  return (existing ?? []).filter((p) => p.type === 'planning')
}

/** Keep an open questionnaire sheet when later reply_parts would otherwise wipe it. */
export function keepCopilotPlanningParts(
  existing: MessagePart[] | undefined,
  incoming: MessagePart[],
): MessagePart[] {
  const kept = (existing ?? []).filter(
    (p) => p.type === 'thinking' || p.type === 'planning' || p.type === 'status',
  )
  if (!kept.length) return incoming
  const rest = incoming.filter((p) => p.type !== 'planning')
  return [...kept, ...rest]
}

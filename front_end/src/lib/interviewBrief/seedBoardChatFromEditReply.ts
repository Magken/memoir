/**
 * Persist edit done.replyParts as a board peel assistant message
 * (botRunBegin + botRunFinalize). Generate and Regenerate always write so a
 * prior fail notice cannot hide the success reply. Remount does not call this.
 */
import * as assessmentApi from '../assessmentApi'
import * as chatApi from '../chatApi'
import type { MessagePart } from '../chat/types'
import type { InterviewEditMessagePart } from '../interviewEditApi'
import { scrubChatDashMarkers } from '../interviewRunApi/stripToFinalAsk'

function scrubDashes(text: string): string {
  return scrubChatDashMarkers(text)
}

/** Map Edge reply parts to chat MessageParts for finalize (markdown + Actions links). */
export function mapEditReplyPartsForSeed(
  parts: InterviewEditMessagePart[] | undefined,
  opts?: { body?: Record<string, unknown> | null; regenerate?: boolean },
): MessagePart[] {
  const out: MessagePart[] = []
  const linkActions: Extract<MessagePart, { type: 'card' }>['actions'] = []
  let n = 0

  for (const part of parts ?? []) {
    if (part.type === 'markdown') {
      const md = scrubDashes(part.text ?? '').trim()
      if (md) out.push({ type: 'markdown', markdown: md })
      continue
    }
    if (part.type !== 'card') continue
    n += 1
    const targetId =
      typeof part.targetSectionId === 'string' ? part.targetSectionId.trim() : ''
    if (part.intent === 'scroll' || part.intent === 'open') {
      if (!targetId) continue
      const title = scrubDashes(part.title ?? '').trim() || targetId
      linkActions?.push({
        id: `seed.open.${targetId}.${n}`,
        label: title,
        actionId: 'creator2.action.open-section',
        value: targetId,
      })
      continue
    }
    if (part.intent === 'apply' || part.intent === 'save') {
      // Seed after blank-slate usually has no pending apply — skip menu CTAs.
      continue
    }
  }

  if ((linkActions?.length ?? 0) > 0) {
    out.push({ type: 'divider', label: 'Actions' })
    out.push({
      type: 'card',
      title: 'Open',
      presentation: 'links',
      actions: linkActions,
    })
  }

  if (!out.length) {
    const phases = Array.isArray(opts?.body?.phases)
      ? (opts!.body!.phases as Array<Record<string, unknown>>)
      : []
    const titles = phases
      .map((p) => String(p.title ?? '').trim())
      .filter(Boolean)
      .slice(0, 12)
    const list = titles.length
      ? `\n\n${titles.map((t, i) => `${i + 1}. ${t}`).join('\n')}`
      : ''
    out.push({
      type: 'markdown',
      markdown: scrubDashes(
        opts?.regenerate
          ? `Regenerated the interview.${list}`
          : `Your interview is ready.${list}`,
      ),
    })
  } else if (opts?.regenerate) {
    out.unshift({
      type: 'markdown',
      markdown: scrubDashes('Regenerated the interview from compose. Updated flow:'),
    })
  }
  return out
}

/**
 * Open board bot conversation and finalize a compose Generate / Regenerate reply.
 * Always persist the assistant parts (success or fail). A prior fail notice must
 * not block the Generate success message.
 */
export async function seedBoardChatFromEditReply(input: {
  accountId: string
  briefId: string
  replyParts?: InterviewEditMessagePart[]
  body?: Record<string, unknown> | null
  title?: string
  mode?: 'seed' | 'append'
  regenerate?: boolean
  failMarkdown?: string
}): Promise<{ conversationId: string; seeded: boolean }> {
  const opened = await assessmentApi.boardBotOpen(input.accountId, input.briefId, {
    title: input.title ?? 'Board assistant',
  })
  const conversationId = opened.conversationId?.trim()
  if (!conversationId) {
    throw new Error('board_bot_open_missing_conversation')
  }

  const failText = input.failMarkdown?.trim()
  const parts = failText
    ? ([{ type: 'markdown', markdown: scrubDashes(failText) }] as MessagePart[])
    : mapEditReplyPartsForSeed(input.replyParts, {
        body: input.body ?? null,
        regenerate: Boolean(input.regenerate),
      })
  const begin = await chatApi.botRunBegin(conversationId)
  const runId = String(
    (begin as { runId?: string; run_id?: string } | null)?.runId ??
      (begin as { run_id?: string } | null)?.run_id ??
      '',
  ).trim()
  if (!runId) throw new Error('bot_run_begin_empty')
  await chatApi.botRunFinalize(runId, parts)
  return { conversationId, seeded: true }
}

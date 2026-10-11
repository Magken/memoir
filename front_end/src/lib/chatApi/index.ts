/**
 * chatApi — DEFINER RPC wrappers for app_chat / app_bot_chat peer system.
 */
import {
  callPlatform,
  getSupabase,
  getSupabasePublicKey,
  getSupabaseUrl,
  DataApiError,
  unwrapPlatformEnvelope,
} from '../dataApi'
import type { PlatformEnvelope } from '../dataApi'
import type { MessagePart } from '../chat/types'

function unwrap<T>(env: PlatformEnvelope<T>): T {
  return unwrapPlatformEnvelope(env)
}

export type ChatInboxRow = {
  id: string
  kind: 'direct' | 'group' | 'bot'
  membershipSource?: string
  accountId?: string | null
  title?: string | null
  avatarUrl?: string | null
  pinned?: boolean
  muted?: boolean
  archived?: boolean
  draft?: string | null
  unreadCount?: number
  lastMessageAt?: string | null
  lastMessageId?: string | null
  lastMessagePreview?: string | null
  lastSenderId?: string | null
  lastReadSeq?: number
  role?: string
  createdAt?: string
  updatedAt?: string
  model?: string
  botKey?: string
}

export type ChatMessageRow = {
  id: string
  conversationId: string
  seq: number
  role: string
  senderId?: string | null
  parts: MessagePart[]
  createdAt: string
  editedAt?: string | null
  deletedAt?: string | null
  replyToId?: string | null
  clientNonce?: string | null
  reactions?: Array<{ emoji: string; participantIds: string[] }>
}

export async function heartbeat() {
  return unwrap(await callPlatform<Record<string, unknown>>('app_chat_heartbeat', {}))
}

export async function directOpen(otherUserId: string) {
  return unwrap(
    await callPlatform<ChatInboxRow>('app_chat_direct_open', {
      p_other_user_id: otherUserId,
    }),
  )
}

export async function conversationsList(opts?: {
  limit?: number
  includeArchived?: boolean
  query?: string
}) {
  return unwrap(
    await callPlatform<ChatInboxRow[]>('app_chat_conversations_list', {
      p_limit: opts?.limit ?? 50,
      p_include_archived: opts?.includeArchived ?? false,
      p_query: opts?.query ?? null,
    }),
  )
}

export async function inboxSince(after?: string | null) {
  return unwrap(
    await callPlatform<ChatInboxRow[]>('app_chat_inbox_since', {
      p_after: after ?? null,
    }),
  )
}

export async function messagesList(
  conversationId: string,
  opts?: {
    limit?: number
    beforeSeq?: number | null
    afterSeq?: number | null
    aroundMessageId?: string | null
  },
) {
  const env = await callPlatform<ChatMessageRow[]>('app_chat_messages_list', {
    p_conversation_id: conversationId,
    p_limit: opts?.limit ?? 50,
    p_before_seq: opts?.beforeSeq ?? null,
    p_after_seq: opts?.afterSeq ?? null,
    p_around_message_id: opts?.aroundMessageId ?? null,
  })
  return { rows: unwrap(env), meta: env.meta ?? {} }
}

export async function messagesSince(conversationId: string, afterSeq = 0, limit = 100) {
  return messagesList(conversationId, { afterSeq, limit })
}

export async function sendMessage(input: {
  conversationId: string
  parts: MessagePart[]
  clientNonce?: string
  replyToId?: string
  fileNodeIds?: string[]
}) {
  return unwrap(
    await callPlatform<ChatMessageRow>('app_chat_send', {
      p_conversation_id: input.conversationId,
      p_parts: input.parts,
      p_client_nonce: input.clientNonce ?? null,
      p_reply_to_id: input.replyToId ?? null,
      p_file_node_ids: input.fileNodeIds ?? null,
      p_role: null,
    }),
  )
}

export async function markRead(conversationId: string, upToSeq: number) {
  return unwrap(
    await callPlatform<{ conversationId: string; lastReadSeq: number; unreadCount: number }>(
      'app_chat_mark_read',
      { p_conversation_id: conversationId, p_up_to_seq: upToSeq },
    ),
  )
}

export async function setMemberSettings(
  conversationId: string,
  patch: { pinned?: boolean; muted?: boolean; archived?: boolean; draft?: string | null },
) {
  return unwrap(
    await callPlatform<ChatInboxRow>('app_chat_set_member_settings', {
      p_conversation_id: conversationId,
      p_pinned: patch.pinned ?? null,
      p_muted: patch.muted ?? null,
      p_archived: patch.archived ?? null,
      p_draft: patch.draft ?? null,
    }),
  )
}

export async function react(messageId: string, emoji: string, on = true) {
  return unwrap(
    await callPlatform<ChatMessageRow>('app_chat_react', {
      p_message_id: messageId,
      p_emoji: emoji,
      p_on: on,
    }),
  )
}

export async function editMessage(messageId: string, parts: MessagePart[]) {
  return unwrap(
    await callPlatform<ChatMessageRow>('app_chat_edit_message', {
      p_message_id: messageId,
      p_parts: parts,
    }),
  )
}

export async function deleteMessage(messageId: string, scope: 'me' | 'everyone' = 'me') {
  return unwrap(
    await callPlatform<{ id: string; scope: string }>('app_chat_delete_message', {
      p_message_id: messageId,
      p_scope: scope,
    }),
  )
}

export async function groupCreate(title: string, memberIds?: string[]) {
  return unwrap(
    await callPlatform<ChatInboxRow>('app_chat_group_create', {
      p_title: title,
      p_member_ids: memberIds ?? null,
    }),
  )
}

export async function groupInviteRespond(inviteId: string, accept: boolean) {
  return unwrap(
    await callPlatform<Record<string, unknown>>('app_chat_group_invite_respond', {
      p_invite_id: inviteId,
      p_accept: accept,
    }),
  )
}

export async function groupSetRole(
  conversationId: string,
  userId: string,
  role: 'owner' | 'admin' | 'member',
) {
  return unwrap(
    await callPlatform<Record<string, unknown>>('app_chat_group_set_role', {
      p_conversation_id: conversationId,
      p_user_id: userId,
      p_role: role,
    }),
  )
}

export async function groupRemoveMember(conversationId: string, userId: string) {
  return unwrap(
    await callPlatform<Record<string, unknown>>('app_chat_group_remove_member', {
      p_conversation_id: conversationId,
      p_user_id: userId,
    }),
  )
}

export async function membersList(conversationId: string) {
  return unwrap(
    await callPlatform<
      Array<{
        userId: string
        role: string
        status: string
        displayName?: string
        username?: string
        avatarUrl?: string
        lastSeenAt?: string
      }>
    >('app_chat_members_list', { p_conversation_id: conversationId }),
  )
}

export async function searchMessages(conversationId: string, query: string, limit = 20) {
  return unwrap(
    await callPlatform<ChatMessageRow[]>('app_chat_search_messages', {
      p_conversation_id: conversationId,
      p_query: query,
      p_limit: limit,
    }),
  )
}

export async function actionDecide(actionId: string, approve: boolean) {
  return unwrap(
    await callPlatform<{
      id: string
      status: string
      documentNodeId?: string | null
      editorPatch?: {
        actionKey: string
        editorActionId: string
        payload: Record<string, unknown>
      } | null
    }>('app_chat_action_decide', {
      p_action_id: actionId,
      p_approve: approve,
    }),
  )
}

export async function snapshotExport(conversationId: string) {
  return unwrap(
    await callPlatform<Record<string, unknown>>('app_chat_snapshot_export', {
      p_conversation_id: conversationId,
    }),
  )
}

export async function orgEnsure(accountId: string) {
  return unwrap(
    await callPlatform<ChatInboxRow>('app_chat_org_ensure', {
      p_account_id: accountId,
    }),
  )
}

export async function botCreate(title?: string, botKey = 'default') {
  return unwrap(
    await callPlatform<ChatInboxRow>('app_chat_bot_create', {
      p_title: title ?? 'New chat',
      p_bot_key: botKey,
    }),
  )
}

export async function botRunBegin(
  conversationId: string,
  sourceMessageId?: string,
  parentRunId?: string,
) {
  return unwrap(
    await callPlatform<Record<string, unknown>>('app_chat_bot_run_begin', {
      p_conversation_id: conversationId,
      p_source_message_id: sourceMessageId ?? null,
      p_parent_run_id: parentRunId ?? null,
    }),
  )
}

/** Persist an assistant message for a begun run (board peel / Edge-driven turns). */
export async function botRunFinalize(
  runId: string,
  parts: MessagePart[],
  opts: {
    tokenPrompt?: number
    tokenCompletion?: number
    latencyMs?: number
    actions?: unknown[]
  } = {},
) {
  return unwrap(
    await callPlatform<{
      runId: string
      status: string
      message: ChatMessageRow
    }>('app_chat_bot_run_finalize', {
      p_run_id: runId,
      p_parts: parts,
      p_token_prompt: opts.tokenPrompt ?? null,
      p_token_completion: opts.tokenCompletion ?? null,
      p_latency_ms: opts.latencyMs ?? null,
      p_actions: opts.actions ?? null,
    }),
  )
}

export async function botRunFail(runId: string, error = 'failed') {
  return unwrap(
    await callPlatform<Record<string, unknown>>('app_chat_bot_run_fail', {
      p_run_id: runId,
      p_error: error,
    }),
  )
}

export async function botRunCancel(runId: string) {
  return unwrap(
    await callPlatform<Record<string, unknown>>('app_chat_bot_run_cancel', {
      p_run_id: runId,
    }),
  )
}

export type BotStreamEvent =
  | { event: 'start'; data: { runId: string; model?: string } }
  | { event: 'delta'; data: { text: string } }
  | { event: 'action'; data: unknown }
  | { event: 'usage'; data: unknown }
  | { event: 'done'; data: unknown }
  | { event: 'error'; data: { error: string; detail?: string } }

export async function runBotStream(
  input: { conversationId: string; sourceMessageId?: string; parentRunId?: string },
  onEvent: (ev: BotStreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const supabase = getSupabase()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new DataApiError('not_authenticated', 'not_authenticated')
  }
  const base = getSupabaseUrl()
  const res = await fetch(`${base}/functions/v1/chat-bot-run`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: getSupabasePublicKey(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      conversationId: input.conversationId,
      sourceMessageId: input.sourceMessageId,
      parentRunId: input.parentRunId,
    }),
    signal,
  })
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '')
    throw new DataApiError('unknown', text || `chat-bot-run ${res.status}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const chunks = buffer.split('\n\n')
    buffer = chunks.pop() ?? ''
    for (const chunk of chunks) {
      const lines = chunk.split('\n')
      let event = 'message'
      let data = ''
      for (const line of lines) {
        if (line.startsWith('event:')) event = line.slice(6).trim()
        if (line.startsWith('data:')) data += line.slice(5).trim()
      }
      if (!data) continue
      try {
        onEvent({ event, data: JSON.parse(data) } as BotStreamEvent)
      } catch {
        onEvent({ event: 'error', data: { error: 'bad_sse_json' } })
      }
    }
  }
}

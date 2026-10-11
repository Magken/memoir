import type { ChatConversation, ChatMessage, ChatParticipant, DmEditorPayload } from './types'
import { createId, nowIso } from './utils'

const SELF: ChatParticipant = {
  id: 'user_self',
  displayName: 'You',
  handle: '@you',
  initials: 'YO',
  role: 'self',
  presence: 'online',
}

const MAYA: ChatParticipant = {
  id: 'user_maya',
  displayName: 'Maya Chen',
  handle: '@maya',
  initials: 'MC',
  role: 'member',
  presence: 'online',
  avatarUrl: 'https://i.pravatar.cc/128?u=maya',
}

const JULES: ChatParticipant = {
  id: 'user_jules',
  displayName: 'Jules Okonkwo',
  handle: '@jules',
  initials: 'JO',
  role: 'admin',
  presence: 'away',
  avatarUrl: 'https://i.pravatar.cc/128?u=jules',
}

const RIN: ChatParticipant = {
  id: 'user_rin',
  displayName: 'Rin Park',
  handle: '@rin',
  initials: 'RP',
  role: 'member',
  presence: 'offline',
  avatarUrl: 'https://i.pravatar.cc/128?u=rin',
}

const GHOST: ChatParticipant = {
  id: 'user_ghost',
  displayName: 'Deleted user',
  initials: '?',
  role: 'member',
  presence: 'unavailable',
}

function msg(
  conversationId: string,
  role: ChatMessage['role'],
  senderId: string,
  parts: ChatMessage['parts'],
  minutesAgo: number,
  extra: Partial<ChatMessage> = {},
): ChatMessage {
  return {
    id: createId('msg'),
    conversationId,
    role,
    senderId,
    parts,
    createdAt: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
    delivery: senderId === SELF.id ? 'read' : undefined,
    ...extra,
  }
}

export function createDmSeed(): DmEditorPayload {
  const dmId = 'dm_maya'
  const groupId = 'dm_group_design'
  const mediaId = 'dm_media'
  const archivedId = 'dm_archived'

  const conversations: ChatConversation[] = [
    {
      id: dmId,
      surface: 'dm',
      kind: 'dm',
      title: MAYA.displayName,
      participantIds: [SELF.id, MAYA.id],
      unreadCount: 2,
      typingParticipantIds: [MAYA.id],
      messages: [
        msg(dmId, 'member', MAYA.id, [{ type: 'text', text: 'Can you review the chat composer?' }], 30),
        msg(dmId, 'member', SELF.id, [{ type: 'text', text: 'On it — checking attach previews now.' }], 28, {
          delivery: 'read',
        }),
        msg(dmId, 'member', MAYA.id, [{ type: 'text', text: 'Also try the reply + reaction flows.' }], 5),
        msg(
          dmId,
          'member',
          SELF.id,
          [{ type: 'text', text: 'Replied below with a quote.' }],
          3,
          {
            delivery: 'delivered',
            replyToId: undefined,
          },
        ),
      ],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
    {
      id: groupId,
      surface: 'dm',
      kind: 'group',
      title: 'Design systems crew',
      participantIds: [SELF.id, MAYA.id, JULES.id, RIN.id],
      pinned: true,
      avatarUrl: 'https://picsum.photos/seed/groupavatar/128/128',
      messages: [
        msg(groupId, 'system', SELF.id, [{ type: 'system', text: 'Jules created the group' }], 120),
        msg(groupId, 'member', JULES.id, [{ type: 'text', text: 'Welcome — drop media samples here.' }], 110),
        msg(groupId, 'member', RIN.id, [{ type: 'text', text: 'Stacking avatars look good in the header.' }], 90),
        msg(
          groupId,
          'member',
          MAYA.id,
          [
            {
              type: 'gallery',
              layout: 'grid',
              items: [
                { id: 'gm1', src: 'https://picsum.photos/seed/gm1/400/400', alt: 'Mood 1' },
                { id: 'gm2', src: 'https://picsum.photos/seed/gm2/400/400', alt: 'Mood 2' },
                { id: 'gm3', src: 'https://picsum.photos/seed/gm3/400/400', alt: 'Mood 3' },
                { id: 'gm4', src: 'https://picsum.photos/seed/gm4/400/400', alt: 'Mood 4' },
              ],
            },
          ],
          80,
        ),
        msg(groupId, 'member', SELF.id, [{ type: 'text', text: 'Nice — opening the info panel next.' }], 70, {
          delivery: 'read',
          reactions: [{ emoji: '👍', participantIds: [MAYA.id, JULES.id] }],
        }),
      ],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
    {
      id: mediaId,
      surface: 'dm',
      kind: 'dm',
      title: JULES.displayName,
      participantIds: [SELF.id, JULES.id],
      muted: true,
      messages: [
        msg(mediaId, 'member', JULES.id, [
          {
            type: 'attachment',
            attachment: {
              id: 'vid1',
              name: 'demo.mp4',
              kind: 'video',
              url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
              posterUrl: 'https://picsum.photos/seed/video/640/360',
              durationMs: 5000,
            },
          },
        ], 40),
        msg(mediaId, 'member', SELF.id, [
          {
            type: 'attachment',
            attachment: {
              id: 'pdf1',
              name: 'spec.pdf',
              kind: 'pdf',
              sizeBytes: 240_000,
            },
          },
          { type: 'text', text: 'Spec attached — caption flow demo.' },
        ], 35, { delivery: 'sent' }),
        msg(mediaId, 'member', JULES.id, [
          {
            type: 'gallery',
            layout: 'carousel',
            items: Array.from({ length: 6 }, (_, i) => ({
              id: `c${i}`,
              src: `https://picsum.photos/seed/car${i}/500/500`,
              alt: `Shot ${i + 1}`,
            })),
          },
        ], 20),
      ],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
    {
      id: archivedId,
      surface: 'dm',
      kind: 'dm',
      title: GHOST.displayName,
      participantIds: [SELF.id, GHOST.id],
      archived: true,
      messages: [
        msg(archivedId, 'member', GHOST.id, [{ type: 'text', text: 'Old thread — participant unavailable.' }], 400),
      ],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
  ]

  // Wire a reply quote on the latest self message in dmId
  const mayaLast = conversations[0].messages.find((m) => m.senderId === MAYA.id && m.parts[0]?.type === 'text')
  const selfReply = conversations[0].messages.find((m) => m.senderId === SELF.id && m.parts[0]?.type === 'text' && m.createdAt)
  if (mayaLast && selfReply) {
    selfReply.replyToId = mayaLast.id
  }

  return {
    title: 'Direct messages',
    activeConversationId: dmId,
    conversations,
    participants: [SELF, MAYA, JULES, RIN, GHOST],
  }
}

export const DM_DIRECTORY: ChatParticipant[] = [SELF, MAYA, JULES, RIN]

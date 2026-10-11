import {
  Archive,
  ArchiveRestore,
  Bell,
  BellOff,
  Info,
  LogOut,
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  Trash2,
} from 'lucide-react'
import type { ChatConversation, ChatParticipant, ChatPresence } from '../../lib/chat/types'
import { getConversationMembers, getTypingLabel } from '../../lib/dmChat'
import type { CascadeMenuItem } from '../../lib/menus/cascadeMenu'
import { CascadeMenuButton } from '../CascadeMenuButton'
import { IconButton } from '../IconButton'
import { Tooltip } from '../Tooltip'
import { ChatAvatar, ChatAvatarStack } from '../chatParts/ChatAvatar'

type DmChatHeaderProps = {
  conversation: ChatConversation | null
  participants: readonly ChatParticipant[]
  infoOpen: boolean
  onToggleInfo: () => void
  onRename: (title: string) => void
  onPin: (pinned: boolean) => void
  onMute: (muted: boolean) => void
  onArchive: (archived: boolean) => void
  onLeave: () => void
  onDelete: () => void
}

const PRESENCE_LABEL: Record<ChatPresence, string> = {
  online: 'Online',
  away: 'Away',
  offline: 'Offline',
  unavailable: 'Unavailable',
}

export function DmChatHeader({
  conversation,
  participants,
  infoOpen,
  onToggleInfo,
  onRename,
  onPin,
  onMute,
  onArchive,
  onLeave,
  onDelete,
}: DmChatHeaderProps) {
  if (!conversation) {
    return (
      <header className="theme-dm-chat__header theme-dm-chat__header--empty">
        <p className="type-caption type-muted">Select a chat to start messaging</p>
      </header>
    )
  }

  const isGroup = conversation.kind === 'group'
  const members = getConversationMembers(conversation, participants)
  const other = members.find((p) => p.role !== 'self')
  const typingLabel = getTypingLabel(conversation.typingParticipantIds, participants)

  const subtitle =
    typingLabel ??
    (isGroup
      ? `${members.length} member${members.length === 1 ? '' : 's'}`
      : PRESENCE_LABEL[other?.presence ?? 'offline'])

  const menuItems: CascadeMenuItem[] = [
    { id: 'rename', label: isGroup ? 'Rename group' : 'Rename chat', icon: Pencil },
    { id: 'pin', label: conversation.pinned ? 'Unpin' : 'Pin', icon: conversation.pinned ? PinOff : Pin },
    { id: 'mute', label: conversation.muted ? 'Unmute' : 'Mute', icon: conversation.muted ? Bell : BellOff },
    {
      id: 'archive',
      label: conversation.archived ? 'Unarchive' : 'Archive',
      icon: conversation.archived ? ArchiveRestore : Archive,
    },
    { id: 'sep-1', label: '—', disabled: true },
    ...(isGroup ? [{ id: 'leave', label: 'Leave group', icon: LogOut }] : []),
    { id: 'delete', label: 'Delete chat', icon: Trash2 },
  ]

  return (
    <header className="theme-dm-chat__header">
      {isGroup ? (
        <ChatAvatarStack participants={members.filter((p) => p.role !== 'self')} size="md" />
      ) : (
        <ChatAvatar participant={other} size="md" />
      )}
      <div className="theme-dm-chat__header-meta">
        <span className="theme-dm-chat__header-title type-label">{conversation.title}</span>
        <span className="theme-dm-chat__header-subtitle type-caption type-muted">{subtitle}</span>
      </div>
      <div className="theme-dm-chat__header-actions">
        <Tooltip content={infoOpen ? 'Hide info' : 'Chat info'}>
          <IconButton
            icon={Info}
            aria-label="Toggle chat info"
            size="xs"
            variant="ghost"
            active={infoOpen}
            onClick={onToggleInfo}
          />
        </Tooltip>
        <CascadeMenuButton
          label="Chat menu"
          icon={MoreHorizontal}
          iconOnly
          size="xs"
          variant="ghost"
          menuSize="compact"
          scrollRail="hidden"
          triggerLabelAnim={false}
          items={menuItems}
          onSelect={(id) => {
            if (id === 'rename') {
              const next = window.prompt(isGroup ? 'Rename group' : 'Rename chat', conversation.title)
              if (next?.trim()) onRename(next.trim())
            } else if (id === 'pin') {
              onPin(!conversation.pinned)
            } else if (id === 'mute') {
              onMute(!conversation.muted)
            } else if (id === 'archive') {
              onArchive(!conversation.archived)
            } else if (id === 'leave') {
              onLeave()
            } else if (id === 'delete') {
              onDelete()
            }
          }}
        />
      </div>
    </header>
  )
}

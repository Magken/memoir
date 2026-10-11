import {
  Archive,
  ArchiveRestore,
  Bell,
  BellOff,
  MessageCirclePlus,
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Search,
  Trash2,
  Users,
} from 'lucide-react'
import { useState } from 'react'
import { DM_DIRECTORY } from '../../lib/chat/seedDm'
import { formatChatTime } from '../../lib/chat/time'
import type { ChatConversation, ChatParticipant } from '../../lib/chat/types'
import { getConversationMembers, getSelfParticipant } from '../../lib/dmChat'
import type { CascadeMenuItem } from '../../lib/menus/cascadeMenu'
import { CascadeMenuButton } from '../CascadeMenuButton'
import { Input } from '../Input'
import { ThemeScroll } from '../ThemeScroll'
import { ChatAvatar, ChatAvatarStack } from '../chatParts/ChatAvatar'

export type DmChatFilter = 'all' | 'unread' | 'groups'

const FILTERS: Array<{ id: DmChatFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'groups', label: 'Groups' },
]

type DmChatListProps = {
  conversations: readonly ChatConversation[]
  participants: readonly ChatParticipant[]
  activeId: string | null
  search: string
  onSearch: (value: string) => void
  filter: DmChatFilter
  onFilterChange: (filter: DmChatFilter) => void
  onSelect: (id: string) => void
  onNewDm: (participantId: string) => void
  onNewGroup: () => void
  onRename: (id: string, title: string) => void
  onPin: (id: string, pinned: boolean) => void
  onMute: (id: string, muted: boolean) => void
  onArchive: (id: string, archived: boolean) => void
  onDelete: (id: string) => void
  previewText: (conversation: ChatConversation) => string
}

function DmChatListRow({
  conversation,
  participants,
  active,
  selfId,
  onSelect,
  onRename,
  onPin,
  onMute,
  onArchive,
  onDelete,
  previewText,
}: {
  conversation: ChatConversation
  participants: readonly ChatParticipant[]
  active: boolean
  selfId: string
  onSelect: (id: string) => void
  onRename: (id: string, title: string) => void
  onPin: (id: string, pinned: boolean) => void
  onMute: (id: string, muted: boolean) => void
  onArchive: (id: string, archived: boolean) => void
  onDelete: (id: string) => void
  previewText: (conversation: ChatConversation) => string
}) {
  const isGroup = conversation.kind === 'group'
  const members = getConversationMembers(conversation, participants)
  const other = members.find((p) => p.id !== selfId)
  const lastMessage = conversation.messages[conversation.messages.length - 1]
  const timeLabel = formatChatTime(lastMessage?.createdAt ?? conversation.updatedAt)

  const items: CascadeMenuItem[] = [
    { id: 'rename', label: 'Rename', icon: Pencil },
    { id: 'pin', label: conversation.pinned ? 'Unpin' : 'Pin', icon: conversation.pinned ? PinOff : Pin },
    { id: 'mute', label: conversation.muted ? 'Unmute' : 'Mute', icon: conversation.muted ? Bell : BellOff },
    {
      id: 'archive',
      label: conversation.archived ? 'Unarchive' : 'Archive',
      icon: conversation.archived ? ArchiveRestore : Archive,
    },
    { id: 'sep-1', label: '—', disabled: true },
    { id: 'delete', label: 'Delete', icon: Trash2 },
  ]

  return (
    <div
      className={[
        'theme-dm-chat__list-item',
        active ? 'theme-dm-chat__list-item--active' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <button type="button" className="theme-dm-chat__list-btn" onClick={() => onSelect(conversation.id)}>
        {isGroup ? (
          <ChatAvatarStack participants={members.filter((p) => p.id !== selfId)} size="sm" />
        ) : (
          <ChatAvatar participant={other} size="sm" />
        )}
        <span className="theme-dm-chat__list-meta">
          <span className="theme-dm-chat__list-title-row">
            {conversation.pinned ? (
              <Pin size={11} aria-hidden className="theme-dm-chat__list-pin" />
            ) : null}
            <span className="theme-dm-chat__list-title type-caption">{conversation.title}</span>
            {conversation.muted ? (
              <BellOff size={11} aria-hidden className="theme-dm-chat__list-mute" />
            ) : null}
          </span>
          <span className="theme-dm-chat__list-preview type-caption type-muted">
            {previewText(conversation)}
          </span>
        </span>
        <span className="theme-dm-chat__list-aside">
          <span className="type-caption type-muted theme-dm-chat__list-time">{timeLabel}</span>
          {conversation.unreadCount ? (
            <span className="theme-dm-chat__list-unread">{conversation.unreadCount}</span>
          ) : null}
        </span>
      </button>
      <CascadeMenuButton
        className="theme-dm-chat__list-menu"
        label="Chat options"
        icon={MoreHorizontal}
        iconOnly
        size="xxs"
        variant="ghost"
        menuSize="compact"
        scrollRail="hidden"
        triggerLabelAnim={false}
        items={items}
        onSelect={(id) => {
          if (id === 'rename') {
            const next = window.prompt('Rename chat', conversation.title)
            if (next?.trim()) onRename(conversation.id, next.trim())
          } else if (id === 'pin') {
            onPin(conversation.id, !conversation.pinned)
          } else if (id === 'mute') {
            onMute(conversation.id, !conversation.muted)
          } else if (id === 'archive') {
            onArchive(conversation.id, !conversation.archived)
          } else if (id === 'delete') {
            onDelete(conversation.id)
          }
        }}
      />
    </div>
  )
}

export function DmChatList({
  conversations,
  participants,
  activeId,
  search,
  onSearch,
  filter,
  onFilterChange,
  onSelect,
  onNewDm,
  onNewGroup,
  onRename,
  onPin,
  onMute,
  onArchive,
  onDelete,
  previewText,
}: DmChatListProps) {
  const [archivedOpen, setArchivedOpen] = useState(false)
  const selfId = getSelfParticipant(participants)?.id ?? 'user_self'
  const active = conversations.filter((c) => !c.archived)
  const archived = conversations.filter((c) => c.archived)
  const filtered = active.filter((c) => {
    if (filter === 'unread') return (c.unreadCount ?? 0) > 0
    if (filter === 'groups') return c.kind === 'group'
    return true
  })

  const newChatItems: CascadeMenuItem[] = [
    {
      id: 'new-dm',
      label: 'New direct message',
      icon: MessageCirclePlus,
      children: DM_DIRECTORY.filter((p) => p.id !== selfId).map((p) => ({
        id: `dm:${p.id}`,
        label: p.displayName,
      })),
    },
    { id: 'new-group', label: 'New group', icon: Users },
  ]

  return (
    <aside className="theme-dm-chat__sidebar" aria-label="Chats">
      <div className="theme-dm-chat__sidebar-head">
        <span className="type-label">Chats</span>
        <CascadeMenuButton
          label="New chat"
          icon={Plus}
          iconOnly
          size="xs"
          variant="ghost"
          menuSize="compact"
          scrollRail="hidden"
          items={newChatItems}
          onSelect={(id) => {
            if (id === 'new-group') onNewGroup()
            else if (id.startsWith('dm:')) onNewDm(id.slice(3))
          }}
        />
      </div>
      <div className="theme-dm-chat__search">
        <Input
          size="sm"
          shadowless
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search chats"
          prefix={<Search size={14} aria-hidden />}
          aria-label="Search chats"
        />
      </div>
      <div className="theme-dm-chat__filters" role="group" aria-label="Filter chats">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={[
              'theme-dm-chat__filter-chip',
              filter === f.id ? 'theme-dm-chat__filter-chip--active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => onFilterChange(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>
      <ThemeScroll rail="nano" className="theme-dm-chat__list-scroll">
        <div className="theme-dm-chat__list">
          {filtered.length === 0 ? (
            <p className="type-caption type-muted theme-dm-chat__list-empty">No chats found</p>
          ) : (
            filtered.map((conv) => (
              <DmChatListRow
                key={conv.id}
                conversation={conv}
                participants={participants}
                active={conv.id === activeId}
                selfId={selfId}
                onSelect={onSelect}
                onRename={onRename}
                onPin={onPin}
                onMute={onMute}
                onArchive={onArchive}
                onDelete={onDelete}
                previewText={previewText}
              />
            ))
          )}
          {archived.length > 0 ? (
            <div>
              <button
                type="button"
                className="theme-dm-chat__list-section type-label type-muted"
                onClick={() => setArchivedOpen((v) => !v)}
              >
                Archived ({archived.length})
              </button>
              {archivedOpen
                ? archived.map((conv) => (
                    <DmChatListRow
                      key={conv.id}
                      conversation={conv}
                      participants={participants}
                      active={conv.id === activeId}
                      selfId={selfId}
                      onSelect={onSelect}
                      onRename={onRename}
                      onPin={onPin}
                      onMute={onMute}
                      onArchive={onArchive}
                      onDelete={onDelete}
                      previewText={previewText}
                    />
                  ))
                : null}
            </div>
          ) : null}
        </div>
      </ThemeScroll>
    </aside>
  )
}

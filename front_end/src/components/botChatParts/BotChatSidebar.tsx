import { Archive, ArchiveRestore, MoreHorizontal, Pencil, Pin, PinOff, Plus, Search, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { ChatConversation } from '../../lib/chat/types'
import type { CascadeMenuItem } from '../../lib/menus/cascadeMenu'
import { CascadeMenuButton } from '../CascadeMenuButton'
import { IconButton } from '../IconButton'
import { Input } from '../Input'
import { ThemeScroll } from '../ThemeScroll'
import { Tooltip } from '../Tooltip'

type BotChatSidebarProps = {
  conversations: readonly ChatConversation[]
  activeId: string | null
  search: string
  onSearch: (value: string) => void
  onSelect: (id: string) => void
  onNew: () => void
  onRename: (id: string, title: string) => void
  onPin: (id: string, pinned: boolean) => void
  onArchive: (id: string, archived: boolean) => void
  onDelete: (id: string) => void
}

function ConvRow({
  conversation,
  active,
  onSelect,
  onRename,
  onPin,
  onArchive,
  onDelete,
}: {
  conversation: ChatConversation
  active: boolean
  onSelect: (id: string) => void
  onRename: (id: string, title: string) => void
  onPin: (id: string, pinned: boolean) => void
  onArchive: (id: string, archived: boolean) => void
  onDelete: (id: string) => void
}) {
  const items: CascadeMenuItem[] = [
    { id: 'rename', label: 'Rename', icon: Pencil },
    { id: 'pin', label: conversation.pinned ? 'Unpin' : 'Pin', icon: conversation.pinned ? PinOff : Pin },
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
        'theme-bot-chat__conv-item',
        active ? 'theme-bot-chat__conv-item--active' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <button
        type="button"
        className="theme-bot-chat__conv-title-btn type-caption"
        onClick={() => onSelect(conversation.id)}
      >
        {conversation.pinned ? (
          <Pin size={12} aria-hidden className="theme-bot-chat__conv-pin" />
        ) : null}
        <span className="theme-bot-chat__conv-title">{conversation.title}</span>
        {conversation.unreadCount ? (
          <span className="theme-bot-chat__conv-unread">{conversation.unreadCount}</span>
        ) : null}
      </button>
      <CascadeMenuButton
        className="theme-bot-chat__conv-menu"
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

export function BotChatSidebar({
  conversations,
  activeId,
  search,
  onSearch,
  onSelect,
  onNew,
  onRename,
  onPin,
  onArchive,
  onDelete,
}: BotChatSidebarProps) {
  const [archivedOpen, setArchivedOpen] = useState(false)
  const active = conversations.filter((c) => !c.archived)
  const archived = conversations.filter((c) => c.archived)

  return (
    <aside className="theme-bot-chat__sidebar" aria-label="Conversations">
      <div className="theme-bot-chat__sidebar-head">
        <span className="type-label">Chats</span>
        <Tooltip content="New chat">
          <IconButton icon={Plus} aria-label="New chat" size="xs" variant="ghost" onClick={onNew} />
        </Tooltip>
      </div>
      <div className="theme-bot-chat__search">
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
      <ThemeScroll rail="nano" className="theme-bot-chat__conv-scroll">
        <div className="theme-bot-chat__conv-list">
          {active.length === 0 ? (
            <p className="type-caption type-muted theme-bot-chat__conv-empty">No chats found</p>
          ) : (
            active.map((conv) => (
              <ConvRow
                key={conv.id}
                conversation={conv}
                active={conv.id === activeId}
                onSelect={onSelect}
                onRename={onRename}
                onPin={onPin}
                onArchive={onArchive}
                onDelete={onDelete}
              />
            ))
          )}
          {archived.length > 0 ? (
            <div>
              <button
                type="button"
                className="theme-bot-chat__conv-section type-label type-muted"
                onClick={() => setArchivedOpen((v) => !v)}
              >
                Archived ({archived.length})
              </button>
              {archivedOpen
                ? archived.map((conv) => (
                    <ConvRow
                      key={conv.id}
                      conversation={conv}
                      active={conv.id === activeId}
                      onSelect={onSelect}
                      onRename={onRename}
                      onPin={onPin}
                      onArchive={onArchive}
                      onDelete={onDelete}
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

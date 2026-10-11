import { Crown, LogOut, MoreHorizontal, Shield, Trash2, UserPlus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { DM_DIRECTORY } from '../../lib/chat/seedDm'
import type { ChatConversation, ChatParticipant, ChatParticipantRole } from '../../lib/chat/types'
import { getConversationMembers } from '../../lib/dmChat'
import { CascadeMenuButton } from '../CascadeMenuButton'
import { IconButton } from '../IconButton'
import { Input } from '../Input'
import { Switch } from '../Switch'
import { ThemeScroll } from '../ThemeScroll'
import { Tooltip } from '../Tooltip'
import { ChatAvatar, ChatAvatarStack } from '../chatParts/ChatAvatar'

type DmChatInfoPanelProps = {
  conversation: ChatConversation | null
  participants: readonly ChatParticipant[]
  onClose: () => void
  onRenameGroup: (title: string) => void
  onMuteToggle: (muted: boolean) => void
  onAddMember: (participantId: string) => void
  onRemoveMember: (participantId: string) => void
  onSetRole: (participantId: string, role: ChatParticipantRole) => void
  onLeave: () => void
  onDelete: () => void
}

const ROLE_LABEL: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  self: 'You',
  bot: 'Bot',
}

type MediaThumb = { id: string; src: string; alt?: string }

function collectMedia(conversation: ChatConversation | null): MediaThumb[] {
  if (!conversation) return []
  const items: MediaThumb[] = []
  for (const message of conversation.messages) {
    for (const part of message.parts) {
      if (part.type === 'gallery') {
        for (const item of part.items) items.push({ id: item.id, src: item.src, alt: item.alt })
      } else if (part.type === 'attachment' && part.attachment.kind === 'image' && part.attachment.url) {
        items.push({ id: part.attachment.id, src: part.attachment.url, alt: part.attachment.name })
      }
    }
  }
  return items
}

export function DmChatInfoPanel({
  conversation,
  participants,
  onClose,
  onRenameGroup,
  onMuteToggle,
  onAddMember,
  onRemoveMember,
  onSetRole,
  onLeave,
  onDelete,
}: DmChatInfoPanelProps) {
  const [titleDraft, setTitleDraft] = useState(conversation?.title ?? '')

  useEffect(() => {
    setTitleDraft(conversation?.title ?? '')
  }, [conversation?.id, conversation?.title])

  if (!conversation) {
    return (
      <aside className="theme-dm-chat__info" aria-label="Chat info">
        <div className="theme-dm-chat__info-head">
          <span className="type-label">Chat info</span>
          <IconButton icon={X} aria-label="Close info" size="xs" variant="ghost" onClick={onClose} />
        </div>
      </aside>
    )
  }

  const isGroup = conversation.kind === 'group'
  const members = getConversationMembers(conversation, participants)
  const other = members.find((p) => p.role !== 'self')
  const media = collectMedia(conversation)
  const addableContacts = DM_DIRECTORY.filter(
    (p) => p.role !== 'self' && !conversation.participantIds.includes(p.id),
  )

  return (
    <aside className="theme-dm-chat__info" aria-label="Chat info">
      <div className="theme-dm-chat__info-head">
        <span className="type-label">{isGroup ? 'Group info' : 'Contact info'}</span>
        <IconButton icon={X} aria-label="Close info" size="xs" variant="ghost" onClick={onClose} />
      </div>
      <ThemeScroll rail="nano" className="theme-dm-chat__info-scroll">
        <div className="theme-dm-chat__info-body">
          <div className="theme-dm-chat__info-identity">
            {isGroup ? (
              <ChatAvatarStack participants={members.filter((p) => p.role !== 'self')} size="lg" max={4} />
            ) : (
              <ChatAvatar participant={other} size="lg" />
            )}
            {isGroup ? (
              <Input
                size="sm"
                shadowless
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={() => {
                  const next = titleDraft.trim()
                  if (next && next !== conversation.title) onRenameGroup(next)
                }}
                aria-label="Group name"
              />
            ) : (
              <div className="theme-dm-chat__info-name">
                <span className="type-label">{other?.displayName ?? conversation.title}</span>
                {other?.handle ? <span className="type-caption type-muted">{other.handle}</span> : null}
              </div>
            )}
          </div>

          <div className="theme-dm-chat__info-section">
            <span className="theme-dm-chat__info-section-label type-caption type-muted">Notifications</span>
            <div className="theme-dm-chat__info-row">
              <span className="type-body-sm">Mute chat</span>
              <Switch size="sm" checked={Boolean(conversation.muted)} onChange={onMuteToggle} />
            </div>
          </div>

          {isGroup ? (
            <div className="theme-dm-chat__info-section">
              <div className="theme-dm-chat__info-section-head">
                <span className="theme-dm-chat__info-section-label type-caption type-muted">
                  {members.length} members
                </span>
                {addableContacts.length > 0 ? (
                  <CascadeMenuButton
                    label="Add member"
                    icon={UserPlus}
                    iconOnly
                    size="xxs"
                    variant="ghost"
                    menuSize="compact"
                    scrollRail="hidden"
                    items={addableContacts.map((p) => ({ id: p.id, label: p.displayName }))}
                    onSelect={onAddMember}
                  />
                ) : null}
              </div>
              <ul className="theme-dm-chat__info-members">
                {members.map((member) => (
                  <li key={member.id} className="theme-dm-chat__info-member">
                    <ChatAvatar participant={member} size="sm" />
                    <span className="theme-dm-chat__info-member-name type-body-sm">
                      {member.role === 'self' ? 'You' : member.displayName}
                    </span>
                    <span className="type-caption type-muted">{ROLE_LABEL[member.role ?? 'member']}</span>
                    {member.role !== 'self' ? (
                      <CascadeMenuButton
                        className="theme-dm-chat__info-member-menu"
                        label="Member options"
                        icon={MoreHorizontal}
                        iconOnly
                        size="xxs"
                        variant="ghost"
                        menuSize="compact"
                        scrollRail="hidden"
                        items={[
                          {
                            id: 'toggle-admin',
                            label: member.role === 'admin' ? 'Remove as admin' : 'Make admin',
                            icon: member.role === 'admin' ? Shield : Crown,
                          },
                          { id: 'remove', label: 'Remove from group', icon: Trash2 },
                        ]}
                        onSelect={(id) => {
                          if (id === 'toggle-admin') {
                            onSetRole(member.id, member.role === 'admin' ? 'member' : 'admin')
                          } else if (id === 'remove') {
                            onRemoveMember(member.id)
                          }
                        }}
                      />
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {media.length > 0 ? (
            <div className="theme-dm-chat__info-section">
              <span className="theme-dm-chat__info-section-label type-caption type-muted">Shared media</span>
              <div className="theme-dm-chat__info-media">
                {media.slice(0, 9).map((item) => (
                  <img key={item.id} src={item.src} alt={item.alt ?? ''} className="theme-dm-chat__info-media-thumb" />
                ))}
              </div>
            </div>
          ) : null}

          <div className="theme-dm-chat__info-actions">
            {isGroup ? (
              <Tooltip content="Leave group">
                <IconButton icon={LogOut} aria-label="Leave group" size="sm" variant="ghost" onClick={onLeave} />
              </Tooltip>
            ) : null}
            <Tooltip content="Delete chat">
              <IconButton icon={Trash2} aria-label="Delete chat" size="sm" variant="ghost" onClick={onDelete} />
            </Tooltip>
          </div>
        </div>
      </ThemeScroll>
    </aside>
  )
}

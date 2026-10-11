import type { LucideIcon } from 'lucide-react'
import type { ChatParticipant } from '../../lib/chat/types'

type ChatAvatarProps = {
  participant?: ChatParticipant | null
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
  stacked?: boolean
  /** When set, render a Lucide icon instead of initials / image. */
  icon?: LucideIcon
}

const SIZE: Record<NonNullable<ChatAvatarProps['size']>, string> = {
  xs: 'theme-chat-avatar--xs',
  sm: 'theme-chat-avatar--sm',
  md: 'theme-chat-avatar--md',
  lg: 'theme-chat-avatar--lg',
}

export function ChatAvatar({
  participant,
  size = 'sm',
  className = '',
  stacked = false,
  icon: Icon,
}: ChatAvatarProps) {
  const label = participant?.displayName ?? (Icon ? 'Bot' : 'Unknown')
  const derived =
    label
      .split(/\s+/)
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?'
  const initials = participant?.initials ?? derived

  return (
    <span
      className={[
        'theme-chat-avatar',
        SIZE[size],
        stacked ? 'theme-chat-avatar--stacked' : '',
        Icon ? 'theme-chat-avatar--icon' : '',
        participant?.presence === 'unavailable' ? 'theme-chat-avatar--unavailable' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      title={label}
      aria-label={label}
    >
      {Icon ? (
        <Icon className="theme-chat-avatar__glyph" aria-hidden />
      ) : participant?.avatarUrl ? (
        <img src={participant.avatarUrl} alt="" className="theme-chat-avatar__img" />
      ) : (
        <span className="theme-chat-avatar__initials type-caption">{initials}</span>
      )}
      {!Icon && participant?.presence && participant.presence !== 'unavailable' ? (
        <span
          className={`theme-chat-avatar__presence theme-chat-avatar__presence--${participant.presence}`}
          aria-hidden
        />
      ) : null}
    </span>
  )
}

type ChatAvatarStackProps = {
  participants: readonly ChatParticipant[]
  max?: number
  size?: ChatAvatarProps['size']
  className?: string
}

export function ChatAvatarStack({
  participants,
  max = 3,
  size = 'sm',
  className = '',
}: ChatAvatarStackProps) {
  const shown = participants.slice(0, max)
  const overflow = Math.max(0, participants.length - shown.length)
  return (
    <span className={['theme-chat-avatar-stack', className].filter(Boolean).join(' ')}>
      {shown.map((p) => (
        <ChatAvatar key={p.id} participant={p} size={size} stacked />
      ))}
      {overflow > 0 ? (
        <span className={['theme-chat-avatar', SIZE[size ?? 'sm'], 'theme-chat-avatar--overflow'].join(' ')}>
          <span className="theme-chat-avatar__initials type-caption">+{overflow}</span>
        </span>
      ) : null}
    </span>
  )
}

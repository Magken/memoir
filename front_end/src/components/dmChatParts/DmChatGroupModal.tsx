import { Check } from 'lucide-react'
import { useState } from 'react'
import type { ChatParticipant } from '../../lib/chat/types'
import { Input } from '../Input'
import { Modal } from '../Modal'
import { ThemeScroll } from '../ThemeScroll'
import { ChatAvatar } from '../chatParts/ChatAvatar'

type DmChatGroupModalProps = {
  open: boolean
  contacts: readonly ChatParticipant[]
  onClose: () => void
  onCreate: (title: string, participantIds: string[]) => void
}

export function DmChatGroupModal({ open, contacts, onClose, onCreate }: DmChatGroupModalProps) {
  const [title, setTitle] = useState('')
  const [selected, setSelected] = useState<string[]>([])

  const canCreate = title.trim().length > 0 && selected.length > 0

  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]))
  }

  const reset = () => {
    setTitle('')
    setSelected([])
  }

  const handleCreate = () => {
    if (!canCreate) return
    onCreate(title.trim(), selected)
    reset()
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  if (!open) return null

  return (
    <Modal
      open={open}
      title="New group"
      onClose={handleClose}
      onConfirm={handleCreate}
      confirmLabel="Create group"
      confirmDisabled={!canCreate}
      size="sm"
    >
      <div className="theme-dm-chat__group-modal">
        <Input
          size="sm"
          shadowless
          label="Group name"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Design systems crew"
          aria-label="Group name"
        />
        <span className="theme-dm-chat__group-modal-label type-caption type-muted">
          Add members ({selected.length} selected)
        </span>
        <ThemeScroll rail="nano" className="theme-dm-chat__group-modal-scroll">
          <ul className="theme-dm-chat__group-modal-members">
            {contacts.map((contact) => {
              const checked = selected.includes(contact.id)
              return (
                <li key={contact.id}>
                  <button
                    type="button"
                    className={[
                      'theme-dm-chat__group-modal-member',
                      checked ? 'theme-dm-chat__group-modal-member--checked' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => toggle(contact.id)}
                    aria-pressed={checked}
                  >
                    <ChatAvatar participant={contact} size="sm" />
                    <span className="theme-dm-chat__group-modal-member-name type-body-sm">
                      {contact.displayName}
                    </span>
                    {checked ? <Check size={14} aria-hidden /> : null}
                  </button>
                </li>
              )
            })}
          </ul>
        </ThemeScroll>
      </div>
    </Modal>
  )
}

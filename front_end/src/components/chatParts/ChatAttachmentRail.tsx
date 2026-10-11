import { FileText, Film, ImageIcon, Paperclip, X } from 'lucide-react'
import { useState } from 'react'
import type { StagedAttachment } from '../../lib/chat/types'
import { formatBytes } from '../../lib/chat/utils'
import { IconButton } from '../IconButton'
import { Modal } from '../Modal'

type ChatAttachmentRailProps = {
  attachments: readonly StagedAttachment[]
  onRemove: (id: string) => void
  onOpen?: (id: string) => void
  className?: string
}

function kindIcon(kind: StagedAttachment['kind']) {
  if (kind === 'image') return ImageIcon
  if (kind === 'video') return Film
  return FileText
}

export function ChatAttachmentRail({
  attachments,
  onRemove,
  onOpen,
  className = '',
}: ChatAttachmentRailProps) {
  const [previewId, setPreviewId] = useState<string | null>(null)
  if (attachments.length === 0) return null
  const preview = attachments.find((a) => a.id === previewId) ?? null

  return (
    <>
      <ul
        className={['theme-chat-attachment-rail', className].filter(Boolean).join(' ')}
        aria-label="Staged attachments"
      >
        {attachments.map((att) => {
          const Icon = kindIcon(att.kind)
          return (
            <li key={att.id} className="theme-chat-attachment-rail__item">
              <button
                type="button"
                className="theme-chat-attachment-rail__preview"
                onClick={() => {
                  onOpen?.(att.id)
                  setPreviewId(att.id)
                }}
                aria-label={`Preview ${att.name}`}
              >
                {att.kind === 'image' && att.url && !att.error ? (
                  <img src={att.url} alt="" className="theme-chat-attachment-rail__img" />
                ) : att.kind === 'video' && (att.posterUrl || att.url) && !att.error ? (
                  <span className="theme-chat-attachment-rail__video">
                    <img
                      src={att.posterUrl || att.url}
                      alt=""
                      className="theme-chat-attachment-rail__img"
                    />
                    <Film size={14} aria-hidden className="theme-chat-attachment-rail__video-icon" />
                  </span>
                ) : (
                  <span className="theme-chat-attachment-rail__doc">
                    <Icon size={16} aria-hidden />
                    <span className="theme-chat-attachment-rail__ext type-caption">
                      {att.name.split('.').pop()?.slice(0, 4) ?? 'file'}
                    </span>
                  </span>
                )}
              </button>
              <div className="theme-chat-attachment-rail__meta">
                <span className="theme-chat-attachment-rail__name type-caption" title={att.name}>
                  {att.name}
                </span>
                <span className="theme-chat-attachment-rail__size type-caption type-muted">
                  {att.error ?? formatBytes(att.sizeBytes)}
                </span>
              </div>
              <IconButton
                type="button"
                size="xxs"
                variant="ghost"
                icon={X}
                aria-label={`Remove ${att.name}`}
                className="theme-chat-attachment-rail__remove"
                onClick={() => onRemove(att.id)}
              />
            </li>
          )
        })}
      </ul>
      <Modal
        open={Boolean(preview)}
        onClose={() => setPreviewId(null)}
        title={preview?.name ?? 'Attachment'}
        size="md"
      >
        {preview?.kind === 'image' && preview.url ? (
          <img src={preview.url} alt={preview.name} className="theme-chat-media-viewer__img" />
        ) : preview?.kind === 'video' && preview.url ? (
          <video
            src={preview.url}
            poster={preview.posterUrl}
            controls
            className="theme-chat-media-viewer__video"
          />
        ) : (
          <div className="theme-chat-media-viewer__doc">
            <Paperclip size={20} aria-hidden />
            <p className="type-body-sm">{preview?.name}</p>
            <p className="type-caption type-muted">{formatBytes(preview?.sizeBytes)}</p>
          </div>
        )}
      </Modal>
    </>
  )
}

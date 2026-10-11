import { Paperclip, SendHorizontal, Square, X } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import {
  canSendComposer,
  mergeComposerFiles,
  revokeStagedUrls,
  shouldSendOnEnter,
} from '../../lib/chat/composer'
import type { ComposerSendPayload, StagedAttachment } from '../../lib/chat/types'
import { IconButton } from '../IconButton'
import { MenuButton } from '../MenuButton'
import { ChatAttachmentRail } from './ChatAttachmentRail'

export type ChatComposerMode = 'bot' | 'dm'
export type ChatComposerStatus = 'idle' | 'sending' | 'streaming' | 'failed' | 'disabled'

type ChatComposerProps = {
  mode: ChatComposerMode
  status?: ChatComposerStatus
  draft?: string
  caption?: string
  showCaption?: boolean
  placeholder?: string
  hint?: string
  error?: string | null
  className?: string
  compact?: boolean
  onDraftChange?: (value: string) => void
  onCaptionChange?: (value: string) => void
  onSend: (payload: ComposerSendPayload) => void | Promise<void>
  onStop?: () => void
  onRetry?: () => void
  onAttachFiles?: (files: File[]) => void
  replyToLabel?: string | null
  onClearReply?: () => void
}

export function ChatComposer({
  mode,
  status = 'idle',
  draft: draftProp,
  caption: captionProp,
  showCaption = false,
  placeholder = mode === 'bot' ? 'Message Atlas…' : 'Type a message',
  hint,
  className = '',
  compact = false,
  onDraftChange,
  onCaptionChange,
  onSend,
  onStop,
  onRetry,
  onAttachFiles,
  replyToLabel,
  onClearReply,
}: ChatComposerProps) {
  const [draft, setDraft] = useState(draftProp ?? '')
  const [caption, setCaption] = useState(captionProp ?? '')
  const [attachments, setAttachments] = useState<StagedAttachment[]>([])
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (draftProp !== undefined) setDraft(draftProp)
  }, [draftProp])

  useEffect(() => {
    if (captionProp !== undefined) setCaption(captionProp)
  }, [captionProp])

  useEffect(() => {
    return () => revokeStagedUrls(attachments)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revoke only on unmount
  }, [])

  const resize = useCallback(() => {
    const el = textRef.current
    if (!el) return
    el.style.height = '0px'
    const next = Math.min(Math.max(el.scrollHeight, 40), 160)
    el.style.height = `${next}px`
  }, [])

  useEffect(() => {
    resize()
  }, [draft, resize])

  const updateDraft = (value: string) => {
    setDraft(value)
    onDraftChange?.(value)
  }

  const updateCaption = (value: string) => {
    setCaption(value)
    onCaptionChange?.(value)
  }

  const addFiles = (files: FileList | File[]) => {
    const list = Array.from(files)
    if (list.length === 0) return
    onAttachFiles?.(list)
    const result = mergeComposerFiles(attachments, list)
    setAttachments(result.attachments)
  }

  const removeAttachment = (id: string) => {
    setAttachments((prev) => {
      const target = prev.find((a) => a.id === id)
      if (target?.url?.startsWith('blob:')) URL.revokeObjectURL(target.url)
      return prev.filter((a) => a.id !== id)
    })
  }

  const busy = status === 'sending' || status === 'streaming'
  const disabled = status === 'disabled'
  const canSend = !disabled && !busy && canSendComposer(draft, attachments)

  const submit = async () => {
    if (!canSend) return
    const payload: ComposerSendPayload = {
      text: draft,
      attachments: [...attachments],
      caption: showCaption ? caption : undefined,
    }
    try {
      await onSend(payload)
      revokeStagedUrls(attachments)
      setAttachments([])
      updateDraft('')
      updateCaption('')
    } catch {
      /* Parent surfaces send failures as a thread error bubble. */
    }
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (shouldSendOnEnter(event)) {
      event.preventDefault()
      void submit()
    }
  }

  const onPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(event.clipboardData.files ?? [])
    if (files.length) {
      event.preventDefault()
      addFiles(files)
    }
  }

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragOver(false)
    if (event.dataTransfer.files?.length) addFiles(event.dataTransfer.files)
  }

  return (
    <div
      className={[
        'theme-chat-composer',
        compact ? 'theme-chat-composer--compact' : '',
        dragOver ? 'theme-chat-composer--drag' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      onDragEnter={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      {replyToLabel ? (
        <div className="theme-chat-composer__reply">
          <span className="type-caption type-muted">Replying to</span>
          <span className="type-caption">{replyToLabel}</span>
          <IconButton
            type="button"
            size="xxs"
            variant="ghost"
            icon={X}
            aria-label="Clear reply"
            onClick={onClearReply}
          />
        </div>
      ) : null}

      <ChatAttachmentRail attachments={attachments} onRemove={removeAttachment} />

      {showCaption && attachments.some((a) => a.kind === 'image' || a.kind === 'video') ? (
        <input
          className="theme-chat-composer__caption"
          value={caption}
          onChange={(e) => updateCaption(e.target.value)}
          placeholder="Add a caption"
          disabled={disabled || busy}
        />
      ) : null}

      <form
        className="theme-chat-composer__shell"
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          void submit()
        }}
      >
        <MenuButton
          variant="ghost"
          size="sm"
          iconOnly
          icon={Paperclip}
          aria-label="Attach"
          label="Attach"
          disabled={disabled || busy}
          items={[{ id: 'upload', label: 'Upload files', icon: Paperclip }]}
          onSelect={(id) => {
            if (id === 'upload') fileRef.current?.click()
          }}
        />
        <input
          ref={fileRef}
          type="file"
          className="sr-only"
          multiple
          accept="image/*,video/*,.pdf,.txt,.md,.json,.csv"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files)
            e.target.value = ''
          }}
        />
        <textarea
          ref={textRef}
          className="theme-chat-composer__input"
          value={draft}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          onChange={(e) => updateDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          aria-label="Message"
        />
        {status === 'streaming' && onStop ? (
          <IconButton
            type="button"
            size="sm"
            variant="action"
            icon={Square}
            aria-label="Stop generating"
            onClick={onStop}
          />
        ) : status === 'failed' && onRetry ? (
          <IconButton
            type="button"
            size="sm"
            variant="action"
            icon={SendHorizontal}
            aria-label="Retry send"
            onClick={onRetry}
          />
        ) : (
          <IconButton
            type="submit"
            size="sm"
            variant="action"
            icon={SendHorizontal}
            aria-label="Send message"
            disabled={!canSend}
          />
        )}
      </form>
      <div className="theme-chat-composer__hint" role="status">
        <span className="type-caption type-muted">
          {hint ?? (mode === 'bot' ? 'Enter to send · Shift+Enter for newline' : 'Enter to send')}
        </span>
      </div>
    </div>
  )
}

export function focusChatComposer(host?: HTMLElement | null) {
  const el = (host ?? document).querySelector('.theme-chat-composer__input')
  if (el instanceof HTMLTextAreaElement) el.focus()
}

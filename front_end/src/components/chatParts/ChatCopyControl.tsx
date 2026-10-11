import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { rememberSittingCopy, resolveCopySurface } from '../../lib/interviewRunApi/sittingPolicy'
import { IconButton } from '../IconButton'

type ChatCopyControlProps = {
  text: string
  className?: string
  label?: string
}

export function ChatCopyControl({ text, className = '', label = 'Copy code' }: ChatCopyControlProps) {
  const [copied, setCopied] = useState(false)
  return (
    <IconButton
      type="button"
      size="xs"
      variant="ghost"
      icon={copied ? Check : Copy}
      aria-label={copied ? 'Copied' : label}
      className={['theme-chat-copy', className].filter(Boolean).join(' ')}
      onClick={(e) => {
        e.stopPropagation()
        const surface = resolveCopySurface(e.currentTarget) ?? 'chat'
        rememberSittingCopy(text, surface)
        const done = () => {
          setCopied(true)
          window.setTimeout(() => setCopied(false), 1600)
        }
        if (navigator.clipboard?.writeText) {
          void navigator.clipboard.writeText(text).then(done).catch(() => {})
          return
        }
        done()
      }}
    />
  )
}

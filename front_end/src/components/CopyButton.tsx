import { Check, Copy } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ButtonSize, ButtonVariant } from '../lib/ui/buttonStyles'
import { Button } from './Button'
import { IconButton } from './IconButton'

type CopyButtonProps = {
  text: string
  /** When set, renders a labeled [Button] — otherwise icon-only [IconButton] */
  label?: string
  /** Shown briefly after copy — default `Copied` */
  copiedLabel?: string
  size?: ButtonSize
  variant?: ButtonVariant
  disabled?: boolean
  className?: string
  debug?: boolean
}

export function CopyButton({
  text,
  label,
  copiedLabel = 'Copied',
  size = 'md',
  variant = 'outline',
  disabled = false,
  className = '',
  debug = false,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setCopied(false), 2000)
      if (debug) console.debug('[CopyButton]', { copied: true })
    } catch (error) {
      if (debug) console.debug('[CopyButton]', { error })
    }
  }, [debug, text])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  if (label) {
    return (
      <Button
        icon={copied ? Check : Copy}
        size={size}
        variant={variant}
        disabled={disabled}
        className={className}
        labelAnim={false}
        onClick={() => void copy()}
      >
        {copied ? copiedLabel : label}
      </Button>
    )
  }

  return (
    <IconButton
      icon={copied ? Check : Copy}
      aria-label={copied ? copiedLabel : 'Copy to clipboard'}
      size={size}
      variant={variant}
      disabled={disabled}
      className={className}
      onClick={() => void copy()}
    />
  )
}

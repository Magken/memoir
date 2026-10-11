import type { ReactNode } from 'react'

type DocArticleParagraphProps = {
  variant?: 'body' | 'body-lg' | 'lead' | 'caption' | 'prose'
  dropCap?: boolean
  children: ReactNode
  className?: string
}

export function DocArticleParagraph({
  variant = 'body',
  dropCap = false,
  children,
  className = '',
}: DocArticleParagraphProps) {
  const variantClass =
    variant === 'lead'
      ? 'type-body-lg type-muted'
      : variant === 'body-lg'
        ? 'type-body-lg'
        : variant === 'prose'
          ? 'type-body'
          : variant === 'caption'
            ? 'type-caption type-faint'
            : 'type-body-sm'

  return (
    <p
      className={[
        'theme-doc-article__paragraph',
        variantClass,
        dropCap ? 'type-dropcap' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </p>
  )
}

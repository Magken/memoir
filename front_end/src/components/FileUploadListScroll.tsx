import type { ReactNode } from 'react'
import { Card } from './Card'

type FileUploadListScrollProps = {
  children: ReactNode
  /** Taller viewport for card grids */
  grid?: boolean
}

/** Caps row/card upload lists — card shell + nano scroll rail. */
export function FileUploadListScroll({ children, grid = false }: FileUploadListScrollProps) {
  return (
    <Card
      variant="flat"
      shadowVariant="none"
      scroll="nano"
      scrollClouds={false}
      className={[
        'theme-field__file-scroll-card',
        grid ? 'theme-field__file-scroll-card--grid' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </Card>
  )
}

import { useRef } from 'react'
import { useNeuroPageBg } from '../hooks/useNeuroPageBg'
import type { PageBgTextureId } from '../lib/pageBgTextures'
import { pageBgTextureClass } from '../lib/pageBgTextures'

export type PageBgDivVariant = 'solid' | 'grid' | 'checker' | 'texture' | 'neuro'

type PageBgDivProps = {
  variant?: PageBgDivVariant
  /** With `variant="texture"` — ref.background-types-1 */
  texture?: PageBgTextureId
  className?: string
}

const patternClass: Record<Exclude<PageBgDivVariant, 'texture' | 'neuro'>, string> = {
  solid: 'theme-page-bg-div--solid',
  grid: 'theme-page-bg--grid',
  checker: 'theme-page-bg--checker',
}

function NeuroPageBgLayer({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useNeuroPageBg(canvasRef)

  return (
    <div
      className={['theme-page-bg-div', 'theme-page-bg-div--neuro', className].filter(Boolean).join(' ')}
      aria-hidden
    >
      <canvas ref={canvasRef} className="theme-page-bg-neuro__canvas" />
    </div>
  )
}

/** Fixed viewport background layer — ref.background-types-1 · long pages. */
export function PageBgDiv({ variant = 'solid', texture = 'canson', className = '' }: PageBgDivProps) {
  if (variant === 'neuro') {
    return <NeuroPageBgLayer className={className} />
  }

  const layerClass =
    variant === 'texture' ? pageBgTextureClass(texture) : patternClass[variant]

  return (
    <div
      className={['theme-page-bg-div', layerClass, className].filter(Boolean).join(' ')}
      aria-hidden
    />
  )
}

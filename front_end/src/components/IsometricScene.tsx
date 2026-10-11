import { useRef, type ReactNode, type RefObject } from 'react'
import { IsometricSpreadSvg } from './IsometricSpreadSvg'
import { useIsometricScrub } from '../hooks/useIsometricScrub'
import {
  resolveIsometricEffect,
  isometricVariantUsesHorizontalSeam,
  type IsometricPivotSurface,
  type IsometricProp,
  type IsometricVariant,
} from '../lib/isometrics/isometricEffects'

export type {
  IsometricConfig,
  IsometricPivotSurface,
  IsometricProp,
  IsometricVariant,
} from '../lib/isometrics/isometricEffects'

type IsometricSceneProps = {
  lines?: readonly string[]
  children?: ReactNode
  isometric?: IsometricProp
  variant?: IsometricVariant
  /** Pivot seam — `sharp` (default) · `curved-wall` · extend for more types */
  pivotSurface?: IsometricPivotSurface
  mouseFollow?: boolean
  scrollFollow?: boolean
  strength?: number
  /** Spread scrub x around pivot (`tl`) — `1` ref · `0` = no group translate. */
  pivotTranslate?: number
  /** Text slide distance multiplier — `1` ref · higher = longer slide from rest. */
  labelTranslate?: number
  typeClass?: string
  scrollViewportRef?: RefObject<HTMLElement | null>
  scrollTrackRef?: RefObject<HTMLElement | null>
  className?: string
  showCoordinateCards?: boolean
  showPlaneBorders?: boolean
}

export function IsometricScene({
  lines,
  children,
  isometric = true,
  variant = 'spread',
  pivotSurface = 'sharp',
  mouseFollow,
  scrollFollow,
  strength,
  pivotTranslate,
  labelTranslate,
  typeClass = 'type-display',
  scrollViewportRef,
  scrollTrackRef,
  className = '',
  showCoordinateCards = false,
  showPlaneBorders = false,
}: IsometricSceneProps) {
  const sceneRef = useRef<HTMLDivElement>(null)
  const resolved = resolveIsometricEffect(isometric, {
    variant,
    pivotSurface,
    mouseFollow,
    scrollFollow,
    strength,
    pivotTranslate,
    labelTranslate,
  })

  useIsometricScrub(sceneRef, resolved, { scrollViewportRef, scrollTrackRef })

  const content =
    lines && lines.length > 0 ? (
      <div className="theme-isometric-stage">
        <IsometricSpreadSvg
          lines={lines}
          typeClass={typeClass}
          variant={variant}
          pivotSurface={resolved.pivotSurface}
          showCoordinateCards={showCoordinateCards}
          showPlaneBorders={showPlaneBorders}
        />
      </div>
    ) : (
      children
    )

  if (!resolved.enabled) {
    return <div className={className}>{content}</div>
  }

  return (
    <div
      ref={sceneRef}
      className={[
        'theme-isometric-scene',
        variant === 'static' || variant === 'static-x' ? 'theme-isometric-scene--static' : '',
        isometricVariantUsesHorizontalSeam(variant) ? 'theme-isometric-scene--seam-x' : '',
        pivotSurface !== 'sharp' ? `theme-isometric-scene--pivot-${pivotSurface}` : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      data-isometric-variant={variant}
      data-isometric-pivot-surface={pivotSurface}
      data-isometric-mouse={resolved.mouseFollow ? 'true' : 'false'}
      data-isometric-scroll={resolved.scrollFollow ? 'true' : 'false'}
    >
      {content}
    </div>
  )
}

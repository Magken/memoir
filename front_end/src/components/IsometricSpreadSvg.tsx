import { useId } from 'react'
import {
  ISOMETRIC_SPACE,
  isometricLineSlotClip,
  isometricLineY,
  isometricSeamY,
  isometricTypeFontSizeForVariant,
  isometricViewBoxString,
  type IsometricPivotSurface,
  type IsometricVariant,
  isometricVariantUsesHorizontalSeam,
} from '../lib/isometrics/isometricEffects'
import {
  IsometricPivotSurfaceGraphic,
  isometricMaskBottomY,
  isometricMaskRightX,
  isometricMaskSplitX,
  isometricMaskSplitY,
} from './IsometricPivotSurface'
import { IsometricCoordinateSvgOverlay } from './IsometricCoordinateOverlay'

type IsometricSpreadSvgProps = {
  lines: readonly string[]
  typeClass?: string
  variant?: IsometricVariant
  pivotSurface?: IsometricPivotSurface
  /** Registry landmark cards — compare with 3D debug viewer. */
  showCoordinateCards?: boolean
  /** Theme card outline on each spread half — transforms with the plane. */
  showPlaneBorders?: boolean
}

export function IsometricSpreadSvg({
  lines,
  typeClass = 'type-display',
  variant = 'spread',
  pivotSurface = 'sharp',
  showCoordinateCards = false,
  showPlaneBorders = false,
}: IsometricSpreadSvgProps) {
  const uid = useId().replace(/:/g, '')
  const horizontalSeam = isometricVariantUsesHorizontalSeam(variant)
  const { width, height } = ISOMETRIC_SPACE.viewBox
  const seamX = ISOMETRIC_SPACE.pivot.x
  const seamY = isometricSeamY()
  const halfWidth = seamX
  const halfHeight = seamY

  const maskTopId = `maskTop-${uid}`
  const maskBottomId = `maskBottom-${uid}`
  const maskLeftId = `maskLeft-${uid}`
  const maskRightId = `maskRight-${uid}`

  const splitLeft = isometricMaskSplitX(pivotSurface)
  const splitRight = isometricMaskRightX(pivotSurface)
  const splitTop = isometricMaskSplitY(pivotSurface)
  const splitBottom = isometricMaskBottomY(pivotSurface)

  const lineClipIds = lines.map((_, index) => `lineClip-${uid}-${index}`)

  const lineSlotOverlays =
    showPlaneBorders &&
    lines.map((_, index) => {
      const slot = isometricLineSlotClip(index, horizontalSeam)
      return (
        <rect
          key={`slot-${index}`}
          className="theme-isometric-line-slot"
          x={slot.x}
          y={slot.y}
          width={slot.width}
          height={slot.height}
        />
      )
    })

  const renderLine = (side: string, line: string, index: number) => (
    <g key={`${side}-${index}`} clipPath={`url(#${lineClipIds[index]})`}>
      <text y={isometricLineY(index, variant)} dominantBaseline="alphabetic">
        {line}
      </text>
    </g>
  )

  const typeFontSize = isometricTypeFontSizeForVariant(variant)

  const typeGroup = (
    <g
      className={['theme-isometric-type', typeClass].filter(Boolean).join(' ')}
      fontSize={typeFontSize}
    >
      {horizontalSeam ? (
        <>
          <g mask={`url(#${maskTopId})`} className="top theme-isometric-half--top">
            {showPlaneBorders ? (
              <rect
                className="theme-isometric-plane-card"
                x={0}
                y={0}
                width={width}
                height={halfHeight}
              />
            ) : null}
            {lineSlotOverlays}
            {lines.map((line, index) => renderLine('top', line, index))}
          </g>
          <g mask={`url(#${maskBottomId})`} className="bottom theme-isometric-half--bottom">
            {showPlaneBorders ? (
              <rect
                className="theme-isometric-plane-card theme-isometric-plane-card--bottom"
                x={0}
                y={seamY}
                width={width}
                height={height - seamY}
              />
            ) : null}
            {lineSlotOverlays}
            {lines.map((line, index) => renderLine('bottom', line, index))}
          </g>
        </>
      ) : (
        <>
          <g mask={`url(#${maskLeftId})`} className="left theme-isometric-half--left">
            {showPlaneBorders ? (
              <rect
                className="theme-isometric-plane-card"
                x={0}
                y={0}
                width={halfWidth}
                height={height}
              />
            ) : null}
            {lineSlotOverlays}
            {lines.map((line, index) => renderLine('left', line, index))}
          </g>
          <g mask={`url(#${maskRightId})`} className="right theme-isometric-half--right">
            {showPlaneBorders ? (
              <rect
                className="theme-isometric-plane-card theme-isometric-plane-card--right"
                x={seamX}
                y={0}
                width={width - seamX}
                height={height}
              />
            ) : null}
            {lineSlotOverlays}
            {lines.map((line, index) => renderLine('right', line, index))}
          </g>
        </>
      )}
    </g>
  )

  return (
    <svg
      className="theme-isometric-svg"
      viewBox={isometricViewBoxString()}
      preserveAspectRatio="xMidYMid meet"
      aria-label={lines.join(' ')}
      role="img"
    >
      <defs>
        {lines.map((_, index) => {
          const slot = isometricLineSlotClip(index, horizontalSeam)
          return (
            <clipPath key={lineClipIds[index]} id={lineClipIds[index]}>
              <rect x={slot.x} y={slot.y} width={slot.width} height={slot.height} />
            </clipPath>
          )
        })}
      </defs>
      {horizontalSeam ? (
        <>
          <mask id={maskTopId}>
            {splitTop !== null ? (
              <rect x="0" y="0" width={width} height={splitTop} fill="#fff" />
            ) : (
              <rect x="0" y="0" width={width} height={seamY} fill="#fff" />
            )}
          </mask>
          <mask id={maskBottomId}>
            {splitBottom !== null ? (
              <rect x="0" y={splitBottom} width={width} height={height - splitBottom} fill="#fff" />
            ) : (
              <rect x="0" y={seamY} width={width} height={height - seamY} fill="#fff" />
            )}
          </mask>
        </>
      ) : (
        <>
          <mask id={maskLeftId}>
            {splitLeft !== null ? (
              <rect x="0" y="0" width={splitLeft} height={height} fill="#fff" />
            ) : (
              <rect x="-50%" width="100%" height="100%" fill="#fff" />
            )}
          </mask>
          <mask id={maskRightId}>
            {splitRight !== null ? (
              <rect x={splitRight} y="0" width={width - splitRight} height={height} fill="#fff" />
            ) : (
              <rect x="50%" width="100%" height="100%" fill="#fff" />
            )}
          </mask>
        </>
      )}
      {typeGroup}
      {!horizontalSeam ? <IsometricPivotSurfaceGraphic uid={uid} surface={pivotSurface} /> : null}
      {showCoordinateCards ? <IsometricCoordinateSvgOverlay /> : null}
    </svg>
  )
}

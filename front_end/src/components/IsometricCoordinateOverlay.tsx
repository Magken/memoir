import { isometricFrameToSvg } from '../lib/isometrics/isometricSpace'
import { ISOMETRIC_SPACE } from '../lib/isometrics/isometricEffects'
import {
  formatIsometricCoord,
  isometricSpace3dLandmarks,
  type IsometricFramePoint,
  type IsometricSpaceLandmark,
} from '../lib/isometrics/isometricSpace3d'

const CARD_W = 148
const CARD_H = 40
const LINE_H = 11

const LABEL_OFFSET: Record<string, { dx: number; dy: number }> = {
  pivot: { dx: 14, dy: -CARD_H - 8 },
  'vb-tl': { dx: 10, dy: 10 },
  'vb-tr': { dx: -CARD_W - 10, dy: 10 },
  'vb-bl': { dx: 10, dy: -CARD_H - 10 },
  'vb-br': { dx: -CARD_W - 10, dy: -CARD_H - 10 },
  'seam-top': { dx: 12, dy: 8 },
  'seam-base': { dx: 12, dy: -CARD_H - 8 },
  'label-enter': { dx: 10, dy: -CARD_H - 6 },
  'label-rest': { dx: 10, dy: -CARD_H - 6 },
}

function svgPoint(landmark: IsometricSpaceLandmark): { x: number; y: number } {
  return isometricFrameToSvg(landmark.frame)
}

function labelOffset(id: string): { dx: number; dy: number } {
  return LABEL_OFFSET[id] ?? { dx: 10, dy: -CARD_H - 6 }
}

function CoordinateSvgCard({
  name,
  frame,
  dx,
  dy,
}: {
  name: string
  frame: IsometricFramePoint
  dx: number
  dy: number
}) {
  const svg = isometricFrameToSvg(frame)
  return (
    <g className="theme-isometric-coord-card" transform={`translate(${dx}, ${dy})`}>
      <rect
        className="theme-isometric-coord-card__bg"
        width={CARD_W}
        height={CARD_H}
        rx={5}
        ry={5}
      />
      <text className="theme-isometric-coord-card__title" x={7} y={12}>
        {name}
      </text>
      <text className="theme-isometric-coord-card__line" x={7} y={12 + LINE_H}>
        f ({formatIsometricCoord(frame.x, 0)}, {formatIsometricCoord(frame.y, 0)},{' '}
        {formatIsometricCoord(frame.z, 0)})
      </text>
      <text className="theme-isometric-coord-card__line" x={7} y={12 + LINE_H * 2}>
        svg ({formatIsometricCoord(svg.x, 0)}, {formatIsometricCoord(svg.y, 0)})
      </text>
    </g>
  )
}

/** SVG overlay — registry landmarks aligned to `ISOMETRIC_SPACE.frame`. */
export function IsometricCoordinateSvgOverlay() {
  const landmarks = isometricSpace3dLandmarks()
  const { viewBox, pivot, type } = ISOMETRIC_SPACE
  const vbW = viewBox.width
  const vbH = viewBox.height

  return (
    <g className="theme-isometric-coord-overlay" aria-hidden="true">
      <rect
        className="theme-isometric-coord-overlay__viewbox"
        x={viewBox.minX}
        y={viewBox.minY}
        width={vbW}
        height={vbH}
      />
      <line
        className="theme-isometric-coord-overlay__seam"
        x1={pivot.x}
        y1={viewBox.minY}
        x2={pivot.x}
        y2={viewBox.minY + vbH}
      />
      {type.lineYs.map((lineY) => (
        <line
          key={lineY}
          className="theme-isometric-coord-overlay__baseline"
          x1={viewBox.minX}
          y1={lineY}
          x2={viewBox.minX + vbW}
          y2={lineY}
        />
      ))}

      {landmarks.map((landmark) => {
        const { x, y } = svgPoint(landmark)
        const { dx, dy } = labelOffset(landmark.id)
        return (
          <g key={landmark.id} className="theme-isometric-coord-overlay__point">
            <circle className="theme-isometric-coord-overlay__dot" cx={x} cy={y} r={7} />
            <CoordinateSvgCard name={landmark.name} frame={landmark.frame} dx={dx} dy={dy} />
          </g>
        )
      })}
    </g>
  )
}

export function formatLandmarkCoords(landmark: IsometricSpaceLandmark): {
  frame: string
  svg: string
} {
  const svg = isometricFrameToSvg(landmark.frame)
  const { frame } = landmark
  return {
    frame: `(${formatIsometricCoord(frame.x, 0)}, ${formatIsometricCoord(frame.y, 0)}, ${formatIsometricCoord(frame.z, 0)})`,
    svg: `(${formatIsometricCoord(svg.x, 0)}, ${formatIsometricCoord(svg.y, 0)})`,
  }
}

/** HTML grid — same registry cards as the 3D graph below. */
export function IsometricCoordinateCardGrid({ className = '' }: { className?: string }) {
  const landmarks = isometricSpace3dLandmarks()

  return (
    <div
      className={['theme-isometric-coord-card-grid', className].filter(Boolean).join(' ')}
      aria-label="Isometric coordinate landmarks"
    >
      {landmarks.map((landmark) => {
        const coords = formatLandmarkCoords(landmark)
        return (
          <div key={landmark.id} className="theme-isometric-coord-card-grid__item">
            <p className="theme-isometric-coord-card-grid__name">{landmark.name}</p>
            <p className="theme-isometric-coord-card-grid__row">
              <span>frame</span>
              <code>{coords.frame}</code>
            </p>
            <p className="theme-isometric-coord-card-grid__row">
              <span>svg</span>
              <code>{coords.svg}</code>
            </p>
          </div>
        )
      })}
    </div>
  )
}

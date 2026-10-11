/**
 * CSS solids — anchor trees ported from shape3dBuilders.ts / ref.3d-shapes-1.
 * Zdog style: flat fills, no stroke, round shapes via discs, platonic via nested transforms.
 */

import { CSS_SHAPE3D_TAU } from '../../lib/shape3d/cssShape3dUnits'
import {
  CssShape3dAnchor,
  CssShape3dDomeHalf,
  CssShape3dFace,
  CssShape3dHemisphere,
} from './CssShape3dPrimitives'

const CYLINDER_SEGMENTS = 32
const CONE_SEGMENTS = 24

const TAU = CSS_SHAPE3D_TAU
const ROOT3 = Math.sqrt(3)
const PHI = (1 + Math.sqrt(5)) / 2

function HemispherePair({
  toneA,
  toneB,
  toneC,
  toneD,
}: {
  toneA: 'a' | 'b' | 'c' | 'd'
  toneB: 'a' | 'b' | 'c' | 'd'
  toneC: 'a' | 'b' | 'c' | 'd'
  toneD: 'a' | 'b' | 'c' | 'd'
}) {
  return (
    <>
      <CssShape3dAnchor tz={-1}>
        <CssShape3dHemisphere tone={toneB} backTone={toneC} pole="neg" />
      </CssShape3dAnchor>
      <CssShape3dAnchor tz={1} ry={180}>
        <CssShape3dHemisphere tone={toneA} backTone={toneD} pole="pos" />
      </CssShape3dAnchor>
    </>
  )
}

export function CssShape3dZdogHourglass() {
  return (
    <CssShape3dAnchor ty={-0.5} className="theme-css-shape3d__solid-root">
      <HemispherePair toneA="a" toneB="b" toneC="c" toneD="d" />
    </CssShape3dAnchor>
  )
}

export function CssShape3dZdogSphere() {
  return (
    <CssShape3dAnchor ty={-0.5} className="theme-css-shape3d__solid-root">
      <CssShape3dDomeHalf tone="c" pole="pos" />
      <CssShape3dAnchor ry={180}>
        <CssShape3dDomeHalf tone="a" pole="pos" />
      </CssShape3dAnchor>
    </CssShape3dAnchor>
  )
}

export function CssShape3dZdogCylinder() {
  return (
    <CssShape3dAnchor ty={-0.5} className="theme-css-shape3d__solid-root">
      <CssShape3dFace kind="disc" tone="d" radius={1} rx={90} tz={1} />
      <CssShape3dFace kind="disc" tone="b" radius={1} rx={-90} tz={-1} />
      {Array.from({ length: CYLINDER_SEGMENTS }, (_, index) => (
        <CssShape3dAnchor key={index} ry={(360 / CYLINDER_SEGMENTS) * index}>
          <div
            className="theme-css-shape3d__cylinder-panel theme-css-shape3d__cylinder-panel--tone-d"
            style={{ ['--cylinder-segments' as string]: String(CYLINDER_SEGMENTS) }}
          />
        </CssShape3dAnchor>
      ))}
    </CssShape3dAnchor>
  )
}

export function CssShape3dZdogCone() {
  return (
    <CssShape3dAnchor className="theme-css-shape3d__solid-root">
      <CssShape3dAnchor tz={1} ry={180}>
        <CssShape3dFace kind="disc" tone="b" radius={1} />
        {Array.from({ length: CONE_SEGMENTS }, (_, index) => (
          <CssShape3dAnchor key={index} ry={(360 / CONE_SEGMENTS) * index}>
            <div
              className="theme-css-shape3d__cone-panel theme-css-shape3d__cone-panel--tone-b"
              style={{ ['--cone-segments' as string]: String(CONE_SEGMENTS) }}
            />
          </CssShape3dAnchor>
        ))}
      </CssShape3dAnchor>
    </CssShape3dAnchor>
  )
}

export function CssShape3dZdogCube() {
  const faces: Array<{ tone: 'a' | 'b' | 'c' | 'd' | 'e'; ry: number; rx: number; tz: number }> = [
    { tone: 'd', ry: 0, rx: 0, tz: 1 },
    { tone: 'b', ry: 180, rx: 0, tz: 1 },
    { tone: 'c', ry: 90, rx: 0, tz: 1 },
    { tone: 'c', ry: -90, rx: 0, tz: 1 },
    { tone: 'e', ry: 0, rx: 90, tz: 1 },
    { tone: 'a', ry: 0, rx: -90, tz: 1 },
  ]
  return (
    <CssShape3dAnchor className="theme-css-shape3d__solid-root theme-css-shape3d__cube-root">
      {faces.map((face, index) => (
        <CssShape3dFace key={index} kind="quad" radius={1} {...face} />
      ))}
    </CssShape3dAnchor>
  )
}

export function CssShape3dZdogTetrahedron() {
  const radius = 0.5
  const inradius = Math.cos(TAU / 6) * radius
  const height = radius + inradius
  const tiltDeg = (Math.acos(1 / 3) * -1 + TAU / 4) * (180 / Math.PI)
  const faceColors: Array<'a' | 'c' | 'b' | 'd'> = ['a', 'd', 'b', 'c']

  return (
    <CssShape3dAnchor sx={2.5} sy={2.5} sz={2.5} className="theme-css-shape3d__solid-root">
      <CssShape3dFace kind="tri" tone={faceColors[0]} radius={radius} ty={height / 2} rx={-90} rz={-90} />
      {[0, 1, 2].map((index) => (
        <CssShape3dAnchor key={index} ry={(-TAU / 3) * index * (180 / Math.PI)}>
          <CssShape3dAnchor tz={inradius} ty={height / 2} rx={tiltDeg}>
            <CssShape3dFace kind="tri" tone={faceColors[index + 1]} radius={radius} ty={-inradius} />
          </CssShape3dAnchor>
        </CssShape3dAnchor>
      ))}
    </CssShape3dAnchor>
  )
}

export function CssShape3dZdogOctahedron() {
  const radius = (ROOT3 / 2) * (2 / 3)
  const height = radius * (3 / 2)
  const tilt = Math.asin(0.5 / height) * (180 / Math.PI)
  const tones: Array<'a' | 'b' | 'c' | 'd' | 'e'> = ['a', 'b', 'c', 'd', 'e']

  return (
    <CssShape3dAnchor ty={0.5} sx={1.75} sy={1.75} sz={1.75} className="theme-css-shape3d__solid-root">
      {([-1, 1] as const).flatMap((ySide) =>
        Array.from({ length: 4 }, (_, index) => {
          const tone = tones[index + (ySide > 0 ? 1 : 0)]
          return (
            <CssShape3dAnchor key={`${ySide}-${index}`} ry={(-TAU / 4) * (index + 1.5) * (180 / Math.PI)}>
              <CssShape3dAnchor tz={0.5} rx={tilt * ySide}>
                <CssShape3dFace
                  kind="tri"
                  tone={tone}
                  radius={radius}
                  ty={(-radius / 2) * ySide}
                  sy={ySide}
                />
              </CssShape3dAnchor>
            </CssShape3dAnchor>
          )
        }),
      )}
    </CssShape3dAnchor>
  )
}

export function CssShape3dZdogDodecahedron() {
  const midradius = (PHI * PHI) / 2
  const ringA: Array<'a' | 'b' | 'd' | 'c' | 'b'> = ['a', 'b', 'd', 'c', 'b']
  const ringB: Array<'e' | 'd' | 'b' | 'c' | 'd'> = ['e', 'd', 'b', 'c', 'd']
  const tilt = (TAU / 4 - Math.atan(2)) * (180 / Math.PI)

  return (
    <CssShape3dAnchor ty={0.5} sx={0.75} sy={0.75} sz={0.75} className="theme-css-shape3d__solid-root">
      <CssShape3dFace kind="pent" tone="e" radius={1} ty={-midradius} rx={90} />
      <CssShape3dFace kind="pent" tone="a" radius={1} ty={midradius} rx={-90} />
      {([-1, 1] as const).flatMap((ySide) =>
        Array.from({ length: 5 }, (_, index) => (
          <CssShape3dAnchor key={`${ySide}-${index}`} ry={((TAU / 5) * index * 180) / Math.PI}>
            <CssShape3dAnchor rx={((TAU / 4) * ySide * 180) / Math.PI - tilt * ySide}>
              <CssShape3dFace
                kind="pent"
                tone={ySide < 0 ? ringA[index] : ringB[index]}
                radius={1}
                tz={midradius}
                rz={180}
              />
            </CssShape3dAnchor>
          </CssShape3dAnchor>
        )),
      )}
    </CssShape3dAnchor>
  )
}

export function CssShape3dZdogIcosahedron() {
  const faceRadius = (ROOT3 / 2) * (2 / 3)
  const faceHeight = faceRadius * (3 / 2)
  const capApothem = 0.5 / Math.tan(TAU / 10)
  const capTilt = Math.asin(capApothem / faceHeight) * (180 / Math.PI)
  const capSagitta = 0.5 / Math.sin(TAU / 10) - capApothem
  const sideTilt = Math.asin(capSagitta / faceHeight) * (180 / Math.PI)
  const sideHeight = Math.sqrt(faceHeight * faceHeight - capSagitta * capSagitta)

  const capColorsLo: Array<'b' | 'd' | 'e' | 'd' | 'c'> = ['b', 'd', 'e', 'd', 'c']
  const capColorsHi: Array<'d' | 'b' | 'a' | 'b' | 'c'> = ['d', 'b', 'a', 'b', 'c']
  const sideColorsLo: Array<'b' | 'd' | 'e' | 'c' | 'b'> = ['b', 'd', 'e', 'c', 'b']
  const sideColorsHi: Array<'d' | 'b' | 'a' | 'c' | 'c'> = ['d', 'b', 'a', 'c', 'c']

  return (
    <CssShape3dAnchor ty={0.5} sx={1.2} sy={1.2} sz={1.2} className="theme-css-shape3d__solid-root">
      {([-1, 1] as const).flatMap((ySide) =>
        Array.from({ length: 5 }, (_, index) => {
          const isYPos = ySide > 0
          let capRotateX = -capTilt
          capRotateX += isYPos ? 180 : 0
          let sideRotateX = -sideTilt
          sideRotateX += isYPos ? 0 : 180
          const capTone = ySide < 0 ? capColorsLo[index] : capColorsHi[index]
          const sideTone = ySide < 0 ? sideColorsLo[index] : sideColorsHi[index]

          return (
            <CssShape3dAnchor
              key={`${ySide}-${index}`}
              ry={((TAU / 5) * -index * 180) / Math.PI}
              ty={(sideHeight / 2) * ySide}
            >
              <CssShape3dAnchor tz={capApothem * ySide} rx={capRotateX}>
                <CssShape3dFace kind="tri" tone={capTone} radius={faceRadius} ty={-faceRadius / 2} />
              </CssShape3dAnchor>
              <CssShape3dAnchor tz={capApothem * ySide} rx={sideRotateX}>
                <CssShape3dFace kind="tri" tone={sideTone} radius={faceRadius} ty={-faceRadius / 2} ry={180} />
              </CssShape3dAnchor>
            </CssShape3dAnchor>
          )
        }),
      )}
    </CssShape3dAnchor>
  )
}

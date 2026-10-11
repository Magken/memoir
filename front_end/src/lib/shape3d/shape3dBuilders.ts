import Zdog from 'zdog'
import type { Anchor, Illustration } from 'zdog'
import type { Shape3dPalette } from './shape3dPalette'
import { SHAPE3D_KINDS, type Shape3dKind } from './shape3dTypes'

const TAU = Zdog.TAU
const ROOT3 = Math.sqrt(3)
const ROOT5 = Math.sqrt(5)
const PHI = (1 + ROOT5) / 2

export type Shape3dSolid = Anchor

function buildHourglass(illo: Illustration, colors: Shape3dPalette, translate: { x: number; y: number }) {
  const hourglass = new Zdog.Anchor({ addTo: illo, translate: { x: translate.x, y: translate.y - 4 } })
  const hemi = new Zdog.Hemisphere({
    diameter: 2,
    translate: { z: -1 },
    addTo: hourglass,
    color: colors.secondary,
    backface: colors.tertiary,
    stroke: false,
  })
  hemi.copy({
    translate: { z: 1 },
    rotate: { y: TAU / 2 },
    color: colors.primary,
    backface: colors.quaternary,
  })
  return hourglass
}

function buildSphere(illo: Illustration, colors: Shape3dPalette, translate: { x: number; y: number }) {
  const sphere = new Zdog.Anchor({ addTo: illo, translate: { x: translate.x, y: translate.y - 4 } })
  const hemi = new Zdog.Hemisphere({
    diameter: 2,
    addTo: sphere,
    color: colors.tertiary,
    backface: colors.primary,
    stroke: false,
  })
  hemi.copy({ rotate: { y: TAU / 2 }, color: colors.primary, backface: colors.tertiary })
  return sphere
}

function buildCylinder(illo: Illustration, colors: Shape3dPalette, translate: { x: number; y: number }) {
  return new Zdog.Cylinder({
    diameter: 2,
    length: 2,
    addTo: illo,
    translate: { x: translate.x, y: translate.y - 4 },
    color: colors.quaternary,
    backface: colors.secondary,
    stroke: false,
  }) as unknown as Anchor
}

function buildCone(illo: Illustration, colors: Shape3dPalette, translate: { x: number; y: number }) {
  const cone = new Zdog.Anchor({ addTo: illo, translate: { x: translate.x, y: translate.y } })
  new Zdog.Cone({
    diameter: 2,
    length: 2,
    addTo: cone,
    translate: { z: 1 },
    rotate: { y: TAU / 2 },
    color: colors.secondary,
    backface: colors.quaternary,
    stroke: false,
  })
  return cone
}

function buildTetrahedron(illo: Illustration, colors: Shape3dPalette, translate: { x: number; y: number }) {
  const tetrahedron = new Zdog.Anchor({
    addTo: illo,
    translate: { x: translate.x, y: translate.y },
    scale: 2.5,
  })
  const radius = 0.5
  const inradius = Math.cos(TAU / 6) * radius
  const height = radius + inradius
  const triangle = new Zdog.Polygon({
    sides: 3,
    radius,
    addTo: tetrahedron,
    translate: { y: height / 2 },
    fill: true,
    stroke: false,
    color: colors.primary,
  })
  const faceColors = [colors.quaternary, colors.secondary, colors.tertiary]
  for (let i = 0; i < 3; i++) {
    const rotor1 = new Zdog.Anchor({ addTo: tetrahedron, rotate: { y: (TAU / 3) * -i } })
    const rotor2 = new Zdog.Anchor({
      addTo: rotor1,
      translate: { z: inradius, y: height / 2 },
      rotate: { x: Math.acos(1 / 3) * -1 + TAU / 4 },
    })
    triangle.copy({
      addTo: rotor2,
      translate: { y: -inradius },
      color: faceColors[i],
    })
  }
  triangle.rotate.set({ x: -TAU / 4, z: -TAU / 2 })
  return tetrahedron
}

function buildOctahedron(illo: Illustration, colors: Shape3dPalette, translate: { x: number; y: number }) {
  const octahedron = new Zdog.Anchor({
    addTo: illo,
    translate: { x: translate.x, y: translate.y + 4 },
    scale: 1.75,
  })
  const colorWheel = [colors.primary, colors.secondary, colors.tertiary, colors.quaternary, colors.highlight]
  const radius = (ROOT3 / 2) * (2 / 3)
  const height = radius * (3 / 2)
  const tilt = Math.asin(0.5 / height)
  ;[-1, 1].forEach((ySide) => {
    for (let i = 0; i < 4; i++) {
      const rotor = new Zdog.Anchor({
        addTo: octahedron,
        rotate: { y: (TAU / 4) * (i + 1.5) * -1 },
      })
      const anchor = new Zdog.Anchor({
        addTo: rotor,
        translate: { z: 0.5 },
        rotate: { x: tilt * ySide },
      })
      new Zdog.Polygon({
        sides: 3,
        radius,
        addTo: anchor,
        translate: { y: (-radius / 2) * ySide },
        scale: { y: ySide },
        stroke: false,
        fill: true,
        color: colorWheel[i + 0.5 + 0.5 * ySide],
        backface: false,
      })
    }
  })
  return octahedron
}

function buildCube(illo: Illustration, colors: Shape3dPalette, translate: { x: number; y: number }) {
  return new Zdog.Box({
    addTo: illo,
    width: 2,
    height: 2,
    depth: 2,
    translate: { x: translate.x, y: translate.y },
    topFace: colors.highlight,
    frontFace: colors.quaternary,
    leftFace: colors.tertiary,
    rightFace: colors.tertiary,
    rearFace: colors.secondary,
    bottomFace: colors.primary,
    stroke: false,
  }) as unknown as Anchor
}

function buildDodecahedron(illo: Illustration, colors: Shape3dPalette, translate: { x: number; y: number }) {
  const dodecahedron = new Zdog.Anchor({
    addTo: illo,
    translate: { x: translate.x, y: translate.y + 4 },
    scale: 0.75,
  })
  const midradius = (PHI * PHI) / 2
  const face = new Zdog.Polygon({
    sides: 5,
    radius: 1,
    addTo: dodecahedron,
    translate: { y: -midradius },
    rotate: { x: TAU / 4 },
    fill: true,
    stroke: false,
    color: colors.highlight,
  })
  face.copy({
    translate: { y: midradius },
    rotate: { x: -TAU / 4 },
    color: colors.primary,
  })
  ;[-1, 1].forEach((ySide) => {
    const colorWheel =
      ySide < 0
        ? [colors.primary, colors.secondary, colors.quaternary, colors.tertiary, colors.secondary]
        : [colors.highlight, colors.quaternary, colors.secondary, colors.tertiary, colors.quaternary]
    for (let i = 0; i < 5; i++) {
      const rotor1 = new Zdog.Anchor({ addTo: dodecahedron, rotate: { y: (TAU / 5) * i } })
      const rotor2 = new Zdog.Anchor({
        addTo: rotor1,
        rotate: { x: (TAU / 4) * ySide - Math.atan(2) },
      })
      face.copy({
        addTo: rotor2,
        translate: { z: midradius },
        rotate: { z: TAU / 2 },
        color: colorWheel[i],
      })
    }
  })
  return dodecahedron
}

function buildIcosahedron(illo: Illustration, colors: Shape3dPalette, translate: { x: number; y: number }) {
  const isocahedron = new Zdog.Anchor({
    addTo: illo,
    translate: { x: translate.x, y: translate.y + 4 },
    scale: 1.2,
  })
  const faceRadius = (ROOT3 / 2) * (2 / 3)
  const faceHeight = faceRadius * (3 / 2)
  const capApothem = 0.5 / Math.tan(TAU / 10)
  const capRadius = 0.5 / Math.sin(TAU / 10)
  const capTilt = Math.asin(capApothem / faceHeight)
  const capSagitta = capRadius - capApothem
  const sideTilt = Math.asin(capSagitta / faceHeight)
  const sideHeight = Math.sqrt(faceHeight * faceHeight - capSagitta * capSagitta)
  ;[-1, 1].forEach((ySide) => {
    const capColors =
      ySide < 0
        ? [colors.secondary, colors.quaternary, colors.highlight, colors.quaternary, colors.tertiary]
        : [colors.quaternary, colors.secondary, colors.primary, colors.secondary, colors.tertiary]
    const sideColors =
      ySide < 0
        ? [colors.secondary, colors.quaternary, colors.highlight, colors.tertiary, colors.secondary]
        : [colors.quaternary, colors.secondary, colors.primary, colors.tertiary, colors.tertiary]
    for (let i = 0; i < 5; i++) {
      const rotor = new Zdog.Anchor({
        addTo: isocahedron,
        rotate: { y: (TAU / 5) * -i },
        translate: { y: (sideHeight / 2) * ySide },
      })
      const isYPos = ySide > 0
      let capRotateX = -capTilt
      capRotateX += isYPos ? TAU / 2 : 0
      const capAnchor = new Zdog.Anchor({
        addTo: rotor,
        translate: { z: capApothem * ySide },
        rotate: { x: capRotateX },
      })
      const face = new Zdog.Polygon({
        sides: 3,
        radius: faceRadius,
        addTo: capAnchor,
        translate: { y: -faceRadius / 2 },
        stroke: false,
        fill: true,
        color: capColors[i],
      })
      let sideRotateX = -sideTilt
      sideRotateX += isYPos ? 0 : TAU / 2
      const sideAnchor = capAnchor.copy({ rotate: { x: sideRotateX } })
      face.copy({
        addTo: sideAnchor,
        translate: { y: -faceRadius / 2 },
        rotate: { y: TAU / 2 },
        color: sideColors[i],
      })
    }
  })
  return isocahedron
}

const GALLERY_LAYOUT: Record<Shape3dKind, { x: number; y: number }> = {
  hourglass: { x: 0, y: -4 },
  sphere: { x: -4, y: -4 },
  cylinder: { x: 4, y: -4 },
  cone: { x: -4, y: 0 },
  tetrahedron: { x: 0, y: 0 },
  octahedron: { x: -4, y: 4 },
  cube: { x: 4, y: 0 },
  dodecahedron: { x: 0, y: 4 },
  icosahedron: { x: 4, y: 4 },
}

const BUILDERS: Record<
  Shape3dKind,
  (illo: Illustration, colors: Shape3dPalette, translate: { x: number; y: number }) => Shape3dSolid
> = {
  hourglass: buildHourglass,
  sphere: buildSphere,
  cylinder: buildCylinder,
  cone: buildCone,
  tetrahedron: buildTetrahedron,
  octahedron: buildOctahedron,
  cube: buildCube,
  dodecahedron: buildDodecahedron,
  icosahedron: buildIcosahedron,
}

export function buildShape3dSolid(
  illo: Illustration,
  kind: Shape3dKind,
  colors: Shape3dPalette,
  mode: 'single' | 'gallery' = 'single',
): Shape3dSolid {
  const translate = mode === 'gallery' ? GALLERY_LAYOUT[kind] : { x: 0, y: 0 }
  return BUILDERS[kind](illo, colors, translate)
}

export function buildShape3dGallery(illo: Illustration, colors: Shape3dPalette): Shape3dSolid[] {
  return SHAPE3D_KINDS.map((kind) => buildShape3dSolid(illo, kind, colors, 'gallery'))
}

export const SHAPE3D_SCENE_SIZE = 96

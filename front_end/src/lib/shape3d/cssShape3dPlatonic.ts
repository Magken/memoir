export type CssShape3dFaceConfig = {
  x: number
  y: number
  z: number
  rx: number
  ry: number
  rz?: number
  tone: 'a' | 'b' | 'c' | 'd' | 'e' | 'f'
  shape: 'tri' | 'pent' | 'rect'
  width?: number
  height?: number
}

const PHI = (1 + Math.sqrt(5)) / 2

function normalize(x: number, y: number, z: number) {
  const len = Math.hypot(x, y, z) || 1
  return { x: x / len, y: y / len, z: z / len }
}

function faceFromNormal(
  nx: number,
  ny: number,
  nz: number,
  tone: CssShape3dFaceConfig['tone'],
  shape: CssShape3dFaceConfig['shape'],
  dist = 0.72,
): CssShape3dFaceConfig {
  const n = normalize(nx, ny, nz)
  const ry = (Math.atan2(n.x, n.z) * 180) / Math.PI
  const rx = (-Math.asin(Math.max(-1, Math.min(1, n.y))) * 180) / Math.PI
  return {
    x: n.x * dist,
    y: n.y * dist,
    z: n.z * dist,
    rx,
    ry,
    tone,
    shape,
    width: shape === 'pent' ? 0.62 : shape === 'tri' ? 0.72 : 0.85,
    height: shape === 'pent' ? 0.62 : shape === 'tri' ? 0.72 : 0.85,
  }
}

const TONE_CYCLE = ['a', 'b', 'c', 'd', 'e', 'f'] as const

function toneAt(index: number): CssShape3dFaceConfig['tone'] {
  return TONE_CYCLE[index % TONE_CYCLE.length]
}

/** Regular tetrahedron — 4 triangular faces. */
export function cssShape3dTetrahedronFaces(): CssShape3dFaceConfig[] {
  return [
    faceFromNormal(0, -1, 0, 'a', 'tri', 0.55),
    faceFromNormal(0.943, 0.334, 0, 'b', 'tri', 0.55),
    faceFromNormal(-0.471, 0.334, 0.816, 'c', 'tri', 0.55),
    faceFromNormal(-0.471, 0.334, -0.816, 'd', 'tri', 0.55),
  ]
}

/** Regular octahedron — 8 triangular faces. */
export function cssShape3dOctahedronFaces(): CssShape3dFaceConfig[] {
  const normals: Array<[number, number, number]> = [
    [1, 1, 1],
    [1, 1, -1],
    [1, -1, 1],
    [1, -1, -1],
    [-1, 1, 1],
    [-1, 1, -1],
    [-1, -1, 1],
    [-1, -1, -1],
  ]

  return normals.map(([x, y, z], index) => {
    const n = normalize(x, y, z)
    return faceFromNormal(n.x, n.y, n.z, toneAt(index), 'tri', 0.68)
  })
}

/** Regular icosahedron — 20 triangular faces (normalized vertex triples). */
export function cssShape3dIcosahedronFaces(): CssShape3dFaceConfig[] {
  const verts: Array<[number, number, number]> = [
    [0, 1, PHI],
    [0, -1, PHI],
    [0, 1, -PHI],
    [0, -1, -PHI],
    [1, PHI, 0],
    [-1, PHI, 0],
    [1, -PHI, 0],
    [-1, -PHI, 0],
    [PHI, 0, 1],
    [-PHI, 0, 1],
    [PHI, 0, -1],
    [-PHI, 0, -1],
  ].map(([x, y, z]) => {
    const n = normalize(x, y, z)
    return [n.x, n.y, n.z] as [number, number, number]
  })

  const faces: Array<[number, number, number]> = [
    [0, 8, 4],
    [0, 5, 9],
    [0, 4, 5],
    [0, 9, 8],
    [1, 6, 8],
    [1, 7, 6],
    [1, 9, 7],
    [1, 8, 9],
    [2, 4, 10],
    [2, 11, 5],
    [2, 10, 11],
    [2, 5, 4],
    [3, 10, 6],
    [3, 7, 11],
    [3, 6, 7],
    [3, 11, 10],
    [4, 8, 10],
    [5, 11, 9],
    [6, 10, 8],
    [7, 9, 11],
  ]

  return faces.map(([a, b, c], index) => {
    const va = verts[a]
    const vb = verts[b]
    const vc = verts[c]
    const nx = (va[1] - vb[1]) * (vc[2] - vb[2]) - (va[2] - vb[2]) * (vc[1] - vb[1])
    const ny = (va[2] - vb[2]) * (vc[0] - vb[0]) - (va[0] - vb[0]) * (vc[2] - vb[2])
    const nz = (va[0] - vb[0]) * (vc[1] - vb[1]) - (va[1] - vb[1]) * (vc[0] - vb[0])
    return faceFromNormal(nx, ny, nz, toneAt(index), 'tri', 0.78)
  })
}

/** Regular dodecahedron — 12 pentagonal faces (approximate normals). */
export function cssShape3dDodecahedronFaces(): CssShape3dFaceConfig[] {
  const normals: Array<[number, number, number]> = [
    [0, PHI, 1],
    [0, PHI, -1],
    [0, -PHI, 1],
    [0, -PHI, -1],
    [1, 0, PHI],
    [-1, 0, PHI],
    [1, 0, -PHI],
    [-1, 0, -PHI],
    [PHI, 1, 0],
    [-PHI, 1, 0],
    [PHI, -1, 0],
    [-PHI, -1, 0],
  ]

  return normals.map(([x, y, z], index) => {
    const n = normalize(x, y, z)
    return faceFromNormal(n.x, n.y, n.z, toneAt(index), 'pent', 0.82)
  })
}

export const CSS_SHAPE3D_CYLINDER_SEGMENTS = 14
export const CSS_SHAPE3D_CONE_SEGMENTS = 14

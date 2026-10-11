type CubieCoord = { x: -1 | 0 | 1; y: -1 | 0 | 1; z: -1 | 0 | 1 }

const AXES = [-1, 0, 1] as const

const CUBIES: CubieCoord[] = AXES.flatMap((x) =>
  AXES.flatMap((y) => AXES.map((z) => ({ x, y, z }))),
)

type CubieFace = 'front' | 'rear' | 'left' | 'right' | 'top' | 'bottom'

function cubieFaces({ x, y, z }: CubieCoord): CubieFace[] {
  const faces: CubieFace[] = []
  if (z === 1) faces.push('front')
  if (z === -1) faces.push('rear')
  if (x === 1) faces.push('right')
  if (x === -1) faces.push('left')
  if (y === 1) faces.push('top')
  if (y === -1) faces.push('bottom')
  return faces
}

function Cubie({ x, y, z }: CubieCoord) {
  const faces = cubieFaces({ x, y, z })
  if (faces.length === 0) return null

  return (
    <div
      className="theme-css-shape3d__cubie"
      style={{
        ['--cubie-x' as string]: String(x),
        ['--cubie-y' as string]: String(y),
        ['--cubie-z' as string]: String(z),
      }}
    >
      <div className="theme-css-shape3d__cubie-body">
        {faces.map((face) => (
          <div
            key={face}
            className={`theme-css-shape3d__cubie-face theme-css-shape3d__cubie-face--${face}`}
          />
        ))}
      </div>
    </div>
  )
}

export function CssShape3dRubiks() {
  return (
    <div className="theme-css-shape3d__rubiks" aria-hidden="true">
      {CUBIES.map((cubie) => (
        <Cubie key={`${cubie.x}${cubie.y}${cubie.z}`} {...cubie} />
      ))}
    </div>
  )
}

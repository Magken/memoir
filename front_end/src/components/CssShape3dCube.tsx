import { CssShape3dMenuCube } from './CssShape3dMenuCube'

const CUBE_FACE_TONES: Record<string, string> = {
  home: 'a',
  shop: 'b',
  misc: 'c',
  about: 'd',
  dribbble: 'e',
  social: 'f',
}

type CssShape3dCubeProps = {
  activeFace?: 'home' | 'shop' | 'misc' | 'about' | 'dribbble' | 'social'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

/** Theme-toned six-face cube — demo shell for [CssShape3dMenuCube](CssShape3dMenuCube.tsx). */
export function CssShape3dCube({
  activeFace = 'home',
  size = 'sm',
  className = '',
}: CssShape3dCubeProps) {
  return (
    <CssShape3dMenuCube activeFace={activeFace} mode="drag" size={size} className={className}>
      {(faceId) => (
        <div
          className={[
            'theme-css-shape3d__menu-cube-tone',
            `theme-css-shape3d__menu-cube-tone--${CUBE_FACE_TONES[faceId] ?? 'a'}`,
          ].join(' ')}
          aria-hidden
        />
      )}
    </CssShape3dMenuCube>
  )
}

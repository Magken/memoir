/** ref.3d-menu face order — side nth-child + body rotation modifiers. */

export const CSS_SHAPE3D_MENU_CUBE_REF_FACES = [
  'home',
  'about',
  'misc',
  'shop',
  'social',
  'dribbble',
] as const

export type CssShape3dMenuCubeRefFaceId = (typeof CSS_SHAPE3D_MENU_CUBE_REF_FACES)[number]

export type CssShape3dMenuCubeSize = 'sm' | 'md' | 'lg'

export const CSS_SHAPE3D_MENU_CUBE_FACE_OPTIONS = CSS_SHAPE3D_MENU_CUBE_REF_FACES.map((value) => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1),
}))

export function cssShape3dMenuCubeStageClass(size: CssShape3dMenuCubeSize = 'md'): string {
  return `theme-css-shape3d__menu-cube-stage theme-css-shape3d__menu-cube-stage--${size}`
}

/** ref.3d-menu face class — CSS transition when `mode="menu"`. */
export function cssShape3dMenuCubeBodyClass(faceId: string): string {
  return `theme-css-shape3d__menu-cube--face-${faceId}`
}

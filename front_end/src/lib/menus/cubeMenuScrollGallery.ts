import type { CssShape3dMenuCubeRefFaceId } from '../shape3d/cssShape3dMenuCube'

export type CubeMenuScrollGallerySection = {
  id: CssShape3dMenuCubeRefFaceId
  tag: string
  title: string
  body: string
}

/**
 * Section order = ref.image-carousel-12 stop order. Each section's `id` is the
 * cube face forward at that stop (top · front · right · back · left · bottom).
 */
export const CUBE_MENU_SCROLL_GALLERY_SECTIONS: readonly CubeMenuScrollGallerySection[] = [
  {
    id: 'home',
    tag: 'Home',
    title: 'Start here',
    body: 'Scroll to roll the cube — each scene scrubs the body between faces, just like the reference carousel.',
  },
  {
    id: 'about',
    tag: 'About',
    title: 'Who we are',
    body: 'The front face settles upright as you reach this scene; keep scrolling to turn the cube further.',
  },
  {
    id: 'shop',
    tag: 'Store',
    title: 'Pick a shelf',
    body: 'A quarter turn brings the store face forward — motion is eased between stops, not snapped.',
  },
  {
    id: 'misc',
    tag: 'Projects',
    title: 'Side quests',
    body: 'Half-way round the ring the cube shows projects; progress is smoothed so the spin stays fluid.',
  },
  {
    id: 'social',
    tag: 'Social',
    title: 'Say hello',
    body: 'Three-quarter turn lands on social — scrub up or down and the cube follows continuously.',
  },
  {
    id: 'dribbble',
    tag: 'Dribbble',
    title: 'Shots & invites',
    body: 'The final tilt drops to the bottom face. Click a dot or cube button to jump to any scene.',
  },
] as const

export function cubeMenuScrollGalleryProgress(index: number, count: number): number {
  if (count <= 1) return 0
  return index / (count - 1)
}

export type WebglScene = {
  id: string
  label: string
}

/** Product scenes — compositions of registered assets. Objects stay in `WEBGL_ASSETS`. */
export const WEBGL_SCENES: readonly WebglScene[] = [
  {
    id: 'landing',
    label: 'Landing',
  },
  {
    id: 'about',
    label: 'About',
  },
  {
    id: 'projects',
    label: 'Projects',
  },
  {
    id: 'footer',
    label: 'Footer',
  },
]

export function getWebglScene(id: string): WebglScene | undefined {
  return WEBGL_SCENES.find((scene) => scene.id === id)
}

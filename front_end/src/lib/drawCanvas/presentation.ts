import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import { parseExcalidrawScene } from '../docEditor/parseExcalidrawScene'

type ExcalidrawElement = ReturnType<ExcalidrawImperativeAPI['getSceneElements']>[number]

function sortFrames(a: { x: number; y: number }, b: { x: number; y: number }) {
  return a.y - b.y || a.x - b.x
}

export function listPresentationFrameIds(sceneJson: string): string[] {
  const scene = parseExcalidrawScene(sceneJson)
  if (!scene) return []
  return scene.elements
    .filter((el) => !el.isDeleted && el.type === 'frame')
    .sort(sortFrames)
    .map((el) => el.id)
}

export function listPresentationFrames(api: ExcalidrawImperativeAPI): ExcalidrawElement[] {
  return api
    .getSceneElements()
    .filter((el) => !el.isDeleted && el.type === 'frame')
    .sort(sortFrames)
}

export function focusPresentationFrame(
  api: ExcalidrawImperativeAPI,
  frame: ExcalidrawElement,
) {
  api.scrollToContent(frame, { fitToContent: true, animate: true })
  api.updateScene({
    appState: {
      selectedElementIds: { [frame.id]: true },
    },
  })
}

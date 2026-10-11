import { convertToExcalidrawElements } from '@excalidraw/excalidraw'
import { parseMermaidToExcalidraw } from '@excalidraw/mermaid-to-excalidraw'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'

export async function loadMermaidIntoDraw(
  api: ExcalidrawImperativeAPI,
  mermaidSyntax: string,
  _meta?: Record<string, unknown>,
) {
  const { elements, files } = await parseMermaidToExcalidraw(mermaidSyntax)
  const excalidrawElements = convertToExcalidrawElements(elements)
  api.updateScene({ elements: excalidrawElements })
  if (files) {
    api.addFiles(Object.values(files))
  }
}

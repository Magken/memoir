import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'

export type ParsedExcalidrawScene = {
  elements: readonly ExcalidrawElement[]
  appState?: Record<string, unknown>
  files?: Record<string, unknown>
}

export function parseExcalidrawScene(source: string): ParsedExcalidrawScene | null {
  const trimmed = source.trim()
  if (!trimmed) return null

  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>
    if (Array.isArray(parsed.elements)) {
      return {
        elements: parsed.elements as ExcalidrawElement[],
        appState: (parsed.appState as Record<string, unknown> | undefined) ?? undefined,
        files: (parsed.files as Record<string, unknown> | undefined) ?? undefined,
      }
    }
    return null
  } catch {
    return null
  }
}

import mermaid from 'mermaid'
import { isDarkPalette } from '../theme'

export type MermaidTheme = 'default' | 'dark'

let initializedTheme: MermaidTheme | null = null
let preloadPromise: Promise<void> | null = null

async function ensureMermaidReady(theme: MermaidTheme): Promise<void> {
  if (!preloadPromise) {
    preloadPromise = (async () => {
      initializeMermaid(theme)
      // Warm common diagram loaders so Vite serves pre-bundled chunks (flowchart, etc.).
      try {
        await mermaid.parse('flowchart LR\n  A --> B')
      } catch {
        // Ignore parse errors during preload — render path reports real failures.
      }
    })()
  } else if (initializedTheme !== theme) {
    initializeMermaid(theme)
  }
  await preloadPromise
}

export function initializeMermaid(theme: MermaidTheme) {
  if (initializedTheme === theme) return
  mermaid.initialize({
    startOnLoad: false,
    theme,
    logLevel: 'error',
    securityLevel: 'strict',
  })
  initializedTheme = theme
}

export type MermaidRenderResult =
  | { ok: true; svg: string; bindFunctions?: (element: Element) => void }
  | { ok: false; error: string }

export async function renderMermaidDiagram(
  id: string,
  source: string,
  theme: MermaidTheme,
): Promise<MermaidRenderResult> {
  const trimmed = source.trim()
  if (!trimmed) {
    return { ok: true, svg: '' }
  }

  await ensureMermaidReady(theme)

  try {
    await mermaid.parse(trimmed)
    const { svg, bindFunctions } = await mermaid.render(id, trimmed)
    return { ok: true, svg, bindFunctions }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Invalid diagram',
    }
  }
}

export function mermaidThemeFromPalette(paletteId: string): MermaidTheme {
  return isDarkPalette(paletteId) ? 'dark' : 'default'
}

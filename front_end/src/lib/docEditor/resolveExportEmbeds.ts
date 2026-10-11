import { exportToBlob } from '@excalidraw/excalidraw'
import type { BinaryFiles } from '@excalidraw/excalidraw/types'
import { $getRoot, $isElementNode, type LexicalEditor, type LexicalNode } from 'lexical'
import { renderMermaidDiagram } from '../mermaidRenderer/renderMermaid'
import { $isDiagramCodeNode } from './nodes/diagramCodeNode'
import { parseExcalidrawScene } from './parseExcalidrawScene'

export type ResolvedEmbed = {
  html: string
}

let exportEmbedSeq = 0

function walkNodes(node: LexicalNode, visit: (node: LexicalNode) => void): void {
  visit(node)
  if ($isElementNode(node)) {
    for (const child of node.getChildren()) {
      walkNodes(child, visit)
    }
  }
}

function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

async function mermaidSourceToFigureHtml(source: string, id: string): Promise<string> {
  const result = await renderMermaidDiagram(id, source, 'default')
  if (!result.ok || !result.svg.trim()) {
    return `<figure class="doc-export-diagram"><p class="doc-export-diagram__error">Diagram could not be rendered.</p></figure>`
  }
  const dataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(result.svg)}`
  return `<figure class="doc-export-diagram"><img src="${dataUri}" alt="Mermaid diagram" /></figure>`
}

async function excalidrawSourceToFigureHtml(source: string): Promise<string> {
  const scene = parseExcalidrawScene(source)
  if (!scene?.elements.length) {
    return `<figure class="doc-export-diagram"><p class="doc-export-diagram__error">Excalidraw scene could not be rendered.</p></figure>`
  }
  try {
    const blob = await exportToBlob({
      elements: scene.elements,
      appState: {
        ...(scene.appState ?? {}),
        exportBackground: true,
        exportScale: 1,
      },
      files: (scene.files ?? {}) as BinaryFiles,
      mimeType: 'image/png',
    })
    const dataUri = await blobToDataUri(blob)
    return `<figure class="doc-export-diagram"><img src="${dataUri}" alt="Excalidraw diagram" /></figure>`
  } catch {
    return `<figure class="doc-export-diagram"><p class="doc-export-diagram__error">Excalidraw scene could not be rendered.</p></figure>`
  }
}

export async function resolveExportEmbeds(editor: LexicalEditor): Promise<Map<string, ResolvedEmbed>> {
  const diagramJobs: Array<{ key: string; language: string; source: string }> = []

  editor.getEditorState().read(() => {
    walkNodes($getRoot(), (node) => {
      if (!$isDiagramCodeNode(node)) return
      diagramJobs.push({
        key: node.getKey(),
        language: node.getLanguage(),
        source: node.getSource(),
      })
    })
  })

  const resolved = new Map<string, ResolvedEmbed>()
  await Promise.all(
    diagramJobs.map(async (job, index) => {
      const seq = ++exportEmbedSeq
      const html =
        job.language === 'mermaid'
          ? await mermaidSourceToFigureHtml(job.source, `doc-export-mmd-${seq}-${index}`)
          : await excalidrawSourceToFigureHtml(job.source)
      resolved.set(job.key, { html })
    }),
  )

  return resolved
}

export function applyResolvedEmbedsToHtml(html: string, resolved: Map<string, ResolvedEmbed>): string {
  if (resolved.size === 0) return html

  const parser = new DOMParser()
  const doc = parser.parseFromString(`<div id="doc-export-wrap">${html}</div>`, 'text/html')
  const wrap = doc.getElementById('doc-export-wrap')
  if (!wrap) return html

  for (const [key, embed] of resolved) {
    const placeholder = wrap.querySelector(`[data-export-node-key="${key}"]`)
    if (!placeholder) continue
    const fragment = parser.parseFromString(embed.html, 'text/html').body
    const replacement = fragment.firstElementChild ?? fragment.firstChild
    if (replacement) {
      placeholder.replaceWith(replacement)
    }
  }

  return wrap.innerHTML
}

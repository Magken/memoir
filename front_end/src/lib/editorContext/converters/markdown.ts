import type { MarkdownEditorPayload } from '../types'

export function convertMarkdownToMarkdown(text: string): { payload: MarkdownEditorPayload; warnings?: string[] } {
  return { payload: { mode: 'markdown', markdown: text, latex: '' } }
}

export function extractMermaidFromMarkdown(markdown: string): string | null {
  const match = markdown.match(/```mermaid\s*([\s\S]*?)```/i)
  return match ? match[1].trim() : null
}

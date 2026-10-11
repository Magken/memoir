import { Children, type ReactNode } from 'react'
import { MermaidRendererEmbed } from '../../components/MermaidRenderer'

function mermaidSourceFromChildren(children: ReactNode): string {
  return Children.toArray(children)
    .map((child) => (typeof child === 'string' || typeof child === 'number' ? String(child) : ''))
    .join('')
    .replace(/\n$/, '')
}

type MarkdownMermaidBlockProps = {
  children: ReactNode
}

export function MarkdownMermaidBlock({ children }: MarkdownMermaidBlockProps) {
  const source = mermaidSourceFromChildren(children)
  if (!source.trim()) return null

  return (
    <figure className="theme-markdown-renderer__mermaid-block" aria-label="Mermaid diagram">
      <MermaidRendererEmbed
        source={source}
        className="theme-markdown-renderer__mermaid-canvas"
      />
    </figure>
  )
}

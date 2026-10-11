import { EquationBlock } from '../EquationBlock'
import { MarkdownPreview } from '../../lib/markdownRenderer/renderMarkdown'
import type { MarkdownSourceMode } from './MarkdownRendererToolbar'

type MarkdownRendererPreviewProps = {
  mode: MarkdownSourceMode
  source: string
}

export function MarkdownRendererPreview({ mode, source }: MarkdownRendererPreviewProps) {
  if (mode === 'latex') {
    return (
      <div className="theme-markdown-renderer__preview theme-markdown-renderer__preview--latex prose-measure">
        {source.trim() ? (
          <EquationBlock latex={source} bare />
        ) : (
          <p className="type-body-sm type-muted">Enter LaTeX to preview.</p>
        )}
      </div>
    )
  }

  if (!source.trim()) {
    return (
      <div className="theme-markdown-renderer__preview prose-measure">
        <p className="type-body-sm type-muted">Enter Markdown to preview.</p>
      </div>
    )
  }

  return <MarkdownPreview source={source} />
}

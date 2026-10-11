import { useRef } from 'react'
import { MarkdownRenderer, MarkdownRendererEmbed, type MarkdownRendererHandle } from '../MarkdownRenderer'
import { SEED_MARKDOWN } from '../../lib/markdownRenderer/seedContent'
import { EditorContextDemoBar } from '../editorContextParts/EditorContextDemoBar'
import { EditorFeatureTable } from './EditorFeatureTable'

export function MarkdownRendererShowcase() {
  const editorRef = useRef<MarkdownRendererHandle>(null)

  return (
    <div className="space-y-8">
      <p className="type-body-sm type-muted prose-measure">
        Split-pane Markdown and LaTeX preview on{' '}
        <code className="type-code">react-markdown</code>,{' '}
        <code className="type-code">remark-gfm</code>,{' '}
        <code className="type-code">remark-math</code>, and{' '}
        <code className="type-code">rehype-katex</code>. Toggle source from the toolbar; use{' '}
        <code className="type-code">MarkdownRendererEmbed</code> for chat blocks and page shells.
      </p>
      <EditorFeatureTable kind="markdown" />
      <EditorContextDemoBar targetKind="markdown" runtimeRef={editorRef} />
      <MarkdownRenderer ref={editorRef} initialTitle="Showcase document" />
      <div className="space-y-3">
        <p className="type-label">Embed preview only</p>
        <MarkdownRendererEmbed source={SEED_MARKDOWN} />
      </div>
    </div>
  )
}

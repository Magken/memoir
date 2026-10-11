import { useMemo, useRef } from 'react'
import { useRegisterCodeEditorSearchHost } from '../../lib/codeEditor/CodeEditorSearchHostContext'
import type { CodeEditorMarkdownSearchHost } from '../../lib/codeEditor/searchHotwire'
import { MarkdownPreview } from '../../lib/markdownRenderer/renderMarkdown'
import { ThemeScroll } from '../ThemeScroll'

type CodeEditorMarkdownPreviewProps = {
  fileId: string
  source: string
  active: boolean
}

export function CodeEditorMarkdownPreview({
  fileId,
  source,
  active,
}: CodeEditorMarkdownPreviewProps) {
  const previewRootRef = useRef<HTMLDivElement>(null)

  const searchHost = useMemo<CodeEditorMarkdownSearchHost>(
    () => ({
      kind: 'markdown',
      source,
      previewRootRef,
    }),
    [source],
  )

  useRegisterCodeEditorSearchHost(fileId, active, searchHost)

  return (
    <ThemeScroll rail="nano" className="theme-code-editor__markdown-preview-scroll">
      <div ref={previewRootRef}>
        <MarkdownPreview source={source} className="theme-code-editor__markdown-preview" />
      </div>
    </ThemeScroll>
  )
}

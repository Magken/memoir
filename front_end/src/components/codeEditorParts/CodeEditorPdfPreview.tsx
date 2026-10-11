import { useMemo, useState } from 'react'
import { pdfSourceFromWorkspaceFile } from '../../lib/codeEditor/pdfWorkspaceSource'
import type { CodeEditorPdfSearchHost } from '../../lib/codeEditor/searchHotwire'
import { useRegisterCodeEditorSearchHost } from '../../lib/codeEditor/CodeEditorSearchHostContext'
import type { CodeFile } from '../../lib/codeEditor/workspace'
import { PdfViewerHeadless } from '../PdfViewerHeadless'

type CodeEditorPdfPreviewProps = {
  file: CodeFile
  active: boolean
}

export function CodeEditorPdfPreview({ file, active }: CodeEditorPdfPreviewProps) {
  const src = useMemo(
    () => pdfSourceFromWorkspaceFile(file),
    [file.path, file.buffer],
  )
  const [searchSlice, setSearchSlice] = useState<Omit<CodeEditorPdfSearchHost, 'kind'> | null>(null)

  const searchHost = useMemo<CodeEditorPdfSearchHost | null>(() => {
    if (!searchSlice) return null
    return { kind: 'pdf', ...searchSlice }
  }, [searchSlice])

  useRegisterCodeEditorSearchHost(file.id, active, searchHost)

  if (!active) {
    return <div className="theme-code-editor__pdf-preview theme-code-editor__pdf-preview--idle" aria-hidden />
  }

  return (
    <PdfViewerHeadless
      src={src}
      className="theme-code-editor__pdf-preview"
      onSearchHostReady={setSearchSlice}
    />
  )
}

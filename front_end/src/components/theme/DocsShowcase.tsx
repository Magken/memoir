import { useState } from 'react'
import { DataUpload } from '../DataUpload'
import { DocPanel } from '../DocPanel'

const DOC_MAX_FILE_BYTES = 15 * 1024 * 1024

export function DocsShowcase() {
  const [files, setFiles] = useState<File[]>([])
  const activeFile = files[0]

  return (
    <div className="flex flex-col gap-8 min-w-0">
      <header className="max-w-3xl">
        <p className="type-overline mb-1">Data viz · Docs</p>
        <h2 className="type-h3 mb-2">PDF document viewer</h2>
        <p className="type-body-sm type-muted mb-0">
          Upload a PDF with <strong>DataUpload</strong>, then preview it in a fixed-size{' '}
          <strong>DocPanel</strong> — document title and metadata info above the toolbar, paginator
          and zoom controls, over a scrollable canvas stage.
        </p>
      </header>

      <section className="flex flex-col gap-4 min-w-0 max-w-2xl">
        <p className="type-overline mb-0">Upload</p>
        <DataUpload
          label="PDF document"
          accept="application/pdf,.pdf"
          maxFiles={1}
          maxFileSize={DOC_MAX_FILE_BYTES}
          preview="none"
          hint="One PDF · 15 MB max — drop or browse, then scroll the preview below."
          value={files}
          onValueChange={setFiles}
          validateOn="change"
        />
      </section>

      <section className="theme-docs-preview flex flex-col gap-3 min-w-0">
        <p className="type-overline mb-0">Preview</p>
        {activeFile ? (
          <DocPanel src={activeFile} height="xl" />
        ) : (
          <div className="theme-docs-empty" role="status">
            <p className="type-label mb-1">No document yet</p>
            <p className="type-caption type-muted mb-0">Upload a PDF above to open the viewer.</p>
          </div>
        )}
      </section>
    </div>
  )
}

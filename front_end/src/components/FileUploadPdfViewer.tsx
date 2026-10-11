import { formatFileSize, fileMediaKind } from '../lib/forms/fileUpload'
import type { FileEntryMotion } from '../hooks/useAnimatedFileEntries'
import { fileEntryMotionClass } from '../hooks/useAnimatedFileEntries'
import { FileUploadKindTag } from './FileUploadKindTag'
import { FileUploadRemoveButton } from './FileUploadRemoveButton'
import { PdfViewerHeadless } from './PdfViewerHeadless'

type FileUploadPdfViewerProps = {
  file: File
  disabled?: boolean
  motion?: FileEntryMotion
  onRemove: () => void
}

/**
 * DataUpload preview variant — view-only PDF reader + remove control.
 * Prefer over `FileUploadRow` embed thumbs when a real reader is needed.
 */
export function FileUploadPdfViewer({
  file,
  disabled = false,
  motion = 'idle',
  onRemove,
}: FileUploadPdfViewerProps) {
  const kind = fileMediaKind(file)

  return (
    <li
      className={[
        'theme-field__file-motion-wrap',
        'theme-field__file-pdf-viewer-wrap',
        fileEntryMotionClass(motion),
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="theme-field__file-motion-inner">
        <div className="theme-field__file-pdf-viewer">
          <div className="theme-field__file-pdf-viewer-bar">
            <span className="theme-field__file-pdf-viewer-meta">
              <span className="theme-field__file-name type-label" title={file.name}>
                {file.name}
              </span>
              <span className="theme-field__file-row-sub">
                <FileUploadKindTag file={file} kind={kind} />
                <span className="theme-field__file-row-size type-caption type-muted">
                  {formatFileSize(file.size)}
                </span>
              </span>
            </span>
            <FileUploadRemoveButton
              label={`Remove ${file.name}`}
              disabled={disabled}
              compact
              onClick={(event) => {
                event.stopPropagation()
                onRemove()
              }}
            />
          </div>
          <div className="theme-field__file-pdf-viewer-stage">
            <PdfViewerHeadless
              src={file}
              className="theme-field__file-pdf-viewer-reader"
            />
          </div>
        </div>
      </div>
    </li>
  )
}

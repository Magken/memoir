import { formatFileSize, fileMediaKind } from '../lib/forms/fileUpload'
import type { FileEntryMotion } from '../hooks/useAnimatedFileEntries'
import { fileEntryMotionClass } from '../hooks/useAnimatedFileEntries'
import { FileUploadKindTag } from './FileUploadKindTag'
import { FileUploadPreview } from './FileUploadPreview'
import { FileUploadRemoveButton } from './FileUploadRemoveButton'

type FileUploadCardProps = {
  file: File
  disabled?: boolean
  motion?: FileEntryMotion
  onRemove: () => void
}

export function FileUploadCard({
  file,
  disabled = false,
  motion = 'idle',
  onRemove,
}: FileUploadCardProps) {
  const kind = fileMediaKind(file)

  return (
    <li
      className={[
        'theme-field__file-motion-wrap',
        'theme-field__file-card-wrap',
        fileEntryMotionClass(motion),
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="theme-field__file-motion-inner">
        <article className="theme-field__file-card">
          <div className="theme-field__file-card-media">
            <FileUploadPreview
              file={file}
              tone="tile"
              className="theme-field__file-card-preview"
              mediaClassName="theme-field__file-card-preview-media"
              iconClassName="theme-field__file-card-preview-icon"
            />
            <FileUploadRemoveButton
              label={`Remove ${file.name}`}
              disabled={disabled}
              nano
              className="theme-field__file-card-remove"
              onClick={(event) => {
                event.stopPropagation()
                onRemove()
              }}
            />
          </div>
          <div className="theme-field__file-card-body">
            <span className="theme-field__file-card-name type-label" title={file.name}>
              {file.name}
            </span>
            <span className="theme-field__file-card-meta">
              <FileUploadKindTag file={file} kind={kind} />
              <span className="theme-field__file-card-size type-caption type-muted">
                {formatFileSize(file.size)}
              </span>
            </span>
          </div>
        </article>
      </div>
    </li>
  )
}

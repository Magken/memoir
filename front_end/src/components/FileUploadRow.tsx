import { formatFileSize, fileMediaKind } from '../lib/forms/fileUpload'
import type { FileEntryMotion } from '../hooks/useAnimatedFileEntries'
import { fileEntryMotionClass } from '../hooks/useAnimatedFileEntries'
import { FileUploadKindTag } from './FileUploadKindTag'
import { FileUploadPreview } from './FileUploadPreview'
import { FileUploadRemoveButton } from './FileUploadRemoveButton'

type FileUploadRowProps = {
  file: File
  disabled?: boolean
  motion?: FileEntryMotion
  onRemove: () => void
}

export function FileUploadRow({
  file,
  disabled = false,
  motion = 'idle',
  onRemove,
}: FileUploadRowProps) {
  const kind = fileMediaKind(file)

  return (
    <li className={['theme-field__file-motion-wrap', fileEntryMotionClass(motion)].filter(Boolean).join(' ')}>
      <div className="theme-field__file-motion-inner">
        <div className="theme-field__file-row">
          <FileUploadPreview file={file} />
          <span className="theme-field__file-row-meta">
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
          <span className="theme-field__file-row-actions">
            <FileUploadRemoveButton
              label={`Remove ${file.name}`}
              disabled={disabled}
              compact
              onClick={(event) => {
                event.stopPropagation()
                onRemove()
              }}
            />
          </span>
        </div>
      </div>
    </li>
  )
}

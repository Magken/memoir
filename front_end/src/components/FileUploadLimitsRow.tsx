import { Info } from 'lucide-react'
import { formatFileSize } from '../lib/forms/fileUpload'
import { Tag } from './Tag'
import { Tooltip } from './Tooltip'

type FileUploadLimitsRowProps = {
  accept?: string
  fileCount?: number
  maxFileSize?: number
  maxFiles?: number
  maxTotalSize?: number
}

function acceptTooltipLabel(accept: string): string {
  return accept
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' · ')
}

export function FileUploadLimitsRow({
  accept,
  fileCount = 0,
  maxFileSize,
  maxFiles,
  maxTotalSize,
}: FileUploadLimitsRowProps) {
  const hasLimits =
    Boolean(accept?.trim()) ||
    maxFileSize !== undefined ||
    maxFiles !== undefined ||
    maxTotalSize !== undefined

  if (!hasLimits) {
    return (
      <div className="theme-field__file-limits" role="note" aria-label="Upload limits">
        <Tag size="xs">Any file type</Tag>
      </div>
    )
  }

  return (
    <div className="theme-field__file-limits" role="note" aria-label="Upload limits">
      {accept?.trim() ? (
        <Tooltip
          trigger="hover"
          content={<span className="type-caption">{acceptTooltipLabel(accept)}</span>}
        >
          <Tag size="xs" className="theme-field__file-limit-info-tag">
            Accepted
            <Info className="theme-field__file-limit-info-icon" aria-hidden strokeWidth={2} />
          </Tag>
        </Tooltip>
      ) : (
        <Tag size="xs">Any file type</Tag>
      )}
      {maxFileSize !== undefined ? (
        <Tag size="xs">{formatFileSize(maxFileSize)} max</Tag>
      ) : null}
      {maxFiles !== undefined ? (
        <Tag size="xs">
          {fileCount}/{maxFiles} file{maxFiles === 1 ? '' : 's'}
        </Tag>
      ) : null}
      {maxTotalSize !== undefined ? (
        <Tag size="xs">{formatFileSize(maxTotalSize)} total</Tag>
      ) : null}
    </div>
  )
}

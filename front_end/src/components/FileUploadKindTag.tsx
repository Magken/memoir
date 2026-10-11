import { fileMediaKind, fileUploadKindLabel, type FileMediaKind } from '../lib/forms/fileUpload'
import { Tag } from './Tag'

type FileUploadKindTagProps = {
  file: File
  kind?: FileMediaKind
}

export function FileUploadKindTag({ file, kind = fileMediaKind(file) }: FileUploadKindTagProps) {
  return (
    <Tag size="xs" className="theme-field__file-kind-tag">
      {fileUploadKindLabel(kind, file)}
    </Tag>
  )
}

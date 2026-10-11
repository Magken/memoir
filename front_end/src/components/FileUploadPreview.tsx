import { File, FileText, FileVideo } from 'lucide-react'
import { useEffect, useState } from 'react'
import { fileMediaKind, readFileTextPreview, type FileMediaKind } from '../lib/forms/fileUpload'

export type FileUploadPreviewTone = 'row' | 'tile'

type FileUploadPreviewProps = {
  file: File
  tone?: FileUploadPreviewTone
  className?: string
  mediaClassName?: string
  iconClassName?: string
}

export function FileUploadPreview({
  file,
  tone = 'row',
  className = 'theme-field__file-row-preview',
  mediaClassName = 'theme-field__file-row-preview-media',
  iconClassName = 'theme-field__file-row-preview-icon',
}: FileUploadPreviewProps) {
  const kind = fileMediaKind(file)

  return (
    <span
      className={[
        className,
        tone === 'tile' ? 'theme-field__file-preview--tile' : '',
        kind === 'pdf' ? 'theme-field__file-preview--pdf' : '',
        kind === 'text' ? 'theme-field__file-preview--text' : '',
        kind === 'other' ? 'theme-field__file-preview--file' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <FilePreviewMedia
        file={file}
        kind={kind}
        mediaClassName={mediaClassName}
        iconClassName={iconClassName}
      />
    </span>
  )
}

function FilePreviewMedia({
  file,
  kind,
  mediaClassName,
  iconClassName,
}: {
  file: File
  kind: FileMediaKind
  mediaClassName: string
  iconClassName: string
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [textPreview, setTextPreview] = useState<string | null>(null)

  useEffect(() => {
    if (kind === 'image' || kind === 'video' || kind === 'pdf') {
      const url = URL.createObjectURL(file)
      setObjectUrl(url)
      return () => URL.revokeObjectURL(url)
    }
    return undefined
  }, [file, kind])

  useEffect(() => {
    if (kind !== 'text') {
      setTextPreview(null)
      return undefined
    }
    let cancelled = false
    readFileTextPreview(file)
      .then((snippet) => {
        if (!cancelled) setTextPreview(snippet.replace(/\s+/g, ' ').trim())
      })
      .catch(() => {
        if (!cancelled) setTextPreview(null)
      })
    return () => {
      cancelled = true
    }
  }, [file, kind])

  if (kind === 'image' && objectUrl) {
    return <img src={objectUrl} alt="" className={mediaClassName} />
  }

  if (kind === 'video' && objectUrl) {
    return (
      <video
        src={objectUrl}
        className={mediaClassName}
        muted
        playsInline
        preload="metadata"
        aria-hidden
      />
    )
  }

  if (kind === 'pdf' && objectUrl) {
    const src = `${objectUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`
    return (
      <span className="theme-field__file-preview-pdf" aria-hidden>
        <embed src={src} type="application/pdf" className={mediaClassName} tabIndex={-1} />
      </span>
    )
  }

  if (kind === 'text' && textPreview) {
    return (
      <span className="theme-field__file-preview-doc type-caption type-muted" aria-hidden>
        {textPreview}
      </span>
    )
  }

  const Icon = kind === 'pdf' ? FileText : kind === 'video' ? FileVideo : File
  return (
    <span className="theme-field__file-preview-icon-wrap" aria-hidden>
      <Icon className={iconClassName} strokeWidth={2} />
    </span>
  )
}

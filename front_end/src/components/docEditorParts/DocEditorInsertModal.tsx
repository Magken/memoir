import { useCallback, useEffect, useMemo, useState, type FC } from 'react'
import { DataUpload } from '../DataUpload'
import { Input } from '../Input'
import { Modal } from '../Modal'
import { VideoPlayerField } from '../VideoPlayerField'
import {
  insertGif,
  insertImage,
  insertVideoFile,
  insertYoutubeVideo,
} from '../../lib/docEditor/insertActions'
import { useDocEditorInsertModal } from '../../lib/docEditor/docEditorInsertModalContext'
import {
  normalizeDocEditorUrl,
  type DocEditorInsertModalKind,
} from '../../lib/docEditor/docEditorInsertModalTypes'

const MODAL_TITLES: Record<DocEditorInsertModalKind, string> = {
  image: 'Insert image',
  gif: 'Insert GIF',
  video: 'Insert video',
  youtube: 'Insert YouTube video',
}

const ACCEPT_LABELS: Partial<Record<DocEditorInsertModalKind, string>> = {
  image: 'Insert',
  gif: 'Insert',
  video: 'Insert',
  youtube: 'Insert',
}

type MediaInsertKind = 'image' | 'gif' | 'video'

function DocEditorInsertUrlPreview({ kind, url }: { kind: MediaInsertKind; url: string }) {
  const src = normalizeDocEditorUrl(url)
  if (!src.trim()) return null

  if (kind === 'video') {
    return (
      <div className="theme-doc-editor__insert-url-preview">
        <video
          className="theme-doc-editor__insert-url-preview-media"
          src={src}
          controls
          playsInline
          preload="metadata"
        >
          <track kind="captions" />
        </video>
      </div>
    )
  }

  return (
    <div className="theme-doc-editor__insert-url-preview">
      <img
        className="theme-doc-editor__insert-url-preview-media"
        src={src}
        alt={kind === 'gif' ? 'GIF preview' : 'Image preview'}
      />
    </div>
  )
}

function DocEditorMediaInsertFields({
  kind,
  files,
  onFilesChange,
  urlValue,
  onUrlChange,
}: {
  kind: MediaInsertKind
  files: File[]
  onFilesChange: (files: File[]) => void
  urlValue: string
  onUrlChange: (url: string) => void
}) {
  const uploadLabel =
    kind === 'image' ? 'Upload image' : kind === 'gif' ? 'Upload GIF' : 'Upload video'
  const urlLabel =
    kind === 'image' ? 'Or image URL' : kind === 'gif' ? 'Or GIF URL' : 'Or video URL'
  const accept = kind === 'gif' ? 'image/gif' : kind === 'video' ? 'video/*' : 'image/*'

  return (
    <div className="theme-doc-editor__insert-modal-stack">
      <DataUpload
        label={uploadLabel}
        accept={accept}
        layout="rows"
        preview="rows"
        maxFiles={1}
        size="sm"
        value={files}
        onValueChange={onFilesChange}
      />
      <Input
        label={urlLabel}
        placeholder="https://…"
        value={urlValue}
        size="sm"
        shadowless
        optional
        onChange={(event) => onUrlChange(event.target.value)}
      />
      {files.length === 0 && urlValue.trim() ? (
        <DocEditorInsertUrlPreview kind={kind} url={urlValue} />
      ) : null}
    </div>
  )
}

export const DocEditorInsertModal: FC = function DocEditorInsertModal() {
  const { request, closeInsertModal } = useDocEditorInsertModal()
  const [urlValue, setUrlValue] = useState('')
  const [files, setFiles] = useState<File[]>([])

  const kind = request?.kind ?? null
  const editor = request?.editor ?? null

  useEffect(() => {
    if (!request) return
    setUrlValue(request.defaultValue ?? '')
    setFiles([])
  }, [request])

  const canAccept = useMemo(() => {
    if (!kind) return false
    switch (kind) {
      case 'youtube':
        return urlValue.trim().length > 0
      case 'image':
      case 'gif':
      case 'video':
        return files.length > 0 || urlValue.trim().length > 0
      default:
        return false
    }
  }, [kind, urlValue, files.length])

  const handleAccept = useCallback(() => {
    if (!editor || !kind || !canAccept) return

    switch (kind) {
      case 'image': {
        if (files[0]) insertImage(editor, URL.createObjectURL(files[0]))
        else insertImage(editor, normalizeDocEditorUrl(urlValue))
        break
      }
      case 'gif': {
        if (files[0]) insertGif(editor, URL.createObjectURL(files[0]))
        else insertGif(editor, normalizeDocEditorUrl(urlValue))
        break
      }
      case 'video': {
        if (files[0]) insertVideoFile(editor, URL.createObjectURL(files[0]))
        else insertVideoFile(editor, normalizeDocEditorUrl(urlValue))
        break
      }
      case 'youtube':
        insertYoutubeVideo(editor, urlValue.trim())
        break
    }

    closeInsertModal()
  }, [editor, kind, canAccept, urlValue, files, closeInsertModal])

  const title = kind ? MODAL_TITLES[kind] : ''
  const acceptLabel = kind ? (ACCEPT_LABELS[kind] ?? 'Insert') : 'Insert'

  const body = (() => {
    switch (kind) {
      case 'youtube':
        return (
          <div className="theme-doc-editor__insert-modal-stack">
            <VideoPlayerField
              label="YouTube URL"
              hint="Watch, embed, or youtu.be links show a live preview below."
              placeholder="https://youtube.com/watch?v=…"
              value={urlValue}
              size="sm"
              onChange={setUrlValue}
            />
          </div>
        )
      case 'image':
        return (
          <DocEditorMediaInsertFields
            kind="image"
            files={files}
            onFilesChange={setFiles}
            urlValue={urlValue}
            onUrlChange={setUrlValue}
          />
        )
      case 'gif':
        return (
          <DocEditorMediaInsertFields
            kind="gif"
            files={files}
            onFilesChange={setFiles}
            urlValue={urlValue}
            onUrlChange={setUrlValue}
          />
        )
      case 'video':
        return (
          <DocEditorMediaInsertFields
            kind="video"
            files={files}
            onFilesChange={setFiles}
            urlValue={urlValue}
            onUrlChange={setUrlValue}
          />
        )
      default:
        return null
    }
  })()

  return (
    <Modal
      open={Boolean(request && kind)}
      title={title}
      size="md"
      placement="container"
      className="theme-doc-editor__insert-modal"
      onClose={closeInsertModal}
      onConfirm={handleAccept}
      confirmLabel={acceptLabel}
      confirmDisabled={!canAccept}
    >
      {body}
    </Modal>
  )
}

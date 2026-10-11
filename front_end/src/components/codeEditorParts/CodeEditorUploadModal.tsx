import { useEffect, useState } from 'react'
import {
  CODE_EDITOR_UPLOAD_ACCEPT,
  CODE_EDITOR_UPLOAD_LIMITS,
} from '../../lib/codeEditor/importWorkspaceFiles'
import { Combobox } from '../Combobox'
import type { SelectOption } from '../Select'
import { DataUpload } from '../DataUpload'
import { Modal } from '../Modal'

type CodeEditorUploadModalProps = {
  open: boolean
  defaultFolder: string | null
  folderOptions: readonly SelectOption[]
  busy?: boolean
  error?: string | null
  onClose: () => void
  onConfirm: (files: File[], folder: string) => void
}

export function CodeEditorUploadModal({
  open,
  defaultFolder,
  folderOptions,
  busy = false,
  error = null,
  onClose,
  onConfirm,
}: CodeEditorUploadModalProps) {
  const [files, setFiles] = useState<File[]>([])
  const [folder, setFolder] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setFiles([])
    setFolder(defaultFolder ?? '')
    setLocalError(null)
  }, [defaultFolder, open])

  const message = localError ?? error

  return (
    <Modal
      open={open}
      title="Upload files"
      onClose={onClose}
      placement="container"
      size="sm"
      confirmLabel={busy ? 'Uploading…' : 'Upload'}
      confirmDisabled={busy || files.length === 0}
      onConfirm={() => {
        if (files.length === 0) {
          setLocalError('Choose at least one file.')
          return
        }
        setLocalError(null)
        onConfirm(files, folder.trim())
      }}
    >
      <div className="theme-code-editor__upload-modal">
        <DataUpload
          className="theme-code-editor__upload-field"
          label="Files"
          accept={CODE_EDITOR_UPLOAD_ACCEPT}
          multiple
          preview="none"
          size="sm"
          value={files}
          onValueChange={(next) => {
            setFiles(next)
            setLocalError(null)
          }}
          maxFiles={CODE_EDITOR_UPLOAD_LIMITS.maxFiles}
          maxFileSize={CODE_EDITOR_UPLOAD_LIMITS.maxFileSize}
          maxTotalSize={CODE_EDITOR_UPLOAD_LIMITS.maxTotalSize}
          disabled={busy}
        />
        <Combobox
          label="Destination folder"
          placeholder="Workspace root"
          hint="Type to filter workspace folders."
          options={folderOptions}
          value={folder}
          size="sm"
          disabled={busy}
          onChange={(next) => {
            setFolder(next)
            setLocalError(null)
          }}
        />
        {message ? (
          <p className="theme-code-editor__path-error type-caption">{message}</p>
        ) : null}
      </div>
    </Modal>
  )
}

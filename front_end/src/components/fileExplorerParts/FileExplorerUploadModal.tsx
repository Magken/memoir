import { useEffect, useState } from 'react'
import { folderOptions } from '../../lib/fileExplorer'
import type { DriveEntry } from '../../lib/fileExplorer'
import { Combobox } from '../Combobox'
import { DataUpload } from '../DataUpload'
import { Modal } from '../Modal'

type FileExplorerUploadModalProps = {
  open: boolean
  entries: readonly DriveEntry[]
  defaultFolderId: string | null
  busy?: boolean
  error?: string | null
  onClose: () => void
  onConfirm: (files: File[], folderId: string | null) => void
}

export function FileExplorerUploadModal({
  open,
  entries,
  defaultFolderId,
  busy = false,
  error = null,
  onClose,
  onConfirm,
}: FileExplorerUploadModalProps) {
  const [files, setFiles] = useState<File[]>([])
  const [folder, setFolder] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const options = folderOptions(entries)

  useEffect(() => {
    if (!open) return
    setFiles([])
    setFolder(defaultFolderId ?? '')
    setLocalError(null)
  }, [defaultFolderId, open])

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
        onConfirm(files, folder.trim() ? folder : null)
      }}
    >
      <div className="theme-file-explorer__upload-body">
        <DataUpload
          label="Files"
          accept="*/*"
          multiple
          preview="none"
          size="sm"
          value={files}
          onValueChange={(next) => {
            setFiles(next)
            setLocalError(null)
          }}
          maxFiles={20}
          maxFileSize={8 * 1024 * 1024}
          maxTotalSize={32 * 1024 * 1024}
          disabled={busy}
        />
        <Combobox
          label="Destination folder"
          placeholder="My files (root)"
          hint="Type to filter folders."
          options={options}
          value={folder}
          size="sm"
          disabled={busy}
          onChange={(next) => {
            setFolder(next)
            setLocalError(null)
          }}
        />
        {message ? (
          <p className="theme-field__message theme-field__message--error type-caption" role="alert">
            {message}
          </p>
        ) : null}
      </div>
    </Modal>
  )
}

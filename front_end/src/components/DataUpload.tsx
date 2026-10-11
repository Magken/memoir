import { FileUp } from 'lucide-react'
import { useCallback, useId, useMemo, useRef, useState, type DragEvent, type ReactNode } from 'react'
import type { FieldSize, FieldVariant } from '../lib/forms/formControls'
import {
  fileLimitSummary,
  formatFileSize,
  mergeFilesWithinLimits,
  serializeFiles,
  fileMediaKind,
} from '../lib/forms/fileUpload'
import type { ValidateOn, ValidationRule } from '../lib/forms/formValidation'
import { validators } from '../lib/forms/formValidation'
import { useAnimatedFileEntries } from '../hooks/useAnimatedFileEntries'
import { useFormFieldValidation } from '../hooks/useFormFieldValidation'
import { Field } from './Field'
import { FileUploadCard } from './FileUploadCard'
import { FileUploadGallery } from './FileUploadGallery'
import { FileUploadLimitsRow } from './FileUploadLimitsRow'
import { FileUploadListScroll } from './FileUploadListScroll'
import { FileUploadKindTag } from './FileUploadKindTag'
import { FileUploadPdfViewer } from './FileUploadPdfViewer'
import { FileUploadRow } from './FileUploadRow'
import { FileUploadRemoveButton } from './FileUploadRemoveButton'

export type DataUploadLayout = 'rows' | 'cards' | 'gallery'
/** `pdf` — headless PdfViewer + remove (single-file PDF uploads). */
export type DataUploadPreview = 'rows' | 'none' | 'pdf'

type DataUploadProps = {
  label?: string
  hint?: string
  error?: string | readonly string[]
  success?: string
  warning?: string
  variant?: FieldVariant
  size?: FieldSize
  className?: string
  name?: string
  required?: boolean
  disabled?: boolean
  layout?: DataUploadLayout
  /** `rows` — thumbnail rows · `none` — compact name/size · `pdf` — view-only PdfViewer + remove */
  preview?: DataUploadPreview
  /**
   * When false, file lists expand in place (no capped `FileUploadListScroll`).
   * Use inside modal bodies that already scroll.
   */
  listScroll?: boolean
  multiple?: boolean
  accept?: string
  maxFiles?: number
  maxFileSize?: number
  maxTotalSize?: number
  value?: File[]
  defaultValue?: File[]
  onValueChange?: (files: File[]) => void
  rules?: readonly ValidationRule[]
  validateOn?: ValidateOn | readonly ValidateOn[]
  successMessage?: string
  showSuccessWhenValid?: boolean
  debug?: boolean
}

function limitRejectionMessage(
  reason: 'count' | 'size' | 'total' | 'accept' | undefined,
  limits: { maxFiles?: number; maxFileSize?: number; maxTotalSize?: number },
): string | undefined {
  switch (reason) {
    case 'accept':
      return 'One or more files are not an accepted type.'
    case 'size':
      return limits.maxFileSize !== undefined
        ? `Each file must be ${formatFileSize(limits.maxFileSize)} or smaller.`
        : 'A file exceeds the size limit.'
    case 'count':
      return limits.maxFiles !== undefined
        ? `You can upload at most ${limits.maxFiles} file${limits.maxFiles === 1 ? '' : 's'}.`
        : 'Too many files.'
    case 'total':
      return limits.maxTotalSize !== undefined
        ? `Total upload size must be ${formatFileSize(limits.maxTotalSize)} or less.`
        : 'Total upload size exceeded.'
    default:
      return undefined
  }
}

function buildLimitRules(limits: {
  maxFiles?: number
  maxFileSize?: number
  maxTotalSize?: number
}): ValidationRule[] {
  const rules: ValidationRule[] = []
  if (limits.maxFiles !== undefined) {
    rules.push(validators.maxItems(limits.maxFiles))
  }
  if (limits.maxFileSize !== undefined) {
    rules.push(validators.maxFileSize(limits.maxFileSize))
  }
  if (limits.maxTotalSize !== undefined) {
    rules.push(validators.maxTotalSize(limits.maxTotalSize))
  }
  return rules
}

export function DataUpload({
  label,
  hint,
  error: errorProp,
  success,
  warning,
  variant = 'flat',
  size = 'md',
  className = '',
  name,
  required,
  disabled = false,
  layout = 'rows',
  preview = 'rows',
  listScroll = true,
  multiple = false,
  accept,
  maxFiles,
  maxFileSize,
  maxTotalSize,
  value: valueProp,
  defaultValue = [],
  onValueChange,
  rules,
  validateOn = 'change',
  successMessage,
  showSuccessWhenValid,
  debug = false,
}: DataUploadProps) {
  const autoId = useId()
  const id = autoId.replace(/:/g, '')
  const inputRef = useRef<HTMLInputElement>(null)
  const [internalFiles, setInternalFiles] = useState<File[]>(defaultValue)
  const [dragging, setDragging] = useState(false)
  const [limitError, setLimitError] = useState<string | undefined>()
  const files = valueProp ?? internalFiles
  const animatedEntries = useAnimatedFileEntries(files)
  const serialized = serializeFiles(files)
  const atMaxFiles = maxFiles !== undefined && files.length >= maxFiles

  const mergedRules = useMemo(
    () => [...(rules ?? []), ...buildLimitRules({ maxFiles, maxFileSize, maxTotalSize })],
    [rules, maxFiles, maxFileSize, maxTotalSize],
  )

  const { error, success: resolvedSuccess, warning: resolvedWarning, onBlur, notifyChange } =
    useFormFieldValidation({
      value: serialized,
      rules: mergedRules,
      validateOn,
      error: limitError ?? errorProp,
      success,
      warning,
      successMessage,
      showSuccessWhenValid,
      debug,
    })

  const setFiles = useCallback(
    (next: File[]) => {
      if (valueProp === undefined) {
        setInternalFiles(next)
      }
      onValueChange?.(next)
    },
    [onValueChange, valueProp],
  )

  const mergeFiles = useCallback(
    (incoming: FileList | File[]) => {
      notifyChange()
      const list = Array.from(incoming)
      const { files: merged, rejected, reason } = mergeFilesWithinLimits(files, list, {
        multiple,
        maxFiles,
        maxFileSize,
        maxTotalSize,
        accept,
      })
      if (rejected.length > 0) {
        setLimitError(limitRejectionMessage(reason, { maxFiles, maxFileSize, maxTotalSize }))
      } else {
        setLimitError(undefined)
      }
      setFiles(merged)
    },
    [accept, files, maxFileSize, maxFiles, maxTotalSize, multiple, notifyChange, setFiles],
  )

  const removeFileAt = useCallback(
    (index: number) => {
      notifyChange()
      setLimitError(undefined)
      setFiles(files.filter((_, fileIndex) => fileIndex !== index))
    },
    [files, notifyChange, setFiles],
  )

  const removeFileById = useCallback(
    (entryId: string) => {
      const entry = animatedEntries.find((item) => item.id === entryId && item.motion !== 'leave')
      if (!entry) return
      const index = files.indexOf(entry.file)
      if (index >= 0) removeFileAt(index)
    },
    [animatedEntries, files, removeFileAt],
  )

  const openPicker = () => {
    if (disabled || atMaxFiles) return
    inputRef.current?.click()
  }

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    if (disabled || atMaxFiles || event.dataTransfer.files.length === 0) return
    mergeFiles(event.dataTransfer.files)
  }

  const limitSummary = fileLimitSummary(files, { maxTotalSize })

  const showCompactList = layout === 'rows' && preview === 'none' && files.length > 0
  const showPdfPreview = preview === 'pdf' && files.length > 0
  const showPreviewLayout = files.length > 0 && !showCompactList && !showPdfPreview

  if (debug) {
    console.debug('[DataUpload]', {
      layout,
      preview,
      listScroll,
      fileCount: files.length,
      multiple,
      accept,
      atMaxFiles,
    })
  }

  const wrapList = (child: ReactNode, grid = false) =>
    listScroll ? (
      <FileUploadListScroll grid={grid}>{child}</FileUploadListScroll>
    ) : (
      <div className="theme-field__file-list-expand">{child}</div>
    )

  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      success={resolvedSuccess}
      warning={resolvedWarning}
      required={required}
      variant={variant}
      size={size}
      htmlFor={id}
      className={className}
    >
      <input
        ref={inputRef}
        id={id}
        type="file"
        name={name}
        required={required && files.length === 0}
        disabled={disabled}
        multiple={multiple}
        accept={accept}
        className="theme-field__file-native"
        onChange={(event) => {
          if (event.target.files) {
            mergeFiles(event.target.files)
            event.target.value = ''
          }
        }}
        onBlur={onBlur}
      />
      <div
        className={[
          'theme-field__file-dropzone',
          dragging ? 'theme-field__file-dropzone--dragging' : '',
          disabled ? 'theme-field__file-dropzone--disabled' : '',
          atMaxFiles ? 'theme-field__file-dropzone--full' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onDragEnter={(event) => {
          event.preventDefault()
          if (!disabled && !atMaxFiles) setDragging(true)
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={openPicker}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            openPicker()
          }
        }}
        role="button"
        tabIndex={disabled || atMaxFiles ? -1 : 0}
        aria-disabled={disabled || atMaxFiles || undefined}
      >
        <FileUp className="theme-field__file-icon" aria-hidden strokeWidth={2} />
        <span className="theme-field__file-copy type-label">
          {atMaxFiles
            ? 'File limit reached'
            : multiple
              ? 'Drop files here or browse'
              : 'Drop a file here or browse'}
        </span>
      </div>
      <FileUploadLimitsRow
        accept={accept}
        fileCount={files.length}
        maxFileSize={maxFileSize}
        maxFiles={maxFiles}
        maxTotalSize={maxTotalSize}
      />
      {files.length > 0 ? (
        <hr className="theme-divider theme-field__file-limits-divider" aria-hidden />
      ) : null}
      {showCompactList
        ? wrapList(
            <ul className="theme-field__file-list" aria-label="Uploaded files">
              {animatedEntries.map((entry) => (
                <li
                  key={entry.id}
                  className={[
                    'theme-field__file-motion-wrap',
                    entry.motion === 'enter' ? 'theme-field__file-motion-wrap--enter' : '',
                    entry.motion === 'leave' ? 'theme-field__file-motion-wrap--leave' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <div className="theme-field__file-motion-inner">
                    <div className="theme-field__file-item">
                      <span className="theme-field__file-item-meta">
                        <span className="theme-field__file-name type-label" title={entry.file.name}>
                          {entry.file.name}
                        </span>
                        <span className="theme-field__file-row-sub">
                          <FileUploadKindTag file={entry.file} kind={fileMediaKind(entry.file)} />
                          <span className="theme-field__file-row-size type-caption type-muted">
                            {formatFileSize(entry.file.size)}
                          </span>
                        </span>
                      </span>
                      <FileUploadRemoveButton
                        label={`Remove ${entry.file.name}`}
                        disabled={disabled}
                        nano
                        onClick={(event) => {
                          event.stopPropagation()
                          const fileIndex = files.indexOf(entry.file)
                          if (fileIndex >= 0) removeFileAt(fileIndex)
                        }}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>,
          )
        : null}
      {showPdfPreview
        ? wrapList(
            <ul className="theme-field__file-pdf-list" aria-label="Uploaded PDF">
              {animatedEntries.map((entry) => (
                <FileUploadPdfViewer
                  key={entry.id}
                  file={entry.file}
                  motion={entry.motion}
                  disabled={disabled}
                  onRemove={() => {
                    const fileIndex = files.indexOf(entry.file)
                    if (fileIndex >= 0) removeFileAt(fileIndex)
                  }}
                />
              ))}
            </ul>,
          )
        : null}
      {showPreviewLayout && layout === 'rows'
        ? wrapList(
            <ul className="theme-field__file-rows" aria-label="Uploaded files">
              {animatedEntries.map((entry) => (
                <FileUploadRow
                  key={entry.id}
                  file={entry.file}
                  motion={entry.motion}
                  disabled={disabled}
                  onRemove={() => {
                    const fileIndex = files.indexOf(entry.file)
                    if (fileIndex >= 0) removeFileAt(fileIndex)
                  }}
                />
              ))}
            </ul>,
          )
        : null}
      {showPreviewLayout && layout === 'cards'
        ? wrapList(
            <ul className="theme-field__file-cards" aria-label="Uploaded files">
              {animatedEntries.map((entry) => (
                <FileUploadCard
                  key={entry.id}
                  file={entry.file}
                  motion={entry.motion}
                  disabled={disabled}
                  onRemove={() => {
                    const fileIndex = files.indexOf(entry.file)
                    if (fileIndex >= 0) removeFileAt(fileIndex)
                  }}
                />
              ))}
            </ul>,
            true,
          )
        : null}
      {showPreviewLayout && layout === 'gallery' ? (
        <FileUploadGallery entries={animatedEntries} disabled={disabled} onRemove={removeFileById} />
      ) : null}
      {limitSummary && files.length > 0 ? (
        <p className="theme-field__file-limit-summary type-caption type-muted mb-0 mt-2">{limitSummary}</p>
      ) : null}
    </Field>
  )
}

export type { ValidateOn, ValidationRule }

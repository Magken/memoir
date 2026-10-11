/** File upload helpers — serialization, limits, and media kind for [DataUpload](../../components/DataUpload.tsx). */

export type FileMediaKind = 'image' | 'video' | 'pdf' | 'text' | 'other'

export type SerializedFileEntry = {
  name: string
  size: number
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function serializeFiles(files: readonly File[]): string {
  return files.map((file) => `${file.name}:${file.size}`).join('\0')
}

export function parseSerializedFiles(value: string): SerializedFileEntry[] {
  if (!value) return []
  return value
    .split('\0')
    .filter(Boolean)
    .map((entry) => {
      const lastColon = entry.lastIndexOf(':')
      if (lastColon <= 0) return { name: entry, size: 0 }
      const name = entry.slice(0, lastColon)
      const size = Number(entry.slice(lastColon + 1))
      return { name, size: Number.isFinite(size) ? size : 0 }
    })
}

export function fileMediaKind(file: File): FileMediaKind {
  const type = file.type.toLowerCase()
  if (type.startsWith('image/')) return 'image'
  if (type.startsWith('video/')) return 'video'
  if (type === 'application/pdf') return 'pdf'
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return 'pdf'
  if (ext && ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif'].includes(ext)) return 'image'
  if (ext && ['mp4', 'webm', 'mov', 'ogg'].includes(ext)) return 'video'
  if (type.startsWith('text/')) return 'text'
  if (ext && ['txt', 'md', 'markdown', 'csv', 'json', 'xml', 'yaml', 'yml', 'log'].includes(ext)) return 'text'
  return 'other'
}

const TEXT_PREVIEW_BYTES = 480

/** Read a short text snippet for upload previews — safe for small docs only. */
export async function readFileTextPreview(file: File, maxBytes = TEXT_PREVIEW_BYTES): Promise<string> {
  const slice = file.slice(0, maxBytes)
  return slice.text()
}

export function fileExtensionLabel(file: File): string {
  const ext = file.name.split('.').pop()?.toUpperCase()
  return ext && ext.length <= 8 ? ext : 'FILE'
}

export function fileUploadKindLabel(kind: FileMediaKind, file: File): string {
  switch (kind) {
    case 'image':
      return 'Image'
    case 'video':
      return 'Video'
    case 'pdf':
      return 'PDF'
    case 'text':
      return 'Text'
    default:
      return fileExtensionLabel(file)
  }
}

export function totalFileBytes(files: readonly File[]): number {
  return files.reduce((sum, file) => sum + file.size, 0)
}

/** Parse accept string (native input accept) — extension or MIME patterns. */
export function acceptsFile(file: File, accept?: string): boolean {
  if (!accept?.trim()) return true
  const tokens = accept
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)
  if (tokens.length === 0) return true

  const name = file.name.toLowerCase()
  const type = file.type.toLowerCase()

  return tokens.some((token) => {
    if (token.startsWith('.')) return name.endsWith(token)
    if (token.endsWith('/*')) {
      const prefix = token.slice(0, -1)
      return type.startsWith(prefix)
    }
    return type === token
  })
}

export function mergeFilesWithinLimits(
  current: readonly File[],
  incoming: readonly File[],
  options: {
    multiple: boolean
    maxFiles?: number
    maxFileSize?: number
    maxTotalSize?: number
    accept?: string
  },
): { files: File[]; rejected: File[]; reason?: 'count' | 'size' | 'total' | 'accept' } {
  const { multiple, maxFiles, maxFileSize, maxTotalSize, accept } = options
  let base = multiple ? [...current] : []
  const rejected: File[] = []

  for (const file of incoming) {
    if (!acceptsFile(file, accept)) {
      rejected.push(file)
      continue
    }
    if (maxFileSize !== undefined && file.size > maxFileSize) {
      rejected.push(file)
      continue
    }
    if (maxFiles !== undefined && base.length >= maxFiles) {
      rejected.push(file)
      continue
    }
    const nextTotal = totalFileBytes(base) + file.size
    if (maxTotalSize !== undefined && nextTotal > maxTotalSize) {
      rejected.push(file)
      continue
    }
    base = multiple ? [...base, file] : [file]
  }

  let reason: 'count' | 'size' | 'total' | 'accept' | undefined
  if (rejected.length > 0) {
    if (rejected.some((file) => !acceptsFile(file, accept))) reason = 'accept'
    else if (rejected.some((file) => maxFileSize !== undefined && file.size > maxFileSize)) reason = 'size'
    else if (maxFiles !== undefined && base.length >= maxFiles) reason = 'count'
    else reason = 'total'
  }

  return { files: base, rejected, reason }
}

export function fileLimitSummary(
  files: readonly File[],
  limits: { maxTotalSize?: number },
): string | undefined {
  if (limits.maxTotalSize === undefined) {
    return undefined
  }
  return `${formatFileSize(totalFileBytes(files))} / ${formatFileSize(limits.maxTotalSize)}`
}

import type { StagedAttachment } from './types'
import { attachmentKindFromMime, createId } from './utils'

export const COMPOSER_MAX_FILES = 12
export const COMPOSER_MAX_FILE_BYTES = 12 * 1024 * 1024
export const COMPOSER_MAX_TOTAL_BYTES = 40 * 1024 * 1024

export type ComposerLimits = {
  maxFiles?: number
  maxFileBytes?: number
  maxTotalBytes?: number
}

export type ComposerMergeResult =
  | { ok: true; attachments: StagedAttachment[] }
  | { ok: false; error: string; attachments: StagedAttachment[] }

export function shouldSendOnEnter(
  event: { key: string; shiftKey: boolean; nativeEvent?: { isComposing?: boolean } },
): boolean {
  if (event.key !== 'Enter' || event.shiftKey) return false
  if (event.nativeEvent?.isComposing) return false
  return true
}

export function fileToStagedAttachment(file: File): StagedAttachment {
  const kind = attachmentKindFromMime(file.type, file.name)
  const url = URL.createObjectURL(file)
  return {
    id: createId('att'),
    name: file.name,
    kind,
    mimeType: file.type || undefined,
    sizeBytes: file.size,
    url,
    file,
  }
}

export function mergeComposerFiles(
  current: readonly StagedAttachment[],
  incoming: readonly File[],
  limits: ComposerLimits = {},
): ComposerMergeResult {
  const maxFiles = limits.maxFiles ?? COMPOSER_MAX_FILES
  const maxFileBytes = limits.maxFileBytes ?? COMPOSER_MAX_FILE_BYTES
  const maxTotalBytes = limits.maxTotalBytes ?? COMPOSER_MAX_TOTAL_BYTES

  const next = [...current]
  let total = next.reduce((sum, a) => sum + (a.sizeBytes ?? 0), 0)

  for (const file of incoming) {
    if (next.length >= maxFiles) {
      return {
        ok: false,
        error: `You can attach at most ${maxFiles} files.`,
        attachments: next,
      }
    }
    if (file.size > maxFileBytes) {
      return {
        ok: false,
        error: `"${file.name}" exceeds the per-file size limit.`,
        attachments: next,
      }
    }
    if (total + file.size > maxTotalBytes) {
      return {
        ok: false,
        error: 'Total attachment size exceeds the limit.',
        attachments: next,
      }
    }
    next.push(fileToStagedAttachment(file))
    total += file.size
  }

  return { ok: true, attachments: next }
}

export function revokeStagedUrls(attachments: readonly StagedAttachment[]) {
  for (const a of attachments) {
    if (a.url?.startsWith('blob:')) URL.revokeObjectURL(a.url)
  }
}

export function canSendComposer(text: string, attachments: readonly StagedAttachment[]): boolean {
  return text.trim().length > 0 || attachments.length > 0
}

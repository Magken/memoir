import type { DriveEntry } from './types'

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
}

export async function downloadDriveEntries(entries: readonly DriveEntry[]): Promise<void> {
  for (const entry of entries) {
    if (entry.kind !== 'file') continue
    if (entry.objectUrl) {
      try {
        const res = await fetch(entry.objectUrl)
        const blob = await res.blob()
        triggerDownload(blob, entry.name)
      } catch {
        const a = document.createElement('a')
        a.href = entry.objectUrl
        a.download = entry.name
        a.rel = 'noopener'
        document.body.appendChild(a)
        a.click()
        a.remove()
      }
      continue
    }
    if (entry.content != null) {
      const blob = new Blob([entry.content], {
        type: entry.mime ?? 'text/plain;charset=utf-8',
      })
      triggerDownload(blob, entry.name)
    }
  }
}

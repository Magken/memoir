import type { DriveEntry, DriveMimeGroup } from './types'

const EXT_MAP: Record<string, DriveMimeGroup> = {
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  gif: 'image',
  webp: 'image',
  svg: 'image',
  pdf: 'pdf',
  md: 'markdown',
  markdown: 'markdown',
  txt: 'text',
  csv: 'csv',
  json: 'json',
  mmd: 'mermaid',
  mermaid: 'mermaid',
  excalidraw: 'draw',
  ts: 'code',
  tsx: 'code',
  js: 'code',
  jsx: 'code',
  css: 'code',
  html: 'code',
  py: 'code',
}

export function mimeGroupFromName(name: string): DriveMimeGroup {
  const lower = name.toLowerCase()
  if (lower.endsWith('.force.json') || lower.includes('.force.')) return 'force'
  const ext = lower.includes('.') ? lower.slice(lower.lastIndexOf('.') + 1) : ''
  return EXT_MAP[ext] ?? (ext ? 'unknown' : 'unknown')
}

export function previewKindForEntry(entry: DriveEntry): DriveMimeGroup {
  if (entry.kind === 'folder') return 'folder'
  return entry.mimeGroup
}

export function mimeGroupLabel(group: DriveMimeGroup): string {
  switch (group) {
    case 'folder':
      return 'Folder'
    case 'image':
      return 'Image'
    case 'pdf':
      return 'PDF'
    case 'markdown':
      return 'Markdown'
    case 'text':
      return 'Text'
    case 'code':
      return 'Code'
    case 'csv':
      return 'CSV'
    case 'mermaid':
      return 'Mermaid'
    case 'force':
      return 'Force graph'
    case 'draw':
      return 'Drawing'
    case 'json':
      return 'JSON'
    default:
      return 'File'
  }
}

/** Map file path extension → Monaco language id. */

const EXT_LANG: Record<string, string> = {
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  json: 'json',
  css: 'css',
  scss: 'scss',
  less: 'less',
  html: 'html',
  htm: 'html',
  md: 'markdown',
  markdown: 'markdown',
  py: 'python',
  rs: 'rust',
  go: 'go',
  java: 'java',
  c: 'c',
  cpp: 'cpp',
  h: 'c',
  hpp: 'cpp',
  xml: 'xml',
  yaml: 'yaml',
  yml: 'yaml',
  sh: 'shell',
  bash: 'shell',
  sql: 'sql',
  csv: 'csv',
  txt: 'plaintext',
}

export function languageFromPath(path: string): string {
  const base = path.split('/').pop() ?? path
  const dot = base.lastIndexOf('.')
  if (dot < 0) return 'plaintext'
  const ext = base.slice(dot + 1).toLowerCase()
  return EXT_LANG[ext] ?? 'plaintext'
}

/** Prefer the path’s language so Copilot-created files are not stuck as plaintext. */
export function resolveEditorLanguage(path: string, stamped?: string | null): string {
  const fromPath = languageFromPath(path)
  if (fromPath !== 'plaintext') return fromPath
  const s = String(stamped ?? '').trim()
  return s || 'plaintext'
}

export const CODE_LANGUAGE_OPTIONS = [
  { id: 'javascript', label: 'JavaScript' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'json', label: 'JSON' },
  { id: 'css', label: 'CSS' },
  { id: 'html', label: 'HTML' },
  { id: 'markdown', label: 'Markdown' },
  { id: 'csv', label: 'CSV' },
  { id: 'python', label: 'Python' },
  { id: 'plaintext', label: 'Plain text' },
] as const

import { fileMediaKind } from '../forms/fileUpload'
import { createFile, uniqueWorkspacePath, workspacePathForUpload } from './workspace'

const UPLOAD_MAX_BYTES = 5 * 1024 * 1024

export const CODE_EDITOR_UPLOAD_ACCEPT =
  '.txt,.md,.markdown,.csv,.json,.js,.jsx,.mjs,.cjs,.ts,.tsx,.css,.scss,.html,.htm,.xml,.yaml,.yml,.pdf,.py,.go,.rs,.sql,.sh,.env,.log,.toml,.ini,.vue,.svelte'

export const CODE_EDITOR_UPLOAD_LIMITS = {
  maxFiles: 20,
  maxFileSize: UPLOAD_MAX_BYTES,
  maxTotalSize: UPLOAD_MAX_BYTES * 8,
} as const

export async function readUploadFileContent(file: File): Promise<string> {
  if (file.size > UPLOAD_MAX_BYTES) {
    throw new Error(`"${file.name}" exceeds the ${UPLOAD_MAX_BYTES / (1024 * 1024)} MB limit.`)
  }

  const kind = fileMediaKind(file)
  if (kind === 'pdf') {
    const url = URL.createObjectURL(file)
    return `${url}\n# ${file.name}\n`
  }

  return file.text()
}

export async function importUploadedFiles(
  files: readonly File[],
  folderPrefix: string,
  workspaceFiles: readonly { path: string }[],
  workspaceFolders: readonly string[],
) {
  const imported = []
  const pool = [...workspaceFiles]

  for (const file of files) {
    const content = await readUploadFileContent(file)
    let path = workspacePathForUpload(file.name, folderPrefix)
    path = uniqueWorkspacePath(pool, workspaceFolders, path)
    const entry = createFile(path, content)
    imported.push(entry)
    pool.push(entry)
  }

  return imported
}

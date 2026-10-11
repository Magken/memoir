import { editor as monacoEditor, Uri } from 'monaco-editor'

export function monacoPathForWorkspace(path: string): string {
  const n = path.replace(/\\/g, '/').replace(/^\/+/, '')
  if (n.startsWith('file:///')) return n
  return `file:///${n}`
}

/** @monaco-editor/react keys models by the `path` prop string. Use file:/// so relatives resolve. */
export function monacoUriForWorkspacePath(path: string): Uri {
  return Uri.parse(monacoPathForWorkspace(path))
}

/** Keep Monaco's text model aligned when a workspace file path changes (rename / move). */
export function renameMonacoModelPath(oldPath: string, newPath: string, language: string): void {
  const oldUri = monacoUriForWorkspacePath(oldPath)
  const newUri = monacoUriForWorkspacePath(newPath)
  if (oldUri.toString() === newUri.toString()) return

  const oldModel = monacoEditor.getModel(oldUri)
  if (!oldModel) return

  const value = oldModel.getValue()
  const existing = monacoEditor.getModel(newUri)
  if (existing) {
    existing.setValue(value)
    oldModel.dispose()
    return
  }

  monacoEditor.createModel(value, language, newUri)
  oldModel.dispose()
}

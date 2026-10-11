import type { editor as MonacoEditor } from 'monaco-editor'

/** Hide Monaco's built-in find widget — CodeEditor uses FindReplaceBar instead. */
export function closeMonacoFind(editor: MonacoEditor.IStandaloneCodeEditor | null) {
  if (!editor) return
  void editor.getAction('closeFindWidget')?.run()
}

export function openMonacoFind(editor: MonacoEditor.IStandaloneCodeEditor | null) {
  if (!editor) return
  void editor.getAction('actions.find')?.run()
}

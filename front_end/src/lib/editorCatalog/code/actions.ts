/**
 * CodeEditor MCT action catalog — props, UI toggles, interaction notation.
 */
import type { EditorAction } from '../types'

export type CodeEditorAction = EditorAction

export const CODE_EDITOR_ACTIONS: CodeEditorAction[] = [
  {
    id: 'code.action.save',
    label: 'Save active file',
    kind: 'command',
    target: 'CodeEditor file menu / Ctrl+S',
    notation: 'io.save @activePath',
    implemented: true,
    relatedFeatures: ['code.io.native-json', 'code.io.zip'],
    notes: 'Persists the active buffer to the workspace payload.',
  },
  {
    id: 'code.action.save-all',
    label: 'Save all open files',
    kind: 'command',
    target: 'CodeEditor file menu',
    notation: 'io.save-all',
    implemented: true,
    relatedFeatures: ['code.io.native-json', 'code.io.zip'],
    notes: 'Flushes every dirty buffer in the tab strip.',
  },
  {
    id: 'code.action.new-file',
    label: 'New file',
    kind: 'command',
    target: 'CodeEditor file menu / explorer',
    notation: 'io.new-file @parentPath',
    implemented: true,
    relatedFeatures: ['code.chrome.explorer', 'code.chrome.tabs'],
  },
  {
    id: 'code.action.new-folder',
    label: 'New folder',
    kind: 'command',
    target: 'CodeEditor explorer context menu',
    notation: 'io.new-folder @parentPath',
    implemented: true,
    relatedFeatures: ['code.chrome.explorer'],
  },
  {
    id: 'code.action.terminal-toggle',
    label: 'Toggle integrated terminal',
    kind: 'ui',
    target: 'CodeEditor toolbar / tray',
    notation: 'chrome.terminal={true|false}',
    defaultValue: false,
    implemented: true,
    relatedFeatures: ['code.chrome.tabs'],
    notes: 'Shows or hides the bottom terminal panel.',
  },
  {
    id: 'code.action.file-download',
    label: 'Download active file',
    kind: 'runtime',
    target: 'CodeEditor export menu',
    notation: 'runtime.download @activePath',
    implemented: true,
    relatedFeatures: ['code.io.file-download'],
  },
  {
    id: 'code.action.upload-files',
    label: 'Upload files',
    kind: 'runtime',
    target: 'CodeEditor file menu',
    notation: 'runtime.upload → payload.files[]',
    implemented: false,
    relatedFeatures: ['code.io.upload-files'],
  },
  {
    id: 'code.action.search',
    label: 'Open workspace search',
    kind: 'ui',
    target: 'CodeEditor toolbar',
    notation: 'interaction.search.open',
    implemented: false,
    relatedFeatures: ['code.interaction.search'],
  },
]

export function codeActionById(id: string): CodeEditorAction | undefined {
  return CODE_EDITOR_ACTIONS.find((action) => action.id === id)
}

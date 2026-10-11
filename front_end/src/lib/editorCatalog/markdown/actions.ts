/**
 * MarkdownRenderer MCT action catalog — props, UI toggles, interaction notation.
 */
import type { EditorAction } from '../types'

export type MarkdownEditorAction = EditorAction

export const MARKDOWN_EDITOR_ACTIONS: MarkdownEditorAction[] = [
  {
    id: 'markdown.action.toggle-preview',
    label: 'Toggle preview pane',
    kind: 'ui',
    target: 'MarkdownRenderer toolbar',
    notation: 'chrome.preview={true|false}',
    defaultValue: true,
    implemented: true,
    relatedFeatures: ['markdown.chrome.source', 'markdown.chrome.preview'],
    notes: 'Switches between split source+preview and source-only layout.',
  },
  {
    id: 'markdown.action.toggle-latex-mode',
    label: 'Toggle LaTeX mode',
    kind: 'ui',
    target: 'MarkdownRenderer toolbar',
    notation: 'interaction.latex-mode={true|false}',
    defaultValue: false,
    implemented: true,
    relatedFeatures: ['markdown.io.tex'],
    notes: 'Switches source language and I/O target between markdown and LaTeX.',
  },
]

export function markdownActionById(id: string): MarkdownEditorAction | undefined {
  return MARKDOWN_EDITOR_ACTIONS.find((action) => action.id === id)
}

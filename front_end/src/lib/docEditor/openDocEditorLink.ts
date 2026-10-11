import { TOGGLE_LINK_COMMAND } from '@lexical/link'
import type { LexicalEditor } from 'lexical'

const PLACEHOLDER_LINK_URL = 'https://'

export function openDocEditorLinkEdit(
  editor: LexicalEditor,
  isLink: boolean,
  setIsLinkEditMode: (value: boolean) => void,
): void {
  if (!isLink) {
    setIsLinkEditMode(true)
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, PLACEHOLDER_LINK_URL)
    return
  }
  setIsLinkEditMode(false)
}

export function isPlaceholderLinkUrl(url: string): boolean {
  return url === PLACEHOLDER_LINK_URL
}

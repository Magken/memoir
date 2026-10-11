import { createCommand, type LexicalCommand, type NodeKey } from 'lexical'

export const INSERT_DOC_LAYOUT_COMMAND: LexicalCommand<string> = createCommand('INSERT_DOC_LAYOUT_COMMAND')
export const UPDATE_DOC_LAYOUT_COMMAND: LexicalCommand<{ nodeKey: NodeKey; templateColumns: string }> =
  createCommand('UPDATE_DOC_LAYOUT_COMMAND')

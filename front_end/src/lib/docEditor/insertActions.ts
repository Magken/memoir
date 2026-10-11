import { $insertNodeToNearestRoot } from '@lexical/utils'
import { INSERT_TABLE_COMMAND } from '@lexical/table'
import { $createCodeNode } from '@lexical/code'
import { $setBlocksType } from '@lexical/selection'
import type { LexicalEditor } from 'lexical'
import { $getSelection, $isRangeSelection } from 'lexical'
import { INSERT_DOC_LAYOUT_COMMAND } from './commands'
import { parseYoutubeVideoId } from './embeds/youtubeUrl'
import { $insertBlockNode } from './insertAtSelection'
import { $createCollapsibleContainerNode } from './nodes/collapsibleNode'
import { $createDateNode } from './nodes/dateNode'
import { $createEquationNode } from './nodes/equationNode'
import { $createHorizontalRuleNode } from './nodes/horizontalRuleNode'
import { $createImageNode } from './nodes/imageNode'
import { $createPageBreakNode } from './nodes/pageBreakNode'
import { $createPollNode } from './nodes/pollNode'
import { $createStickyNoteNode } from './nodes/stickyNoteNode'
import { $createVideoEmbedNode } from './nodes/videoEmbedNode'

export function insertHorizontalRule(editor: LexicalEditor): void {
  editor.update(() => {
    $insertBlockNode($createHorizontalRuleNode())
  })
}

export function insertPageBreak(editor: LexicalEditor): void {
  editor.update(() => {
    $insertBlockNode($createPageBreakNode())
  })
}

export function insertImage(editor: LexicalEditor, src = ''): void {
  editor.update(() => {
    $insertBlockNode($createImageNode(src, '', 'image'))
  })
}

export function insertGif(editor: LexicalEditor, src = ''): void {
  editor.update(() => {
    $insertBlockNode($createImageNode(src, '', 'gif'))
  })
}

export function insertTable(editor: LexicalEditor, rows = 3, cols = 3): void {
  editor.dispatchCommand(INSERT_TABLE_COMMAND, { columns: String(cols), rows: String(rows) })
}

export function insertColumnsLayout(editor: LexicalEditor, templateColumns: string): void {
  editor.dispatchCommand(INSERT_DOC_LAYOUT_COMMAND, templateColumns)
}

export function insertEquation(editor: LexicalEditor): void {
  editor.update(() => {
    $insertBlockNode($createEquationNode('', true))
  })
}

export function insertPoll(editor: LexicalEditor): void {
  editor.update(() => {
    $insertBlockNode($createPollNode())
  })
}

export function insertStickyNote(editor: LexicalEditor): void {
  editor.update(() => {
    $insertBlockNode($createStickyNoteNode())
  })
}

export function insertCollapsible(editor: LexicalEditor): void {
  editor.update(() => {
    const container = $createCollapsibleContainerNode(true)
    $insertNodeToNearestRoot(container)
    container.getFirstDescendant()?.selectEnd()
  })
}

export function insertCodeBlock(editor: LexicalEditor): void {
  editor.update(() => {
    const selection = $getSelection()
    if ($isRangeSelection(selection)) {
      $setBlocksType(selection, () => $createCodeNode())
      return
    }
    $insertBlockNode($createCodeNode())
  })
}

export function insertDate(editor: LexicalEditor, date?: string): void {
  editor.update(() => {
    $insertBlockNode($createDateNode(date))
  })
}

export function insertVideoFile(editor: LexicalEditor, src = ''): void {
  editor.update(() => {
    $insertBlockNode($createVideoEmbedNode(src))
  })
}

export function insertYoutubeVideo(editor: LexicalEditor, url = ''): void {
  const videoId = parseYoutubeVideoId(url) ?? ''
  editor.update(() => {
    $insertBlockNode($createVideoEmbedNode(videoId))
  })
}

export function promptAndInsert(
  editor: LexicalEditor,
  message: string,
  insert: (editor: LexicalEditor, value: string) => void,
): void {
  const value = window.prompt(message)
  if (value == null) return
  insert(editor, value.trim())
}

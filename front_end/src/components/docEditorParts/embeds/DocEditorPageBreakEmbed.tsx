import { useEffect } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection'
import { CLICK_COMMAND, COMMAND_PRIORITY_LOW, mergeRegister, type NodeKey } from 'lexical'

type DocEditorPageBreakEmbedProps = {
  nodeKey: NodeKey
}

export function DocEditorPageBreakEmbed({ nodeKey }: DocEditorPageBreakEmbedProps) {
  const [editor] = useLexicalComposerContext()
  const [isSelected, setSelected, clearSelection] = useLexicalNodeSelection(nodeKey)

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        CLICK_COMMAND,
        (event: MouseEvent) => {
          const elem = editor.getElementByKey(nodeKey)
          if (event.target === elem) {
            if (!event.shiftKey) clearSelection()
            setSelected(!isSelected)
            return true
          }
          return false
        },
        COMMAND_PRIORITY_LOW,
      ),
    )
  }, [clearSelection, editor, isSelected, nodeKey, setSelected])

  useEffect(() => {
    const elem = editor.getElementByKey(nodeKey)
    if (elem) {
      elem.classList.toggle('editor-page-break--selected', isSelected)
    }
  }, [editor, isSelected, nodeKey])

  return null
}

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $findMatchingParent } from '@lexical/utils'
import { useEffect } from 'react'
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  DELETE_CHARACTER_COMMAND,
  INSERT_PARAGRAPH_COMMAND,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  KEY_ARROW_UP_COMMAND,
  mergeRegister,
} from 'lexical'
import {
  $isCollapsibleContainerNode,
  $isCollapsibleContentNode,
  $isCollapsibleTitleNode,
  CollapsibleContainerNode,
  CollapsibleContentNode,
  CollapsibleTitleNode,
} from '../../lib/docEditor/nodes/collapsibleNode'

function $deleteCollapsedCollapsibleFromSelection(): boolean {
  const selection = $getSelection()
  if (!$isRangeSelection(selection)) return false

  const container = $findMatchingParent(selection.anchor.getNode(), $isCollapsibleContainerNode)
  if (!$isCollapsibleContainerNode(container) || container.getOpen()) return false

  const titleNode = container.getFirstChild()
  if (!$isCollapsibleTitleNode(titleNode)) return false

  if (!selection.isCollapsed()) {
    const selectedText = selection.getTextContent()
    const titleText = titleNode.getTextContent()
    const selectedInTitle = selection.getNodes().every(
      (node) => titleNode.isParentOf(node) || node.getKey() === titleNode.getKey(),
    )
    if (selectedInTitle && selectedText.length >= titleText.length && titleText.length > 0) {
      container.remove()
      return true
    }
    return false
  }

  if (container.getTextContent().trim() === '') {
    container.remove()
    return true
  }

  return false
}

export function DocEditorCollapsiblePlugin() {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    const $onEscapeUpCollapsible = () => {
      const selection = $getSelection()
      if (
        $isRangeSelection(selection) &&
        selection.isCollapsed() &&
        selection.anchor.offset === 0
      ) {
        const container = $findMatchingParent(selection.anchor.getNode(), $isCollapsibleContainerNode)
        if ($isCollapsibleContainerNode(container)) {
          const parent = container.getParent()
          if (
            parent !== null &&
            parent.getFirstChild() === container &&
            selection.anchor.key === container.getFirstDescendant()?.getKey()
          ) {
            container.insertBefore($createParagraphNode())
          }
        }
      }
      return false
    }

    const $onEscapeDownCollapsible = () => {
      const selection = $getSelection()
      if ($isRangeSelection(selection) && selection.isCollapsed()) {
        const container = $findMatchingParent(selection.anchor.getNode(), $isCollapsibleContainerNode)
        if ($isCollapsibleContainerNode(container)) {
          const parent = container.getParent()
          if (parent !== null && parent.getLastChild() === container) {
            const titleParagraph = container.getFirstDescendant()
            const contentParagraph = container.getLastDescendant()
            if (
              (contentParagraph !== null &&
                selection.anchor.key === contentParagraph.getKey() &&
                selection.anchor.offset === contentParagraph.getTextContentSize()) ||
              (titleParagraph !== null &&
                selection.anchor.key === titleParagraph.getKey() &&
                selection.anchor.offset === titleParagraph.getTextContentSize() &&
                !container.getOpen())
            ) {
              container.insertAfter($createParagraphNode())
            }
          }
        }
      }
      return false
    }

    return mergeRegister(
      editor.registerNodeTransform(CollapsibleContentNode, (node) => {
        const parent = node.getParent()
        if (!$isCollapsibleContainerNode(parent)) {
          for (const child of node.getChildren()) node.insertBefore(child)
          node.remove()
        } else if (node.isEmpty()) {
          node.append($createParagraphNode())
        }
      }),

      editor.registerNodeTransform(CollapsibleTitleNode, (node) => {
        const parent = node.getParent()
        if (!$isCollapsibleContainerNode(parent)) {
          node.replace($createParagraphNode().append(...node.getChildren()))
        }
      }),

      editor.registerNodeTransform(CollapsibleContainerNode, (node) => {
        const children = node.getChildren()
        if (
          children.length !== 2 ||
          !$isCollapsibleTitleNode(children[0]) ||
          !$isCollapsibleContentNode(children[1])
        ) {
          for (const child of children) node.insertBefore(child)
          node.remove()
        }
      }),

      editor.registerCommand(KEY_ARROW_DOWN_COMMAND, $onEscapeDownCollapsible, COMMAND_PRIORITY_LOW),
      editor.registerCommand(KEY_ARROW_RIGHT_COMMAND, $onEscapeDownCollapsible, COMMAND_PRIORITY_LOW),
      editor.registerCommand(KEY_ARROW_UP_COMMAND, $onEscapeUpCollapsible, COMMAND_PRIORITY_LOW),
      editor.registerCommand(KEY_ARROW_LEFT_COMMAND, $onEscapeUpCollapsible, COMMAND_PRIORITY_LOW),

      editor.registerCommand(
        DELETE_CHARACTER_COMMAND,
        () => $deleteCollapsedCollapsibleFromSelection(),
        COMMAND_PRIORITY_LOW,
      ),

      editor.registerCommand(
        INSERT_PARAGRAPH_COMMAND,
        () => {
          const selection = $getSelection()
          if ($isRangeSelection(selection)) {
            const titleNode = $findMatchingParent(selection.anchor.getNode(), $isCollapsibleTitleNode)
            if ($isCollapsibleTitleNode(titleNode)) {
              const container = titleNode.getParent()
              if (container && $isCollapsibleContainerNode(container)) {
                if (!container.getOpen()) container.toggleOpen()
                titleNode.getNextSibling()?.selectEnd()
                return true
              }
            }
          }
          return false
        },
        COMMAND_PRIORITY_LOW,
      ),
    )
  }, [editor])

  return null
}

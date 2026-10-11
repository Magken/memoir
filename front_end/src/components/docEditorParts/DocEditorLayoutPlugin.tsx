import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $onEscapeDown, $onEscapeUp } from '@lexical/utils'
import { useEffect } from 'react'
import {
  $createParagraphNode,
  $getNodeByKey,
  COMMAND_PRIORITY_EDITOR,
  COMMAND_PRIORITY_LOW,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  KEY_ARROW_UP_COMMAND,
  mergeRegister,
} from 'lexical'
import { INSERT_DOC_LAYOUT_COMMAND, UPDATE_DOC_LAYOUT_COMMAND } from '../../lib/docEditor/commands'
import { layoutItemCount } from '../../lib/docEditor/layoutTemplates'
import {
  $createLayoutItemNode,
  $createLayoutWithTemplate,
  $isLayoutContainerNode,
  $isLayoutItemNode,
  LayoutContainerNode,
  LayoutItemNode,
} from '../../lib/docEditor/nodes/columnsLayoutNode'
import { $insertBlockNode } from '../../lib/docEditor/insertAtSelection'

export function DocEditorLayoutPlugin() {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        KEY_ARROW_DOWN_COMMAND,
        (event) => $onEscapeDown($isLayoutContainerNode, event),
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_ARROW_RIGHT_COMMAND,
        (event) => $onEscapeDown($isLayoutContainerNode, event),
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_ARROW_UP_COMMAND,
        (event) => $onEscapeUp($isLayoutContainerNode, event),
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_ARROW_LEFT_COMMAND,
        (event) => $onEscapeUp($isLayoutContainerNode, event),
        COMMAND_PRIORITY_LOW,
      ),

      editor.registerCommand(
        INSERT_DOC_LAYOUT_COMMAND,
        (templateColumns) => {
          editor.update(() => {
            const container = $createLayoutWithTemplate(templateColumns)
            $insertBlockNode(container)
            container.selectStart()
          })
          return true
        },
        COMMAND_PRIORITY_EDITOR,
      ),

      editor.registerCommand(
        UPDATE_DOC_LAYOUT_COMMAND,
        ({ nodeKey, templateColumns }) => {
          editor.update(() => {
            const container = $getNodeByKey(nodeKey)
            if (!$isLayoutContainerNode(container)) return

            const nextCount = layoutItemCount(templateColumns)
            const prevCount = layoutItemCount(container.getTemplateColumns())

            if (nextCount > prevCount) {
              for (let i = prevCount; i < nextCount; i++) {
                container.append($createLayoutItemNode().append($createParagraphNode()))
              }
            } else if (nextCount < prevCount) {
              for (let i = prevCount - 1; i >= nextCount; i--) {
                const item = container.getChildAtIndex(i)
                if ($isLayoutItemNode(item)) item.remove()
              }
            }

            container.setTemplateColumns(templateColumns)
          })
          return true
        },
        COMMAND_PRIORITY_EDITOR,
      ),

      editor.registerNodeTransform(LayoutItemNode, (node) => {
        const parent = node.getParent()
        if (!$isLayoutContainerNode(parent)) {
          for (const child of node.getChildren()) node.insertBefore(child)
          node.remove()
        } else if (node.isEmpty()) {
          node.append($createParagraphNode())
        }
      }),

      editor.registerNodeTransform(LayoutContainerNode, (node) => {
        const children = node.getChildren()
        if (!children.every($isLayoutItemNode)) {
          for (const child of children) node.insertBefore(child)
          node.remove()
        }
      }),
    )
  }, [editor])

  return null
}

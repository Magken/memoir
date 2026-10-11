import { CodeNode, $isCodeNode } from '@lexical/code'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getRoot, $isElementNode, type LexicalNode } from 'lexical'
import { useEffect, type RefObject } from 'react'
import { measureDefaultDiagramBlockHeight } from '../../lib/docEditor/diagramBlockSize'
import { isDocDiagramCodeLanguage } from '../../lib/docEditor/diagramCodeLanguages'
import { $createDiagramCodeNode } from '../../lib/docEditor/nodes/diagramCodeNode'

export type DocEditorDiagramPreviewPluginProps = {
  defaultHeightRef: RefObject<number>
}

/** Migrates legacy diagram `CodeNode`s to `DiagramCodeNode` and measures default block height. */
export function DocEditorDiagramPreviewPlugin({ defaultHeightRef }: DocEditorDiagramPreviewPluginProps) {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    const shell = editor.getRootElement()?.closest('.theme-doc-editor')
    if (shell instanceof HTMLElement) {
      defaultHeightRef.current = measureDefaultDiagramBlockHeight(shell)
    }
  }, [defaultHeightRef, editor])

  useEffect(() => {
    editor.update(() => {
      const stack: LexicalNode[] = [$getRoot()]
      while (stack.length > 0) {
        const node = stack.pop()
        if (!node) continue
        const language = $isCodeNode(node) ? node.getLanguage() ?? '' : ''
        if ($isCodeNode(node) && isDocDiagramCodeLanguage(language)) {
          node.replace($createDiagramCodeNode(language, node.getTextContent()))
          continue
        }
        if ($isElementNode(node)) {
          stack.push(...node.getChildren())
        }
      }
    })
  }, [editor])

  useEffect(() => {
    return editor.registerNodeTransform(CodeNode, (node) => {
      if (!$isCodeNode(node)) return
      const language = node.getLanguage() ?? ''
      if (!isDocDiagramCodeLanguage(language)) return
      node.replace($createDiagramCodeNode(language, node.getTextContent()))
    })
  }, [editor])

  return null
}

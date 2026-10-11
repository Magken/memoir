import { useEffect } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $isCodeNode, type CodeNode } from '@lexical/code'
import { $getRoot, $isElementNode, type LexicalNode } from 'lexical'
import { codeLanguageDisplayLabel } from '../../lib/docEditor/codeLanguageLabel'
import { docDiagramCodeLanguageLabel, isDocDiagramCodeLanguage } from '../../lib/docEditor/diagramCodeLanguages'

function $forEachCodeNode(visit: (node: CodeNode) => void): void {
  const stack: LexicalNode[] = [$getRoot()]
  while (stack.length > 0) {
    const node = stack.pop()
    if (!node) continue
    if ($isCodeNode(node)) visit(node)
    if ($isElementNode(node)) {
      stack.push(...node.getChildren())
    }
  }
}

export function DocEditorCodeLanguageLabelPlugin() {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    const syncLabels = () => {
      editor.getEditorState().read(() => {
        $forEachCodeNode((node) => {
          const element = editor.getElementByKey(node.getKey())
          if (!(element instanceof HTMLElement)) return
          const language = node.getLanguage() ?? ''
          element.setAttribute(
            'data-language-label',
            isDocDiagramCodeLanguage(language)
              ? docDiagramCodeLanguageLabel(language)
              : codeLanguageDisplayLabel(language),
          )
        })
      })
    }

    syncLabels()
    return editor.registerUpdateListener(() => {
      requestAnimationFrame(syncLabels)
    })
  }, [editor])

  return null
}

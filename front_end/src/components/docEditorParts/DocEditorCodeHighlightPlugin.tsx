import { useEffect } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { registerCodeHighlighting } from '@lexical/code'
import { PrismTokenizer } from '@lexical/code-prism'

export function DocEditorCodeHighlightPlugin() {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    return registerCodeHighlighting(editor, PrismTokenizer)
  }, [editor])

  return null
}

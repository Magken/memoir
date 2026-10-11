import { $getNodeByKey } from 'lexical'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { useLexicalEditable } from '@lexical/react/useLexicalEditable'
import type { NodeKey } from 'lexical'
import { PollBlock } from '../../PollBlock'
import { $isPollNode } from '../../../lib/docEditor/nodes/pollNode'

type DocEditorPollEmbedProps = {
  nodeKey: NodeKey
  options: string[]
  question: string
}

export function DocEditorPollEmbed({ nodeKey, options, question }: DocEditorPollEmbedProps) {
  const [editor] = useLexicalComposerContext()
  const isEditable = useLexicalEditable()

  return (
    <PollBlock
      question={question}
      options={options}
      editable={isEditable}
      className="editor-poll"
      onQuestionChange={(next) => {
        editor.update(() => {
          const node = $getNodeByKey(nodeKey)
          if ($isPollNode(node)) node.setQuestion(next)
        })
      }}
      onOptionsChange={(next) => {
        editor.update(() => {
          const node = $getNodeByKey(nodeKey)
          if ($isPollNode(node)) node.setOptions(next)
        })
      }}
    />
  )
}

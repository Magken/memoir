import { $getNodeByKey } from 'lexical'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { useLexicalEditable } from '@lexical/react/useLexicalEditable'
import type { NodeKey } from 'lexical'
import { DatePicker } from '../../DatePicker'
import { $isDateNode } from '../../../lib/docEditor/nodes/dateNode'

type DocEditorDateEmbedProps = {
  date: string
  nodeKey: NodeKey
}

export function DocEditorDateEmbed({ date, nodeKey }: DocEditorDateEmbedProps) {
  const [editor] = useLexicalComposerContext()
  const isEditable = useLexicalEditable()

  if (!isEditable) {
    return (
      <time className="editor-date__display" dateTime={date}>
        {date}
      </time>
    )
  }

  return (
    <div className="editor-date">
      <DatePicker
        optional
        size="sm"
        value={date}
        onChange={(next) => {
          editor.update(() => {
            const node = $getNodeByKey(nodeKey)
            if ($isDateNode(node)) node.setDate(next)
          })
        }}
      />
    </div>
  )
}

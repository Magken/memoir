import { $addUpdateTag, $getNodeByKey, SKIP_DOM_SELECTION_TAG, type NodeKey } from 'lexical'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { useLexicalEditable } from '@lexical/react/useLexicalEditable'
import { Check, Pencil, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState, type MouseEvent, type PointerEvent } from 'react'
import { EquationBlock } from '../../EquationBlock'
import { IconButton } from '../../IconButton'
import { Textarea } from '../../Textarea'
import { $isEquationNode, type EquationNode } from '../../../lib/docEditor/nodes/equationNode'

type DocEditorEquationEmbedProps = {
  latex: string
  draft?: boolean
  nodeKey: NodeKey
}

function stopEditorBubble(event: MouseEvent | PointerEvent) {
  event.stopPropagation()
}

export function DocEditorEquationEmbed({ latex, draft = false, nodeKey }: DocEditorEquationEmbedProps) {
  const [editor] = useLexicalComposerContext()
  const isEditable = useLexicalEditable()
  const [isEditing, setIsEditing] = useState(draft)
  const [draftLatex, setDraftLatex] = useState(latex)

  useEffect(() => {
    setDraftLatex(latex)
  }, [latex])

  useEffect(() => {
    if (draft) setIsEditing(true)
  }, [draft])

  const updateNode = useCallback(
    (mutate: (node: EquationNode) => void) => {
      editor.update(
        () => {
          $addUpdateTag(SKIP_DOM_SELECTION_TAG)
          const node = $getNodeByKey(nodeKey)
          if ($isEquationNode(node)) mutate(node)
        },
        { tag: SKIP_DOM_SELECTION_TAG },
      )
    },
    [editor, nodeKey],
  )

  const handleDraftChange = useCallback(
    (next: string) => {
      setDraftLatex(next)
      updateNode((node) => node.setLatex(next))
    },
    [updateNode],
  )

  const handleDone = useCallback(() => {
    const trimmed = draftLatex.trim()
    updateNode((node) => {
      node.setLatex(trimmed)
      node.setDraft(false)
    })
    setIsEditing(false)
  }, [draftLatex, updateNode])

  const handleEdit = useCallback(() => {
    setDraftLatex(latex)
    setIsEditing(true)
  }, [latex])

  const handleDelete = useCallback(() => {
    updateNode((node) => node.remove())
  }, [updateNode])

  if (!isEditable) {
    return <EquationBlock latex={latex} className="editor-equation theme-equation-block--readonly" />
  }

  return (
    <div
      className={[
        'theme-equation-block',
        'editor-equation',
        isEditing ? 'theme-equation-block--editing' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onMouseDown={stopEditorBubble}
      onPointerDown={stopEditorBubble}
    >
      <header className="theme-equation-block__header">
        <span className="theme-equation-block__label type-caption">
          {isEditing ? 'Edit equation' : 'Equation'}
        </span>
        <div className="theme-equation-block__actions">
          {isEditing ? (
            <IconButton
              icon={Check}
              aria-label="Done editing"
              size="xs"
              variant="ghost"
              onClick={handleDone}
            />
          ) : (
            <IconButton
              icon={Pencil}
              aria-label="Edit equation"
              size="xs"
              variant="ghost"
              onClick={handleEdit}
            />
          )}
          <IconButton
            icon={Trash2}
            aria-label="Delete equation"
            size="xs"
            variant="ghost"
            onClick={handleDelete}
          />
        </div>
      </header>
      <div className="theme-equation-block__body">
        {isEditing ? (
          <div className="theme-equation-block__edit">
            <Textarea
              shadowless
              size="sm"
              showCounter={false}
              rows={3}
              placeholder="E=mc^2"
              value={draftLatex}
              autoFocus
              className="theme-equation-block__field"
              onChange={(event) => handleDraftChange(event.target.value)}
            />
            {draftLatex.trim() ? (
              <div className="theme-equation-block__preview" aria-live="polite">
                <EquationBlock latex={draftLatex} bare />
              </div>
            ) : (
              <p className="theme-equation-block__hint type-caption type-muted">
                LaTeX preview updates as you type.
              </p>
            )}
          </div>
        ) : latex.trim() ? (
          <div className="theme-equation-block__display">
            <EquationBlock latex={latex} bare />
          </div>
        ) : (
          <p className="theme-equation-block__empty type-caption type-muted">
            No formula yet — edit to add LaTeX.
          </p>
        )}
      </div>
    </div>
  )
}

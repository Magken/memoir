import { useRef, type FC } from 'react'
import { GripVertical } from 'lucide-react'
import { useLexicalEditable } from '@lexical/react/useLexicalEditable'
import { DraggableBlockPlugin } from '../../lib/docEditor/draggableBlock/lexicalDraggableBlockPlugin'

const DRAGGABLE_BLOCK_MENU_CLASS = 'theme-doc-editor__draggable-block-menu'

function isOnDraggableHandle(element: HTMLElement): boolean {
  return Boolean(element.closest(`.${DRAGGABLE_BLOCK_MENU_CLASS}`))
}

function isOnDiagramInteraction(element: HTMLElement): boolean {
  return Boolean(
    element.closest(
      [
        '.editor-diagram-preview-card__chrome',
        '.editor-diagram-preview-card__resize',
        '.theme-mermaid-renderer__canvas-zoom',
        '.theme-draw-canvas__doc-zoom',
        '.theme-mermaid-renderer__canvas',
        '.theme-draw-canvas--doc-embed .theme-draw-canvas__excalidraw',
      ].join(', '),
    ),
  )
}

type DocEditorDraggableBlockPluginProps = {
  anchorElem: HTMLElement
}

function isOnMenu(element: HTMLElement): boolean {
  return isOnDraggableHandle(element) || isOnDiagramInteraction(element)
}

export const DocEditorDraggableBlockPlugin: FC<DocEditorDraggableBlockPluginProps> =
  function DocEditorDraggableBlockPlugin({ anchorElem }) {
    const menuRef = useRef<HTMLDivElement>(null)
    const targetLineRef = useRef<HTMLDivElement>(null)
    const isEditable = useLexicalEditable()

    return (
      <DraggableBlockPlugin
        anchorElem={anchorElem}
        menuRef={menuRef}
        targetLineRef={targetLineRef}
        isEditable={isEditable}
        isOnMenu={isOnMenu}
        menuComponent={
          <div ref={menuRef} className={DRAGGABLE_BLOCK_MENU_CLASS}>
            <button
              type="button"
              className="theme-doc-editor__draggable-block-handle"
              aria-label="Drag to reorder block"
            >
              <GripVertical aria-hidden="true" />
            </button>
          </div>
        }
        targetLineComponent={
          <div
            ref={targetLineRef}
            className="theme-doc-editor__draggable-block-target-line"
            aria-hidden="true"
          />
        }
      />
    )
  }

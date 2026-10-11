import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getNodeByKey, mergeRegister, $addUpdateTag, SKIP_DOM_SELECTION_TAG, type EditorState, type LexicalEditor, type NodeKey } from 'lexical'
import { Palette, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconButton } from '../../IconButton'
import { $isStickyNoteNode } from '../../../lib/docEditor/nodes/stickyNoteNode'
import type { StickyNoteColor } from '../../../lib/docEditor/nodes/stickyNoteNode'

type DocEditorStickyNoteEmbedProps = {
  caption: string
  color: StickyNoteColor
  nodeKey: NodeKey
  x: number
  y: number
}

type Positioning = {
  isDragging: boolean
  offsetX: number
  offsetY: number
  x: number
  y: number
}

function getStickyPortalTarget(editor: LexicalEditor): HTMLElement {
  const root = editor.getRootElement()
  const stickyLayer = root
    ?.closest('.theme-doc-editor__page-canvas')
    ?.querySelector('.theme-doc-editor__sticky-layer')
  if (stickyLayer instanceof HTMLElement) return stickyLayer
  const pageSurface = root?.closest('.theme-doc-editor__page-surface')
  if (pageSurface instanceof HTMLElement) return pageSurface
  const content = root?.closest('.theme-doc-editor__content')
  if (content instanceof HTMLElement) return content
  return document.body
}

function positionSticky(stickyElem: HTMLElement, positioning: Positioning): void {
  stickyElem.style.top = `${positioning.y}px`
  stickyElem.style.left = `${positioning.x}px`
}

function stickyCaptionEditorState(caption: string): string | undefined {
  const trimmed = caption.trim()
  if (!trimmed) return undefined
  try {
    JSON.parse(trimmed)
    return trimmed
  } catch {
    return JSON.stringify({
      root: {
        children: [
          {
            children: [
              {
                detail: 0,
                format: 0,
                mode: 'normal',
                style: '',
                text: caption,
                type: 'text',
                version: 1,
              },
            ],
            direction: 'ltr',
            format: '',
            indent: 0,
            type: 'paragraph',
            version: 1,
            textFormat: 0,
            textStyle: '',
          },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        type: 'root',
        version: 1,
      },
    })
  }
}

function StickyCaptionEditor({
  caption,
  nodeKey,
  onCaptionChange,
}: {
  caption: string
  nodeKey: NodeKey
  onCaptionChange: (json: string) => void
}) {
  const initialCaptionRef = useRef(caption)
  const initialConfig = useMemo(
    () => ({
      namespace: `DocEditorSticky-${nodeKey}`,
      onError(error: Error) {
        console.error('[StickyCaptionEditor]', error)
      },
      editorState: stickyCaptionEditorState(initialCaptionRef.current),
      theme: { paragraph: 'editor-sticky-note__paragraph' },
    }),
    [nodeKey],
  )

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <RichTextPlugin
        contentEditable={
          <ContentEditable className="editor-sticky-note__input" aria-label="Sticky note content" />
        }
        placeholder={<span className="editor-sticky-note__placeholder type-caption">What's up?</span>}
        ErrorBoundary={LexicalErrorBoundary}
      />
      <HistoryPlugin />
      <OnChangePlugin
        ignoreHistoryMergeTagChange
        ignoreSelectionChange
        onChange={(editorState: EditorState) => {
          onCaptionChange(JSON.stringify(editorState.toJSON()))
        }}
      />
    </LexicalComposer>
  )
}

export function DocEditorStickyNoteEmbed({
  caption,
  color,
  nodeKey,
  x,
  y,
}: DocEditorStickyNoteEmbedProps) {
  const [editor] = useLexicalComposerContext()
  const containerRef = useRef<HTMLDivElement>(null)
  const positioningRef = useRef<Positioning>({
    isDragging: false,
    offsetX: 0,
    offsetY: 0,
    x,
    y,
  })
  const [portalTarget, setPortalTarget] = useState<HTMLElement>(() => getStickyPortalTarget(editor))

  useLayoutEffect(() => {
    const syncPortalTarget = () => setPortalTarget(getStickyPortalTarget(editor))
    syncPortalTarget()
    return editor.registerRootListener(() => {
      requestAnimationFrame(syncPortalTarget)
    })
  }, [editor])

  useEffect(() => {
    if (positioningRef.current.isDragging) return
    positioningRef.current.x = x
    positioningRef.current.y = y
    const el = containerRef.current
    if (el) positionSticky(el, positioningRef.current)
  }, [x, y])

  useLayoutEffect(() => {
    const positioning = positioningRef.current

    const syncPosition = () => {
      if (positioning.isDragging) return
      const stickyContainer = containerRef.current
      if (stickyContainer) positionSticky(stickyContainer, positioning)
    }

    const resizeObserver = new ResizeObserver(() => syncPosition())

    return mergeRegister(
      editor.registerRootListener((nextRootElem) => {
        if (nextRootElem) {
          resizeObserver.observe(nextRootElem)
          syncPosition()
          return () => resizeObserver.unobserve(nextRootElem)
        }
        return undefined
      }),
      editor.registerUpdateListener(() => syncPosition()),
    )
  }, [editor])

  const handleCaptionChange = useCallback(
    (json: string) => {
      editor.update(
        () => {
          $addUpdateTag(SKIP_DOM_SELECTION_TAG)
          const node = $getNodeByKey(nodeKey)
          if ($isStickyNoteNode(node)) node.setCaption(json)
        },
        { tag: SKIP_DOM_SELECTION_TAG },
      )
    },
    [editor, nodeKey],
  )

  const handleDelete = useCallback(() => {
    editor.update(
      () => {
        $addUpdateTag(SKIP_DOM_SELECTION_TAG)
        const node = $getNodeByKey(nodeKey)
        if ($isStickyNoteNode(node)) {
          node.remove()
        }
      },
      { tag: SKIP_DOM_SELECTION_TAG },
    )
  }, [editor, nodeKey])

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      const stickyContainer = containerRef.current
      const positioning = positioningRef.current
      const portalEl = portalTarget instanceof HTMLElement ? portalTarget : null
      if (!stickyContainer || !positioning.isDragging || !portalEl) return

      const surfaceRect = portalEl.getBoundingClientRect()
      positioning.x = event.clientX - surfaceRect.left - positioning.offsetX
      positioning.y = event.clientY - surfaceRect.top - positioning.offsetY
      positionSticky(stickyContainer, positioning)
    },
    [portalTarget],
  )

  const handlePointerUp = useCallback(() => {
    const stickyContainer = containerRef.current
    const positioning = positioningRef.current
    if (stickyContainer) {
      positioning.isDragging = false
      stickyContainer.classList.remove('editor-sticky-note--dragging')
      editor.update(() => {
        const node = $getNodeByKey(nodeKey)
        if ($isStickyNoteNode(node)) node.setPosition(positioning.x, positioning.y)
      })
    }
    document.removeEventListener('pointermove', handlePointerMove)
    document.removeEventListener('pointerup', handlePointerUp)
  }, [editor, handlePointerMove, nodeKey])

  const note = (
    <div
      ref={containerRef}
      className={['editor-sticky-note-portal', `editor-sticky-note-portal--${color}`].join(' ')}
    >
      <div className="editor-sticky-note__shell">
        <div
          className="editor-sticky-note__toolbar"
          onPointerDown={(event) => {
            if ((event.target as HTMLElement).closest('.editor-sticky-note__actions')) return

            const stickyContainer = containerRef.current
            const portalEl = portalTarget instanceof HTMLElement ? portalTarget : null
            if (!stickyContainer || !portalEl || event.button === 2) return

            const noteRect = stickyContainer.getBoundingClientRect()
            const positioning = positioningRef.current
            positioning.offsetX = event.clientX - noteRect.left
            positioning.offsetY = event.clientY - noteRect.top
            positioning.isDragging = true
            stickyContainer.classList.add('editor-sticky-note--dragging')
            document.addEventListener('pointermove', handlePointerMove)
            document.addEventListener('pointerup', handlePointerUp)
            event.preventDefault()
          }}
        >
          <span className="editor-sticky-note__label type-caption">Sticky note</span>
          <div
            className="editor-sticky-note__actions"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <IconButton
              icon={Palette}
              aria-label="Toggle sticky note color"
              size="xs"
              variant="ghost"
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation()
                editor.update(() => {
                  const node = $getNodeByKey(nodeKey)
                  if ($isStickyNoteNode(node)) node.toggleColor()
                })
              }}
            />
            <IconButton
              icon={Trash2}
              aria-label="Delete sticky note"
              size="xs"
              variant="ghost"
              onMouseDown={(event) => {
                event.preventDefault()
                event.stopPropagation()
              }}
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                handleDelete()
              }}
            />
          </div>
        </div>
        <div className="editor-sticky-note__body">
          <StickyCaptionEditor caption={caption} nodeKey={nodeKey} onCaptionChange={handleCaptionChange} />
        </div>
      </div>
    </div>
  )

  return createPortal(note, portalTarget)
}

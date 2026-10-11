/**
 * Adapted from @lexical/react LexicalDraggableBlockPlugin (MIT).
 * Vendored because the experimental export is not published in @lexical/react 0.46.
 */

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { calculateZoomLevel } from '@lexical/utils'
import {
  $getNearestNodeFromDOMNode,
  $getNodeByKey,
  $getRoot,
  BLUR_COMMAND,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  DRAGOVER_COMMAND,
  DROP_COMMAND,
  getActiveElement,
  getActiveElementDeep,
  getComposedEventTarget,
  getParentElement,
  getRootOwnerDocument,
  IS_FIREFOX,
  isHTMLElement,
  type LexicalEditor,
  mergeRegister,
  $onUpdate,
} from 'lexical'
import {
  type DragEvent as ReactDragEvent,
  type JSX,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'

import { Point } from './point'
import { Rectangle } from './rect'

const SPACE = 4
const TARGET_LINE_HALF_HEIGHT = 2
const DRAG_DATA_FORMAT = 'application/x-lexical-drag-block'
const HANDLE_SIZE = 16

const Downward = 1
const Upward = -1
const Indeterminate = 0

let prevIndex = Infinity

function isFileTransfer(event: DragEvent): boolean {
  const dataTransfer = event.dataTransfer
  if (!dataTransfer) {
    return false
  }
  return dataTransfer.types.includes('Files') || dataTransfer.files.length > 0
}

function getCurrentIndex(keysLength: number): number {
  if (keysLength === 0) {
    return Infinity
  }
  if (prevIndex >= 0 && prevIndex < keysLength) {
    return prevIndex
  }

  return Math.floor(keysLength / 2)
}

function getTopLevelNodeKeys(editor: LexicalEditor): string[] {
  return editor.read('latest', () => $getRoot().getChildrenKeys())
}

function getInputContentMetrics(
  anchorElem: HTMLElement,
  anchorRect: DOMRect,
  zoomLevel: number,
): { gutterLeft: number; contentLeft: number; contentWidth: number } {
  const input = anchorElem.querySelector('.theme-doc-editor__input')
  if (!(input instanceof HTMLElement)) {
    return {
      gutterLeft: SPACE,
      contentLeft: SPACE,
      contentWidth: anchorRect.width - SPACE * 2,
    }
  }

  const inputRect = input.getBoundingClientRect()
  const view = input.ownerDocument.defaultView
  const paddingLeft = view ? parseFloat(view.getComputedStyle(input).paddingLeft) || 0 : 0
  const contentLeft = (inputRect.left - anchorRect.left) / zoomLevel
  const contentWidth = inputRect.width / zoomLevel
  const gutterLeft = contentLeft + paddingLeft / zoomLevel / 2 - HANDLE_SIZE / 2

  return {
    gutterLeft: Math.max(contentLeft + 2, gutterLeft),
    contentLeft,
    contentWidth,
  }
}

function getDropPlacement(clientY: number, targetBlockElem: HTMLElement): 'before' | 'after' {
  const rect = targetBlockElem.getBoundingClientRect()
  const midY = rect.top + rect.height / 2
  return clientY < midY ? 'before' : 'after'
}

function getCollapsedMargins(elem: HTMLElement): {
  marginTop: number
  marginBottom: number
} {
  const view = elem.ownerDocument.defaultView
  const getMargin = (
    element: Element | null,
    margin: 'marginTop' | 'marginBottom',
  ): number => (element && view ? parseFloat(view.getComputedStyle(element)[margin]) : 0)

  const { marginTop = '0', marginBottom = '0' } = view ? view.getComputedStyle(elem) : {}
  const prevElemSiblingMarginBottom = getMargin(elem.previousElementSibling, 'marginBottom')
  const nextElemSiblingMarginTop = getMargin(elem.nextElementSibling, 'marginTop')
  const collapsedTopMargin = Math.max(parseFloat(marginTop), prevElemSiblingMarginBottom)
  const collapsedBottomMargin = Math.max(parseFloat(marginBottom), nextElemSiblingMarginTop)

  return { marginBottom: collapsedBottomMargin, marginTop: collapsedTopMargin }
}

function getBlockElement(
  anchorElem: HTMLElement,
  editor: LexicalEditor,
  event: MouseEvent,
  useEdgeAsDefault = false,
): HTMLElement | null {
  const anchorElementRect = anchorElem.getBoundingClientRect()
  const topLevelNodeKeys = getTopLevelNodeKeys(editor)

  let blockElem: HTMLElement | null = null

  editor.read('latest', () => {
    if (useEdgeAsDefault) {
      const [firstNode, lastNode] = [
        editor.getElementByKey(topLevelNodeKeys[0]),
        editor.getElementByKey(topLevelNodeKeys[topLevelNodeKeys.length - 1]),
      ]

      const [firstNodeRect, lastNodeRect] = [
        firstNode != null ? firstNode.getBoundingClientRect() : undefined,
        lastNode != null ? lastNode.getBoundingClientRect() : undefined,
      ]

      if (firstNodeRect && lastNodeRect) {
        const firstNodeZoom = calculateZoomLevel(firstNode)
        const lastNodeZoom = calculateZoomLevel(lastNode)
        const clientY = event.clientY
        if (clientY / firstNodeZoom < firstNodeRect.top) {
          blockElem = firstNode
        } else if (clientY / lastNodeZoom > lastNodeRect.bottom) {
          blockElem = lastNode
        }

        if (blockElem) {
          return
        }
      }
    }

    let index = getCurrentIndex(topLevelNodeKeys.length)
    let direction = Indeterminate

    while (index >= 0 && index < topLevelNodeKeys.length) {
      const key = topLevelNodeKeys[index]
      const elem = editor.getElementByKey(key)
      if (elem === null) {
        break
      }
      const zoom = calculateZoomLevel(elem)
      const point = new Point(event.x / zoom, event.y / zoom)
      const domRect = Rectangle.fromDOM(elem)
      const { marginTop, marginBottom } = getCollapsedMargins(elem)
      const rect = domRect.generateNewRect({
        bottom: domRect.bottom + marginBottom,
        left: anchorElementRect.left,
        right: anchorElementRect.right,
        top: domRect.top - marginTop,
      })

      const {
        result,
        reason: { isOnTopSide, isOnBottomSide },
      } = rect.contains(point)

      if (result) {
        blockElem = elem
        prevIndex = index
        break
      }

      if (direction === Indeterminate) {
        if (isOnTopSide) {
          direction = Upward
        } else if (isOnBottomSide) {
          direction = Downward
        } else {
          direction = Infinity
        }
      }

      index += direction
    }
  })

  return blockElem
}

function setMenuPosition(
  targetElem: HTMLElement | null,
  floatingElem: HTMLElement,
  anchorElem: HTMLElement,
  zoomLevel: number,
) {
  if (!targetElem) {
    floatingElem.style.display = 'none'
    return
  }

  const targetRect = targetElem.getBoundingClientRect()
  const targetView = targetElem.ownerDocument.defaultView
  const targetStyle = targetView ? targetView.getComputedStyle(targetElem) : null
  const floatingElemRect = floatingElem.getBoundingClientRect()
  const anchorElementRect = anchorElem.getBoundingClientRect()

  let targetCalculateHeight: number = targetStyle ? parseInt(targetStyle.lineHeight, 10) : NaN
  if (isNaN(targetCalculateHeight)) {
    targetCalculateHeight = targetRect.bottom - targetRect.top
  }
  const top =
    (targetRect.top +
      (targetCalculateHeight - (floatingElemRect.height || targetCalculateHeight)) / 2 -
      anchorElementRect.top +
      anchorElem.scrollTop) /
    zoomLevel

  const left = getInputContentMetrics(anchorElem, anchorElementRect, zoomLevel).gutterLeft

  floatingElem.style.display = 'flex'
  floatingElem.style.opacity = '1'
  floatingElem.style.transform = `translate(${left}px, ${top}px)`
}

function setDragImage(dataTransfer: DataTransfer, draggableBlockElem: HTMLElement) {
  const { transform } = draggableBlockElem.style

  draggableBlockElem.style.transform = 'translateZ(0)'
  dataTransfer.setDragImage(draggableBlockElem, 0, 0)

  setTimeout(() => {
    draggableBlockElem.style.transform = transform
  })
}

function setTargetLine(
  targetLineElem: HTMLElement,
  targetBlockElem: HTMLElement,
  clientY: number,
  anchorElem: HTMLElement,
) {
  const { top: targetBlockElemTop, height: targetBlockElemHeight } =
    targetBlockElem.getBoundingClientRect()
  const { top: anchorTop } = anchorElem.getBoundingClientRect()
  const anchorRect = anchorElem.getBoundingClientRect()
  const zoomLevel = calculateZoomLevel(targetBlockElem)
  const { contentLeft, contentWidth } = getInputContentMetrics(anchorElem, anchorRect, zoomLevel)
  const { marginTop, marginBottom } = getCollapsedMargins(targetBlockElem)
  const placement = getDropPlacement(clientY, targetBlockElem)
  let lineTop = targetBlockElemTop
  if (placement === 'after') {
    lineTop += targetBlockElemHeight + marginBottom / 2
  } else {
    lineTop -= marginTop / 2
  }

  const top = lineTop - anchorTop - TARGET_LINE_HALF_HEIGHT + anchorElem.scrollTop

  targetLineElem.style.transform = `translate(${contentLeft}px, ${top}px)`
  targetLineElem.style.width = `${contentWidth}px`
  targetLineElem.style.opacity = '.4'
}

function hideTargetLine(targetLineElem: HTMLElement | null) {
  if (targetLineElem) {
    targetLineElem.style.opacity = '0'
    targetLineElem.style.transform = 'translate(-10000px, -10000px)'
  }
}

function useDraggableBlockMenu(
  editor: LexicalEditor,
  anchorElem: HTMLElement,
  menuRef: RefObject<HTMLDivElement | null>,
  targetLineRef: RefObject<HTMLDivElement | null>,
  isEditable: boolean,
  menuComponent: ReactNode,
  targetLineComponent: ReactNode,
  isOnMenu: (element: HTMLElement) => boolean,
  onElementChanged?: (element: HTMLElement | null) => void,
): JSX.Element {
  const scrollerElem = getParentElement(anchorElem)

  const isDraggingBlockRef = useRef(false)
  const [draggableBlockElem, setDraggableBlockElemState] = useState<HTMLElement | null>(null)

  const setDraggableBlockElem = useCallback(
    (elem: HTMLElement | null) => {
      setDraggableBlockElemState(elem)
      onElementChanged?.(elem)
    },
    [onElementChanged],
  )

  useEffect(() => {
    function onMouseMove(event: MouseEvent) {
      const target = getComposedEventTarget(event)
      if (!isHTMLElement(target)) {
        setDraggableBlockElem(null)
        return
      }

      if (isOnMenu(target)) {
        return
      }

      const blockElem = getBlockElement(anchorElem, editor, event)
      setDraggableBlockElem(blockElem)
    }

    function onMouseLeave() {
      setDraggableBlockElem(null)
    }

    if (scrollerElem == null) {
      return
    }

    scrollerElem.addEventListener('mousemove', onMouseMove)
    scrollerElem.addEventListener('mouseleave', onMouseLeave)
    return () => {
      scrollerElem.removeEventListener('mousemove', onMouseMove)
      scrollerElem.removeEventListener('mouseleave', onMouseLeave)
    }
  }, [scrollerElem, anchorElem, editor, isOnMenu, setDraggableBlockElem])

  useEffect(() => {
    const zoomLevel = calculateZoomLevel(editor.getRootElement(), true)
    if (menuRef.current) {
      setMenuPosition(draggableBlockElem, menuRef.current, anchorElem, zoomLevel)
    }
  }, [editor, anchorElem, draggableBlockElem, menuRef])

  useEffect(() => {
    function onDragover(event: DragEvent): boolean {
      if (!isDraggingBlockRef.current) {
        return false
      }
      if (isFileTransfer(event)) {
        return false
      }
      const target = getComposedEventTarget(event)
      if (!isHTMLElement(target)) {
        return false
      }
      const targetBlockElem = getBlockElement(anchorElem, editor, event, true)
      const targetLineElem = targetLineRef.current
      if (targetBlockElem === null || targetLineElem === null) {
        return false
      }
      setTargetLine(targetLineElem, targetBlockElem, event.clientY, anchorElem)
      event.preventDefault()
      return true
    }

    function $onDrop(event: DragEvent): boolean {
      if (!isDraggingBlockRef.current) {
        return false
      }
      if (isFileTransfer(event)) {
        return false
      }
      const { dataTransfer, clientY } = event
      const target = getComposedEventTarget(event)
      const dragData = dataTransfer != null ? dataTransfer.getData(DRAG_DATA_FORMAT) : ''
      const draggedNode = $getNodeByKey(dragData)
      if (!draggedNode) {
        return false
      }
      if (!isHTMLElement(target)) {
        return false
      }
      const targetBlockElem = getBlockElement(anchorElem, editor, event, true)
      if (!targetBlockElem) {
        return false
      }
      const targetNode = $getNearestNodeFromDOMNode(targetBlockElem)
      if (!targetNode) {
        return false
      }
      if (targetNode === draggedNode) {
        if (IS_FIREFOX) {
          editor.focus()
        }
        return true
      }
      const placement = getDropPlacement(clientY, targetBlockElem)
      if (placement === 'after') {
        targetNode.insertAfter(draggedNode)
      } else {
        targetNode.insertBefore(draggedNode)
      }
      setDraggableBlockElem(null)

      if (IS_FIREFOX) {
        $onUpdate(() => {
          editor.focus()
        })
      }

      return true
    }

    return mergeRegister(
      editor.registerCommand(DRAGOVER_COMMAND, onDragover, COMMAND_PRIORITY_LOW),
      editor.registerCommand(DROP_COMMAND, $onDrop, COMMAND_PRIORITY_HIGH),
    )
  }, [anchorElem, editor, targetLineRef, setDraggableBlockElem])

  useEffect(() => {
    if (!IS_FIREFOX || !isEditable) {
      return
    }

    return mergeRegister(
      editor.registerRootListener((rootElement) => {
        function onBlur(event: FocusEvent) {
          const relatedTarget = event.relatedTarget
          if (isHTMLElement(relatedTarget) && isOnMenu(relatedTarget)) {
            if (rootElement) {
              rootElement.focus({ preventScroll: true })
            }
            event.stopImmediatePropagation()
          }
        }

        if (rootElement) {
          rootElement.addEventListener('blur', onBlur, true)
          return () => {
            rootElement.removeEventListener('blur', onBlur, true)
          }
        }
      }),
      editor.registerCommand(
        BLUR_COMMAND,
        () => {
          const rootElement = editor.getRootElement()
          const activeElement = getActiveElementDeep(getRootOwnerDocument(rootElement))
          if (rootElement && isHTMLElement(activeElement) && isOnMenu(activeElement)) {
            rootElement.focus({ preventScroll: true })
            return true
          }
          return false
        },
        COMMAND_PRIORITY_HIGH,
      ),
    )
  }, [editor, isEditable, isOnMenu])

  function onDragStart(event: ReactDragEvent<HTMLDivElement>): void {
    const dataTransfer = event.dataTransfer
    if (!dataTransfer || !draggableBlockElem) {
      return
    }

    setDragImage(dataTransfer, draggableBlockElem)
    let nodeKey = ''
    editor.update(() => {
      const node = $getNearestNodeFromDOMNode(draggableBlockElem)
      if (node) {
        nodeKey = node.getKey()
      }
    })
    isDraggingBlockRef.current = true
    dataTransfer.setData(DRAG_DATA_FORMAT, nodeKey)

    if (IS_FIREFOX) {
      const rootElement = editor.getRootElement()
      if (rootElement !== null && getActiveElement(rootElement) !== rootElement) {
        rootElement.focus({ preventScroll: true })
      }
    }
  }

  function onDragEnd(): void {
    isDraggingBlockRef.current = false
    hideTargetLine(targetLineRef.current)

    if (IS_FIREFOX) {
      editor.focus()
    }
  }

  return createPortal(
    <>
      {isEditable ? (
        <div className="theme-doc-editor__draggable-block-host">
          <div draggable onDragStart={onDragStart} onDragEnd={onDragEnd}>
            {menuComponent}
          </div>
        </div>
      ) : null}
      {targetLineComponent}
    </>,
    anchorElem,
  )
}

type DraggableBlockPluginProps = {
  anchorElem?: HTMLElement
  menuRef: RefObject<HTMLDivElement | null>
  targetLineRef: RefObject<HTMLDivElement | null>
  menuComponent: ReactNode
  targetLineComponent: ReactNode
  isOnMenu: (element: HTMLElement) => boolean
  isEditable: boolean
  onElementChanged?: (element: HTMLElement | null) => void
}

export function DraggableBlockPlugin({
  anchorElem = document.body,
  menuRef,
  targetLineRef,
  menuComponent,
  targetLineComponent,
  isOnMenu,
  isEditable,
  onElementChanged,
}: DraggableBlockPluginProps): JSX.Element {
  const [editor] = useLexicalComposerContext()
  return useDraggableBlockMenu(
    editor,
    anchorElem,
    menuRef,
    targetLineRef,
    isEditable,
    menuComponent,
    targetLineComponent,
    isOnMenu,
    onElementChanged,
  )
}

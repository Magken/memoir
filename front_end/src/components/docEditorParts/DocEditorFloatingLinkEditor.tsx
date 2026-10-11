import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type FC,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import { createPortal } from 'react-dom'
import {
  flip,
  offset,
  shift,
  useFloating,
} from '@floating-ui/react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { useLexicalEditable } from '@lexical/react/useLexicalEditable'
import { $isLinkNode, TOGGLE_LINK_COMMAND, type LinkNode } from '@lexical/link'
import { $findMatchingParent } from '@lexical/utils'
import {
  $getSelection,
  $isDecoratorNode,
  $isLineBreakNode,
  $isNodeSelection,
  $isRangeSelection,
  CLICK_COMMAND,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  getDOMSelection,
  mergeRegister,
  SELECTION_CHANGE_COMMAND,
  type LexicalEditor,
  type RangeSelection,
} from 'lexical'
import { Check, ExternalLink, Pencil, Unlink } from 'lucide-react'
import { IconButton } from '../IconButton'
import { Input } from '../Input'
import { resolveThemePortalMount } from '../../lib/theme/themePortal'
import { useDocEditorLinkEdit } from '../../lib/docEditor/docEditorLinkEditContext'
import { getSelectedNode } from '../../lib/docEditor/getSelectedNode'
import { fieldValueToLinkUrl, linkUrlToFieldValue } from '../../lib/docEditor/linkUrl'
import { isPlaceholderLinkUrl } from '../../lib/docEditor/openDocEditorLink'

type DocEditorFloatingLinkEditorProps = {
  anchorElem: HTMLElement
}

const LINK_TOOLTIP_Z = 530

function $getSelectedLinkNode(selection: RangeSelection): LinkNode | null {
  const node = getSelectedNode(selection)
  if ($isLinkNode(node)) {
    return node
  }
  const linkParent = $findMatchingParent(node, $isLinkNode)
  if ($isLinkNode(linkParent)) {
    return linkParent
  }
  if (selection.isCollapsed()) {
    const anchor = selection.anchor
    if (anchor.type === 'text') {
      const anchorNode = anchor.getNode()
      if (anchor.offset === anchorNode.getTextContentSize()) {
        const nextSibling = anchorNode.getNextSibling()
        if ($isLinkNode(nextSibling)) {
          return nextSibling
        }
      }
    }
  }
  return null
}

function $readLinkPanelState(): { isLink: boolean; linkUrl: string } {
  const selection = $getSelection()
  if ($isRangeSelection(selection)) {
    const focusLinkNode = $getSelectedLinkNode(selection)
    if (!focusLinkNode) {
      return { isLink: false, linkUrl: '' }
    }

    const badNode = selection
      .getNodes()
      .filter((node) => !$isLineBreakNode(node))
      .find((node) => {
        const linkNode = $findMatchingParent(node, $isLinkNode)
        return focusLinkNode && linkNode && !linkNode.is(focusLinkNode)
      })

    if (badNode) {
      return { isLink: false, linkUrl: '' }
    }

    return { isLink: true, linkUrl: focusLinkNode.getURL() }
  }

  if ($isNodeSelection(selection)) {
    const node = selection.getNodes()[0]
    if (!node) return { isLink: false, linkUrl: '' }
    const parent = node.getParent()
    if ($isLinkNode(parent)) return { isLink: true, linkUrl: parent.getURL() }
    if ($isLinkNode(node)) return { isLink: true, linkUrl: node.getURL() }
  }

  return { isLink: false, linkUrl: '' }
}

function isScrollInsideLinkTooltip(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest('.theme-doc-editor__link-tooltip'))
}

function isFocusInsideLinkTooltip(): boolean {
  const active = document.activeElement
  return active instanceof Element && Boolean(active.closest('.theme-doc-editor__link-tooltip'))
}

function FloatingLinkEditor({ editor }: { editor: LexicalEditor; anchorElem: HTMLElement }) {
  const { isLinkEditMode, setIsLinkEditMode } = useDocEditorLinkEdit()
  const panelRef = useRef<HTMLDivElement>(null)
  const anchorRectRef = useRef<DOMRect | null>(null)
  const isLinkEditModeRef = useRef(false)
  const [isLink, setIsLink] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [editedLinkUrl, setEditedLinkUrl] = useState('')
  const [linkPanelSuppressed, setLinkPanelSuppressed] = useState(false)
  const [portalThemeStyle, setPortalThemeStyle] = useState<CSSProperties>({})

  isLinkEditModeRef.current = isLinkEditMode

  const showViewPanel =
    isLink &&
    !isLinkEditMode &&
    !linkPanelSuppressed &&
    linkUrl.length > 0 &&
    !isPlaceholderLinkUrl(linkUrl)
  const showEditPanel = isLinkEditMode
  const showPanel = showEditPanel || showViewPanel

  const { refs, floatingStyles, update } = useFloating({
    middleware: [
      offset(10),
      flip({ padding: 10 }),
      shift({ padding: 10 }),
    ],
    placement: 'bottom-start',
    strategy: 'fixed',
  })

  const applyFrozenAnchor = useCallback(() => {
    if (!anchorRectRef.current) return
    const savedRect = anchorRectRef.current
    refs.setPositionReference({
      getBoundingClientRect: () => savedRect,
      getClientRects: () => [savedRect],
    })
    void update()
  }, [refs, update])

  const positionLinkEditor = useCallback(() => {
    const rootElement = editor.getRootElement()
    if (rootElement === null || !editor.isEditable()) {
      return
    }

    editor.read('latest', () => {
      const selection = $getSelection()
      if (selection === null) return

      const nativeSelection = getDOMSelection(editor._window)
      let referenceElement: Element | null = null

      if ($isNodeSelection(selection)) {
        const nodes = selection.getNodes()
        if (nodes.length > 0) {
          referenceElement = editor.getElementByKey(nodes[0]!.getKey())
        }
      } else if ($isRangeSelection(selection) && nativeSelection !== null && nativeSelection.rangeCount > 0) {
        const linkNode = $getSelectedLinkNode(selection)
        if (linkNode) {
          const onlyChild = linkNode.getChildrenSize() === 1 ? linkNode.getFirstChild() : null
          referenceElement =
            onlyChild && $isDecoratorNode(onlyChild)
              ? editor.getElementByKey(onlyChild.getKey())
              : editor.getElementByKey(linkNode.getKey())
        }
      }

      if (referenceElement) {
        anchorRectRef.current = referenceElement.getBoundingClientRect()
        applyFrozenAnchor()
        return
      }

      if (nativeSelection !== null && nativeSelection.rangeCount > 0) {
        const range = nativeSelection.getRangeAt(0)
        const anchorNode = range.startContainer
        if (rootElement.contains(anchorNode)) {
          anchorRectRef.current = range.getBoundingClientRect()
          applyFrozenAnchor()
          return
        }
      }

      if (anchorRectRef.current) {
        applyFrozenAnchor()
      }
    })
  }, [editor, applyFrozenAnchor])

  const syncLinkPanelState = useCallback(() => {
    editor.getEditorState().read(() => {
      const next = $readLinkPanelState()
      setIsLink(next.isLink)
      setLinkUrl(next.linkUrl)
      if (isLinkEditModeRef.current) {
        setEditedLinkUrl(linkUrlToFieldValue(next.linkUrl))
      }
    })
  }, [editor])

  const removePlaceholderLink = useCallback(() => {
    editor.update(() => {
      const selection = $getSelection()
      if (!$isRangeSelection(selection)) return
      const linkNode = $getSelectedLinkNode(selection)
      if (linkNode && isPlaceholderLinkUrl(linkNode.getURL())) {
        editor.dispatchCommand(TOGGLE_LINK_COMMAND, null)
      }
    })
  }, [editor])

  const closeLinkPanel = useCallback(() => {
    anchorRectRef.current = null
    removePlaceholderLink()
    setIsLinkEditMode(false)
    setLinkPanelSuppressed(true)
  }, [removePlaceholderLink, setIsLinkEditMode])

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          const next = $readLinkPanelState()
          setIsLink(next.isLink)
          setLinkUrl(next.linkUrl)
          if (isLinkEditModeRef.current) {
            setEditedLinkUrl(linkUrlToFieldValue(next.linkUrl))
          }
        })

        if (isLinkEditModeRef.current && anchorRectRef.current) return
        editorState.read(() => {
          positionLinkEditor()
        })
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          setLinkPanelSuppressed(false)
          editor.read('latest', () => {
            const next = $readLinkPanelState()
            setIsLink(next.isLink)
            setLinkUrl(next.linkUrl)
          })
          if (isLinkEditModeRef.current && anchorRectRef.current) return false
          editor.read('latest', () => {
            positionLinkEditor()
          })
          return false
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        CLICK_COMMAND,
        (payload) => {
          const target = payload.target
          if (!(target instanceof Node)) return false
          const rootElement = editor.getRootElement()
          if (!rootElement?.contains(target)) return false

          const linkEl =
            target instanceof Element
              ? (target.closest('a[href]') as HTMLAnchorElement | null)
              : null
          if (!linkEl || !rootElement.contains(linkEl)) return false

          const hrefAttr = linkEl.getAttribute('href') ?? ''
          if (!hrefAttr || isPlaceholderLinkUrl(hrefAttr)) return false

          if (payload.metaKey || payload.ctrlKey) {
            window.open(linkEl.href, '_blank', 'noopener,noreferrer')
            return true
          }

          setLinkPanelSuppressed(false)
          setIsLinkEditMode(false)
          anchorRectRef.current = linkEl.getBoundingClientRect()
          requestAnimationFrame(() => {
            applyFrozenAnchor()
            editor.getEditorState().read(() => {
              const next = $readLinkPanelState()
              setIsLink(next.isLink)
              setLinkUrl(next.linkUrl || hrefAttr)
            })
          })
          return true
        },
        COMMAND_PRIORITY_HIGH,
      ),
    )
  }, [editor, positionLinkEditor, setIsLinkEditMode, applyFrozenAnchor])

  useLayoutEffect(() => {
    if (!showEditPanel) return
    syncLinkPanelState()
    positionLinkEditor()
    const frame = requestAnimationFrame(() => {
      positionLinkEditor()
      const input = panelRef.current?.querySelector<HTMLInputElement>(
        '.theme-doc-editor__link-tooltip-field .theme-field__control',
      )
      input?.focus()
      input?.select()
    })
    return () => cancelAnimationFrame(frame)
  }, [showEditPanel, syncLinkPanelState, positionLinkEditor])

  useLayoutEffect(() => {
    if (!showViewPanel) return
    positionLinkEditor()
  }, [showViewPanel, linkUrl, positionLinkEditor])

  useEffect(() => {
    if (!showPanel) return

    const hideOnScroll = (event: Event) => {
      if (isScrollInsideLinkTooltip(event.target)) return
      closeLinkPanel()
    }

    window.addEventListener('scroll', hideOnScroll, true)
    window.addEventListener('resize', hideOnScroll)
    return () => {
      window.removeEventListener('scroll', hideOnScroll, true)
      window.removeEventListener('resize', hideOnScroll)
    }
  }, [showPanel, closeLinkPanel])

  useEffect(() => {
    if (!showPanel) return

    const onPointerDown = (event: globalThis.MouseEvent) => {
      if (panelRef.current?.contains(event.target as Node)) return
      if (isFocusInsideLinkTooltip()) return
      closeLinkPanel()
    }

    document.addEventListener('mousedown', onPointerDown, true)
    return () => document.removeEventListener('mousedown', onPointerDown, true)
  }, [showPanel, closeLinkPanel])

  const confirmLink = useCallback(
    (event: KeyboardEvent<HTMLInputElement> | ReactMouseEvent<HTMLButtonElement>) => {
      event.preventDefault()
      const href = fieldValueToLinkUrl(editedLinkUrl)
      if (!href) return

      editor.update(() => {
        editor.dispatchCommand(TOGGLE_LINK_COMMAND, href)
      })
      setIsLinkEditMode(false)
    },
    [editedLinkUrl, editor, setIsLinkEditMode],
  )

  const removeLink = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>) => {
      event.preventDefault()
      editor.update(() => {
        editor.dispatchCommand(TOGGLE_LINK_COMMAND, null)
      })
      setIsLinkEditMode(false)
    },
    [editor, setIsLinkEditMode],
  )

  const openInNewTab = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>) => {
      event.preventDefault()
      if (!linkUrl) return
      window.open(linkUrl, '_blank', 'noopener,noreferrer')
    },
    [linkUrl],
  )

  const startEdit = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>) => {
      event.preventDefault()
      setEditedLinkUrl(linkUrlToFieldValue(linkUrl))
      setIsLinkEditMode(true)
    },
    [linkUrl, setIsLinkEditMode],
  )

  useLayoutEffect(() => {
    if (!showPanel) return
    setPortalThemeStyle(resolveThemePortalMount(null).wrapStyle)
  }, [showPanel])

  if (!showPanel) return null

  const panel = (
    <div
      ref={(element) => {
        panelRef.current = element
        refs.setFloating(element)
      }}
      className="theme-tooltip-portal-host theme-tooltip-portal-host--interactive"
      style={{
        ...floatingStyles,
        zIndex: LINK_TOOLTIP_Z,
      }}
      onMouseDown={(event) => {
        event.preventDefault()
      }}
    >
      <div
        role="dialog"
        aria-label={showEditPanel ? 'Edit link URL' : 'Link actions'}
        className="theme-tooltip theme-tooltip--interactive theme-tooltip--bottom theme-tooltip--visible theme-doc-editor__link-tooltip"
      >
        <div className="theme-tooltip__content theme-tooltip__content--interactive theme-doc-editor__link-tooltip-body">
          {showEditPanel ? (
            <>
              <Input
                size="xs"
                shadowless
                prefixLayout="wide"
                prefix={<span className="type-caption type-muted">https://</span>}
                placeholder="yoursite.com"
                value={editedLinkUrl}
                onChange={(event) => setEditedLinkUrl(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    confirmLink(event)
                  }
                  if (event.key === 'Escape') {
                    event.preventDefault()
                    closeLinkPanel()
                  }
                }}
                className="theme-doc-editor__link-tooltip-field min-w-0"
                aria-label="Link URL"
              />
              <div className="theme-doc-editor__link-tooltip-actions">
                <IconButton
                  icon={Check}
                  aria-label="Confirm link"
                  size="xs"
                  variant="ghost"
                  disabled={!editedLinkUrl.trim()}
                  onClick={confirmLink}
                />
                <IconButton
                  icon={Unlink}
                  aria-label="Remove link"
                  size="xs"
                  variant="ghost"
                  onClick={removeLink}
                />
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                className="theme-doc-editor__link-tooltip-url type-caption"
                title={linkUrl}
                onClick={openInNewTab}
              >
                {linkUrl}
              </button>
              <div className="theme-doc-editor__link-tooltip-actions">
                <IconButton
                  icon={Pencil}
                  aria-label="Edit link"
                  size="xs"
                  variant="ghost"
                  onClick={startEdit}
                />
                <IconButton
                  icon={ExternalLink}
                  aria-label="Open link in new tab"
                  size="xs"
                  variant="ghost"
                  onClick={openInNewTab}
                />
                <IconButton
                  icon={Unlink}
                  aria-label="Remove link"
                  size="xs"
                  variant="ghost"
                  onClick={removeLink}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(
    <div className="theme" style={portalThemeStyle}>
      {panel}
    </div>,
    document.body,
  )
}

export const DocEditorFloatingLinkEditor: FC<DocEditorFloatingLinkEditorProps> =
  function DocEditorFloatingLinkEditor({ anchorElem }) {
    const [editor] = useLexicalComposerContext()
    const isEditable = useLexicalEditable()
    if (!isEditable) return null
    return <FloatingLinkEditor editor={editor} anchorElem={anchorElem} />
  }

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type FC,
} from 'react'
import { createPortal } from 'react-dom'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { useLexicalEditable } from '@lexical/react/useLexicalEditable'
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  FORMAT_TEXT_COMMAND,
  getDOMSelection,
  mergeRegister,
  SELECTION_CHANGE_COMMAND,
  type TextFormatType,
} from 'lexical'
import { $isLinkNode } from '@lexical/link'
import {
  Bold,
  Code,
  Italic,
  Link2,
  Strikethrough,
  Subscript,
  Superscript,
  Underline,
  type LucideIcon,
} from 'lucide-react'
import { IconButton } from '../IconButton'
import { ToolbarControlTray } from '../ToolbarControlTray'
import { useDocEditorLinkEdit } from '../../lib/docEditor/docEditorLinkEditContext'
import { openDocEditorLinkEdit } from '../../lib/docEditor/openDocEditorLink'
import { resolveThemePortalMount } from '../../lib/theme/themePortal'

const VIEWPORT_EDGE = 4
const TOOLBAR_GAP_PX = 8

function isScrollInsideLinkTooltip(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest('.theme-doc-editor__link-tooltip'))
}

type FormatAction = {
  id: string
  format?: TextFormatType
  icon: LucideIcon
  label: string
  active: boolean
  onClick?: () => void
}

function getSelectionRect(): DOMRect | null {
  const native = getDOMSelection(window)
  if (!native || native.rangeCount === 0 || native.isCollapsed) return null
  const range = native.getRangeAt(0)
  const rect = range.getBoundingClientRect()
  if (rect.width === 0 && rect.height === 0) {
    const rects = range.getClientRects()
    if (rects.length > 0) return rects[0]!
  }
  return rect
}

function FloatingToolbarInner() {
  const [editor] = useLexicalComposerContext()
  const { isLinkEditMode, setIsLinkEditMode } = useDocEditorLinkEdit()
  const hostRef = useRef<HTMLDivElement>(null)
  const trayRef = useRef<HTMLDivElement>(null)
  const panelWidthRef = useRef(0)
  const scrollHiddenRef = useRef(false)
  const [visible, setVisible] = useState(false)
  const [isBold, setIsBold] = useState(false)
  const [isItalic, setIsItalic] = useState(false)
  const [isUnderline, setIsUnderline] = useState(false)
  const [isStrikethrough, setIsStrikethrough] = useState(false)
  const [isCode, setIsCode] = useState(false)
  const [isSubscript, setIsSubscript] = useState(false)
  const [isSuperscript, setIsSuperscript] = useState(false)
  const [isLink, setIsLink] = useState(false)
  const [portalThemeStyle, setPortalThemeStyle] = useState<CSSProperties>({})

  const positionToolbar = useCallback(() => {
    const host = hostRef.current
    const tray = trayRef.current
    const rect = getSelectionRect()
    if (!host || !tray || !rect) return false

    const panelWidth = tray.offsetWidth
    if (panelWidth > 0) panelWidthRef.current = panelWidth
    const width = panelWidth || panelWidthRef.current
    if (!width) return false

    let left = rect.left + rect.width / 2 - width / 2
    let top = rect.top - tray.offsetHeight - TOOLBAR_GAP_PX

    if (left < VIEWPORT_EDGE) left = VIEWPORT_EDGE
    if (left + width > window.innerWidth - VIEWPORT_EDGE) {
      left = window.innerWidth - width - VIEWPORT_EDGE
    }

    if (top < VIEWPORT_EDGE) {
      top = rect.bottom + TOOLBAR_GAP_PX
    }

    host.style.top = `${top}px`
    host.style.left = `${left}px`
    host.style.opacity = '1'
    host.style.pointerEvents = 'auto'
    return true
  }, [])

  const updateToolbar = useCallback(() => {
    if (scrollHiddenRef.current) return

    const selection = $getSelection()
    if (!$isRangeSelection(selection) || selection.isCollapsed()) {
      setVisible(false)
      return
    }

    setIsBold(selection.hasFormat('bold'))
    setIsItalic(selection.hasFormat('italic'))
    setIsUnderline(selection.hasFormat('underline'))
    setIsStrikethrough(selection.hasFormat('strikethrough'))
    setIsCode(selection.hasFormat('code'))
    setIsSubscript(selection.hasFormat('subscript'))
    setIsSuperscript(selection.hasFormat('superscript'))

    const node = selection.anchor.getNode()
    const parent = node.getParent()
    setIsLink($isLinkNode(parent) || $isLinkNode(node))

    setVisible(true)
  }, [])

  useEffect(() => {
    const unregister = mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => updateToolbar())
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          scrollHiddenRef.current = false
          editor.read('latest', () => updateToolbar())
          return false
        },
        COMMAND_PRIORITY_LOW,
      ),
    )
    return unregister
  }, [editor, updateToolbar])

  useLayoutEffect(() => {
    if (!visible) return
    setPortalThemeStyle(resolveThemePortalMount(null).wrapStyle)
  }, [visible])

  useLayoutEffect(() => {
    if (!visible) return

    const host = hostRef.current
    if (host) {
      host.style.opacity = '0'
      host.style.pointerEvents = 'none'
    }

    let frame = 0
    const tryPosition = () => {
      if (positionToolbar()) return
      frame = requestAnimationFrame(tryPosition)
    }
    frame = requestAnimationFrame(tryPosition)

    return () => cancelAnimationFrame(frame)
  }, [visible, positionToolbar])

  useEffect(() => {
    if (!visible && !isLinkEditMode) return

    const hideOnScroll = (event: Event) => {
      if (isScrollInsideLinkTooltip(event.target)) return
      scrollHiddenRef.current = true
      setVisible(false)
      setIsLinkEditMode(false)
    }

    window.addEventListener('scroll', hideOnScroll, true)
    window.addEventListener('resize', hideOnScroll)
    return () => {
      window.removeEventListener('scroll', hideOnScroll, true)
      window.removeEventListener('resize', hideOnScroll)
    }
  }, [visible, isLinkEditMode, setIsLinkEditMode])

  const formatText = (format: TextFormatType) => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format)
  }

  const formatActions: FormatAction[] = [
    { id: 'bold', format: 'bold', icon: Bold, label: 'Bold', active: isBold },
    { id: 'italic', format: 'italic', icon: Italic, label: 'Italic', active: isItalic },
    { id: 'underline', format: 'underline', icon: Underline, label: 'Underline', active: isUnderline },
    {
      id: 'strikethrough',
      format: 'strikethrough',
      icon: Strikethrough,
      label: 'Strikethrough',
      active: isStrikethrough,
    },
    { id: 'code', format: 'code', icon: Code, label: 'Code', active: isCode },
    { id: 'subscript', format: 'subscript', icon: Subscript, label: 'Subscript', active: isSubscript },
    {
      id: 'superscript',
      format: 'superscript',
      icon: Superscript,
      label: 'Superscript',
      active: isSuperscript,
    },
    {
      id: 'link',
      icon: Link2,
      label: 'Insert link',
      active: isLinkEditMode || isLink,
      onClick: () => openDocEditorLinkEdit(editor, isLink, setIsLinkEditMode),
    },
  ]

  if (!visible) return null

  const portalHostStyle: CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    zIndex: 520,
    pointerEvents: 'none',
    opacity: 0,
  }

  const host = (
    <div ref={hostRef} style={portalHostStyle}>
      <div
        ref={trayRef}
        className="theme-doc-editor__floating-toolbar-stack"
        onMouseDown={(event) => {
          event.preventDefault()
        }}
      >
        <div role="toolbar" aria-label="Text formatting">
          <ToolbarControlTray border="tooltip">
            {formatActions.map((action) => (
              <IconButton
                key={action.id}
                icon={action.icon}
                aria-label={action.label}
                aria-pressed={action.active}
                size="xs"
                variant="ghost"
                active={action.active}
                onClick={() => {
                  if (action.onClick) action.onClick()
                  else if (action.format) formatText(action.format)
                }}
              />
            ))}
          </ToolbarControlTray>
        </div>
      </div>
    </div>
  )

  return createPortal(
    <div className="theme" style={portalThemeStyle}>
      {host}
    </div>,
    document.body,
  )
}

export const DocEditorFloatingToolbar: FC = function DocEditorFloatingToolbar() {
  const isEditable = useLexicalEditable()
  if (!isEditable) return null
  return <FloatingToolbarInner />
}

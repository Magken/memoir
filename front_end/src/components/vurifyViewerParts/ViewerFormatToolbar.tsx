import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { createPortal } from 'react-dom'
import { Bold, CaseSensitive, Italic, Underline, type LucideIcon } from 'lucide-react'
import { IconButton } from '../IconButton'
import { ToolbarControlTray } from '../ToolbarControlTray'
import { applyToActiveControl, type MarkKind } from './formatMarks'

const VIEWPORT_EDGE = 4
const TOOLBAR_GAP_PX = 8

function activeViewerControl(): HTMLElement | null {
  const el = document.activeElement
  if (!(el instanceof HTMLElement)) return null
  if (!el.closest('.theme-vurify-viewer[data-editable="true"]')) return null
  if (el.isContentEditable) return el
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return el
  return null
}

function hasTextSelection(el: HTMLElement): boolean {
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    return (
      el.selectionStart != null &&
      el.selectionEnd != null &&
      el.selectionStart !== el.selectionEnd
    )
  }
  if (!el.isContentEditable) return false
  const sel = window.getSelection()
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return false
  const node = sel.anchorNode
  return Boolean(node && el.contains(node))
}

type Action = {
  id: string
  icon: LucideIcon
  label: string
  onClick: () => void
}

/**
 * Additive emphasis tray — Bold / Italic / Underline / Caps only.
 * Never changes document slot roles.
 */
export function ViewerFormatToolbar() {
  const hostRef = useRef<HTMLDivElement>(null)
  const trayRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })

  const reposition = useCallback(() => {
    const el = activeViewerControl()
    if (!el || !hasTextSelection(el)) {
      setVisible(false)
      return
    }
    const rect = el.getBoundingClientRect()
    const tray = trayRef.current
    const width = tray?.offsetWidth || 180
    const height = tray?.offsetHeight || 36
    let left = rect.left + rect.width / 2 - width / 2
    let top = rect.top - height - TOOLBAR_GAP_PX
    if (left < VIEWPORT_EDGE) left = VIEWPORT_EDGE
    if (left + width > window.innerWidth - VIEWPORT_EDGE) {
      left = window.innerWidth - VIEWPORT_EDGE - width
    }
    if (top < VIEWPORT_EDGE) top = rect.bottom + TOOLBAR_GAP_PX
    setCoords({ top, left })
    setVisible(true)
  }, [])

  useEffect(() => {
    const onMaybeShow = () => {
      requestAnimationFrame(reposition)
    }
    document.addEventListener('selectionchange', onMaybeShow)
    document.addEventListener('keyup', onMaybeShow)
    document.addEventListener('mouseup', onMaybeShow)
    const hide = () => setVisible(false)
    window.addEventListener('scroll', hide, true)
    window.addEventListener('resize', hide)
    return () => {
      document.removeEventListener('selectionchange', onMaybeShow)
      document.removeEventListener('keyup', onMaybeShow)
      document.removeEventListener('mouseup', onMaybeShow)
      window.removeEventListener('scroll', hide, true)
      window.removeEventListener('resize', hide)
    }
  }, [reposition])

  useLayoutEffect(() => {
    if (visible) reposition()
  }, [visible, reposition])

  if (!visible) return null

  const run = (kind: MarkKind | 'caps') => {
    applyToActiveControl(kind)
    requestAnimationFrame(reposition)
  }

  const actions: Action[] = [
    { id: 'bold', icon: Bold, label: 'Bold', onClick: () => run('bold') },
    { id: 'italic', icon: Italic, label: 'Italic', onClick: () => run('italic') },
    { id: 'underline', icon: Underline, label: 'Underline', onClick: () => run('underline') },
    { id: 'caps', icon: CaseSensitive, label: 'Uppercase selection', onClick: () => run('caps') },
  ]

  const portalHostStyle: CSSProperties = {
    position: 'fixed',
    top: coords.top,
    left: coords.left,
    zIndex: 520,
  }

  const host = (
    <div ref={hostRef} style={portalHostStyle}>
      <div
        ref={trayRef}
        className="theme-vurify-viewer__format-tray theme-doc-editor__floating-toolbar-stack"
        onMouseDown={(e) => e.preventDefault()}
      >
        <ToolbarControlTray border="tooltip" density="compact">
          {actions.map((action) => (
            <IconButton
              key={action.id}
              icon={action.icon}
              size="xs"
              variant="ghost"
              aria-label={action.label}
              onClick={action.onClick}
            />
          ))}
        </ToolbarControlTray>
      </div>
    </div>
  )

  return createPortal(<div className="theme">{host}</div>, document.body)
}

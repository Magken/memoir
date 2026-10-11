import { Check, Link2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { IconButton } from '../IconButton'
import { Input } from '../Input'
import { Modal } from '../Modal'

type DrawCanvasLinkEditorProps = {
  open: boolean
  initialUrl?: string
  onClose: () => void
  onApply: (url: string) => void
}

/** DocEditor-style link field — shadowless Input inside raised Modal. */
export function DrawCanvasLinkEditor({
  open,
  initialUrl = '',
  onClose,
  onApply,
}: DrawCanvasLinkEditorProps) {
  const [url, setUrl] = useState(initialUrl)

  useEffect(() => {
    if (open) setUrl(initialUrl)
  }, [open, initialUrl])

  return (
    <Modal
      open={open}
      title="Hyperlink"
      onClose={onClose}
      placement="container"
      size="sm"
      onConfirm={() => {
        onApply(url.trim())
        onClose()
      }}
      confirmLabel="Apply"
      confirmDisabled={!url.trim()}
    >
      <div className="theme-draw-canvas__link-editor">
        <div className="theme-draw-canvas__link-editor-row">
          <Link2 className="theme-draw-canvas__link-editor-icon" aria-hidden />
          <Input
            size="xs"
            shadowless
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://"
            aria-label="Link URL"
            className="theme-draw-canvas__link-editor-field"
          />
          <IconButton
            icon={Check}
            aria-label="Apply link"
            size="xs"
            variant="ghost"
            disabled={!url.trim()}
            onClick={() => {
              onApply(url.trim())
              onClose()
            }}
          />
        </div>
        <p className="type-caption type-muted">Applies a URL to the selected element(s).</p>
      </div>
    </Modal>
  )
}

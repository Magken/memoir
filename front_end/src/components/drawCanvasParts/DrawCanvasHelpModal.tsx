import { Modal } from '../Modal'
import { DRAW_HELP_SHORTCUTS } from '../../lib/drawCanvas/shortcuts'

type DrawCanvasHelpModalProps = {
  open: boolean
  onClose: () => void
}

export function DrawCanvasHelpModal({ open, onClose }: DrawCanvasHelpModalProps) {
  return (
    <Modal open={open} title="Keyboard shortcuts" onClose={onClose} size="md" placement="container">
      <div className="theme-draw-canvas__help-grid">
        {DRAW_HELP_SHORTCUTS.map((section) => (
          <div key={section.title}>
            <div className="theme-draw-canvas__help-section-title">{section.title}</div>
            {section.rows.map(([label, keys]) => (
              <div key={label} className="theme-draw-canvas__help-row">
                <span>{label}</span>
                <span className="theme-draw-canvas__help-keys">{keys}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </Modal>
  )
}

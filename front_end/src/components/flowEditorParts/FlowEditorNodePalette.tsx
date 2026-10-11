import { useMemo, useState, type DragEvent } from 'react'
import { X } from 'lucide-react'
import { IconButton } from '../IconButton'
import { SearchInput } from '../SearchInput'
import { Tag } from '../Tag'
import { ThemeScroll } from '../ThemeScroll'
import { listFlowElements, listPaletteSections } from '../../lib/flowEditor/flowElementRegistry'
import { useFlowEditorUi } from '../../lib/flowEditor/FlowEditorUiContext'

const DND_MIME = 'application/reactflow'

type FlowEditorNodePaletteProps = {
  onAddKind: (kind: string) => void
  onClose: () => void
}

export function FlowEditorNodePalette({ onAddKind, onClose }: FlowEditorNodePaletteProps) {
  const { toolkit } = useFlowEditorUi()
  const sections = listPaletteSections(toolkit)
  const elements = listFlowElements(toolkit)
  const [query, setQuery] = useState('')

  const normalized = query.trim().toLowerCase()

  const filteredBySection = useMemo(() => {
    const match = (label: string, kind: string, section: string) => {
      if (!normalized) return true
      return (
        label.toLowerCase().includes(normalized) ||
        kind.toLowerCase().includes(normalized) ||
        section.toLowerCase().includes(normalized)
      )
    }
    return sections
      .map((section) => ({
        section,
        items: elements.filter(
          (el) => el.paletteSection === section && match(el.label, el.kind, el.paletteSection),
        ),
      }))
      .filter((group) => group.items.length > 0)
  }, [elements, normalized, sections])

  const onDragStart = (event: DragEvent, kind: string) => {
    event.dataTransfer.setData(DND_MIME, kind)
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <aside className="theme-flow-editor__palette" aria-label="Node palette">
      <div className="theme-flow-editor__palette-head">
        <div className="theme-flow-editor__palette-search">
          <SearchInput
            size="xs"
            shape="pill"
            shadowless
            placeholder="Search nodes…"
            value={query}
            onValueChange={setQuery}
            ariaLabel="Search nodes"
          />
        </div>
        <IconButton
          icon={X}
          aria-label="Close palette"
          size="xs"
          variant="ghost"
          className="theme-flow-editor__palette-close"
          onClick={onClose}
        />
      </div>
      <ThemeScroll axis="vertical" rail="nano" className="theme-flow-editor__palette-scroll">
        <div className="theme-flow-editor__palette-sections">
          {filteredBySection.length === 0 ? (
            <p className="theme-flow-editor__palette-empty type-caption type-muted">No matches</p>
          ) : (
            filteredBySection.map(({ section, items }) => (
              <div key={section} className="theme-flow-editor__palette-section">
                <p className="theme-flow-editor__palette-section-label type-caption type-accent">{section}</p>
                <ul className="theme-flow-editor__palette-list">
                  {items.map((el) => {
                    const Icon = el.icon
                    return (
                      <li key={el.kind}>
                        <button
                          type="button"
                          className="theme-flow-editor__palette-item theme-card theme-card--ghost"
                          draggable
                          onDragStart={(e) => onDragStart(e, el.kind)}
                          onClick={() => onAddKind(el.kind)}
                        >
                          <span className="theme-flow-editor__palette-item-icon" aria-hidden>
                            {Icon ? <Icon size={14} strokeWidth={2} /> : null}
                          </span>
                          <span className="theme-flow-editor__palette-item-copy">
                            <span className="theme-flow-editor__palette-item-label type-label">{el.label}</span>
                            <span className="theme-flow-editor__palette-item-tag-slot">
                              <span className="theme-flow-editor__palette-item-tag-clip">
                                <Tag size="xs" className="theme-flow-editor__palette-item-tag">
                                  {el.category}
                                </Tag>
                              </span>
                            </span>
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))
          )}
        </div>
      </ThemeScroll>
    </aside>
  )
}

export const FLOW_DND_MIME = DND_MIME

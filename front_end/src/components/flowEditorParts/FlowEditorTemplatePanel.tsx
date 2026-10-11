import { useMemo, useState, type DragEvent } from 'react'
import { Layers, X } from 'lucide-react'
import { IconButton } from '../IconButton'
import { SearchInput } from '../SearchInput'
import { Tag } from '../Tag'
import { ThemeScroll } from '../ThemeScroll'
import { WireframePreview } from '../WireframePreview'
import {
  listFlowTemplates,
  listFlowTemplateSections,
  type FlowTemplateDef,
  type FlowTemplateId,
} from '../../lib/flowEditor/flowTemplateCatalog'
import { useFlowEditorUi } from '../../lib/flowEditor/FlowEditorUiContext'

/** MIME for dragging grouped-pipeline templates onto the canvas. */
export const FLOW_TEMPLATE_DND_MIME = 'application/x-flow-template'

type FlowEditorTemplatePanelProps = {
  onInsertTemplate: (id: FlowTemplateId) => void
  onClose: () => void
}

function TemplateCard({
  template,
  onInsert,
}: {
  template: FlowTemplateDef
  onInsert: () => void
}) {
  const nodeCount = template.document.nodes.length
  const groupCount = template.document.groups?.length ?? 0

  const onDragStart = (event: DragEvent) => {
    event.dataTransfer.setData(FLOW_TEMPLATE_DND_MIME, template.id)
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <li>
      <button
        type="button"
        className="theme-flow-editor__template-card theme-card theme-card--ghost"
        draggable
        onDragStart={onDragStart}
        onClick={onInsert}
      >
        <div className="theme-flow-editor__template-card-preview">
          <WireframePreview layout={template.wireframe} thumb />
        </div>
        <div className="theme-flow-editor__template-card-body">
          <div className="theme-flow-editor__template-card-topline">
            <p className="theme-flow-editor__template-card-title type-label">{template.label}</p>
            <span className="theme-flow-editor__template-card-count type-caption type-muted">
              {nodeCount} nodes
              {groupCount ? ` · ${groupCount} group${groupCount > 1 ? 's' : ''}` : ''}
            </span>
          </div>
          <div className="theme-flow-editor__template-card-details">
            <div className="theme-flow-editor__template-card-details-clip">
              <p className="theme-flow-editor__template-card-desc type-caption type-muted">
                {template.description}
              </p>
              <div className="theme-flow-editor__template-card-tags">
                {template.tags.map((tag) => (
                  <Tag key={tag} size="xs">
                    {tag}
                  </Tag>
                ))}
              </div>
            </div>
          </div>
        </div>
      </button>
    </li>
  )
}

export function FlowEditorTemplatePanel({ onInsertTemplate, onClose }: FlowEditorTemplatePanelProps) {
  const { toolkit } = useFlowEditorUi()
  const sections = listFlowTemplateSections(toolkit)
  const templates = listFlowTemplates(toolkit)
  const [query, setQuery] = useState('')
  const normalized = query.trim().toLowerCase()

  const filteredBySection = useMemo(() => {
    const match = (t: FlowTemplateDef) => {
      if (!normalized) return true
      return (
        t.label.toLowerCase().includes(normalized) ||
        t.description.toLowerCase().includes(normalized) ||
        t.section.toLowerCase().includes(normalized) ||
        t.tags.some((tag) => tag.toLowerCase().includes(normalized)) ||
        t.id.toLowerCase().includes(normalized)
      )
    }
    return sections
      .map((section) => ({
        section,
        items: templates.filter((t) => t.section === section && match(t)),
      }))
      .filter((g) => g.items.length > 0)
  }, [normalized, sections, templates])

  return (
    <aside className="theme-flow-editor__templates" aria-label="Flow templates">
      <div className="theme-flow-editor__palette-head">
        <div className="theme-flow-editor__palette-search">
          <SearchInput
            size="xs"
            shape="pill"
            shadowless
            placeholder="Search templates…"
            value={query}
            onValueChange={setQuery}
            ariaLabel="Search templates"
          />
        </div>
        <IconButton
          icon={X}
          aria-label="Close templates"
          size="xs"
          variant="ghost"
          className="theme-flow-editor__palette-close"
          onClick={onClose}
        />
      </div>
      <ThemeScroll axis="vertical" rail="nano" className="theme-flow-editor__palette-scroll">
        <div className="theme-flow-editor__template-sections">
          {filteredBySection.length === 0 ? (
            <p className="theme-flow-editor__palette-empty type-caption type-muted">No matches</p>
          ) : (
            filteredBySection.map(({ section, items }) => (
              <div key={section} className="theme-flow-editor__palette-section">
                <p className="theme-flow-editor__palette-section-label type-caption type-accent">
                  <Layers
                    size={10}
                    strokeWidth={2}
                    aria-hidden
                    className="theme-flow-editor__template-section-icon"
                  />
                  {section}
                </p>
                <ul className="theme-flow-editor__template-list">
                  {items.map((t) => (
                    <TemplateCard
                      key={t.id}
                      template={t}
                      onInsert={() => onInsertTemplate(t.id)}
                    />
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      </ThemeScroll>
    </aside>
  )
}

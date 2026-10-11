import type { CvSectionKind } from '../../lib/cvApi'
import { CV_SECTION_KINDS, SECTION_KIND_LABELS } from './types'

type SectionTemplateProps = {
  onPick: (kind: CvSectionKind) => void
  onCancel: () => void
}

export function SectionTemplate({ onPick, onCancel }: SectionTemplateProps) {
  return (
    <div className="theme-vurify-viewer__template" role="dialog" aria-label="Choose section type">
      <p className="type-label mb-3">Choose a section type</p>
      <div className="theme-vurify-viewer__template-grid">
        {CV_SECTION_KINDS.map((kind) => (
          <button
            key={kind}
            type="button"
            className="theme-vurify-viewer__template-chip type-caption"
            onClick={() => onPick(kind)}
          >
            {SECTION_KIND_LABELS[kind]}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="theme-vurify-viewer__quiet-btn type-caption type-muted mt-3"
        onClick={onCancel}
      >
        Cancel
      </button>
    </div>
  )
}

import { useState } from 'react'
import { VurifyViewer } from '../VurifyViewer'
import { cloneViewerFixture } from '../vurifyViewerParts/vurifyViewerFixture'

/**
 * Theme lab — editable CvExtractV2 document (local state, Edge-shaped fixture).
 */
export function VurifyViewerShowcase() {
  const [value, setValue] = useState(() => cloneViewerFixture())

  return (
    <div className="space-y-6">
      <p className="type-body-sm type-muted prose-measure mb-0">
        Plain CV document seeded from Edge <code className="type-code">CvExtractV2</code>{' '}
        (<code className="type-code">schema_version: 2</code>). Click text to edit. Experience{' '}
        <em>technologies</em> / project <em>stack</em> render as an italic horizontal footer
        (not bullets). Add sections at the bottom; add fields from the right-edge + menus.
      </p>

      <div className="theme-vurify-viewer-showcase border border-current/10">
        <VurifyViewer value={value} onChange={setValue} editable subsectionToc />
      </div>
    </div>
  )
}

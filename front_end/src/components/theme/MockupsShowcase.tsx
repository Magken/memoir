import { useState } from 'react'
import { MOCKUP_MOTION_OPTIONS, type MockupMotionId } from '../../lib/mockups/motions'
import { MOCKUP_SCENES } from '../../lib/mockups/scenes'
import { MockupPreview } from '../MockupPreview'
import { Select } from '../Select'

export function MockupsShowcase() {
  const [motion, setMotion] = useState<MockupMotionId>('walk')

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end gap-4">
        <p className="type-body-sm type-muted prose-measure mb-0 max-w-xl">
          Deck story for how Vurify scores a day. Still on the left. Motion on the
          right loops without clipping or squishing type.
        </p>
        <Select
          label="Motion"
          options={MOCKUP_MOTION_OPTIONS}
          value={motion}
          onChange={(value) => setMotion(value as MockupMotionId)}
        />
      </div>
      <ul className="theme-shell-divider divide-y border-y">
        {MOCKUP_SCENES.map((scene) => (
          <li key={scene.id} className="grid gap-5 py-10">
            <aside className="min-w-0 space-y-2">
              <p className="type-label mb-0">{scene.name}</p>
              <p className="type-body-sm type-muted mb-0">{scene.purpose}</p>
              <p className="type-caption type-faint mb-0">from {scene.inspiredBy}</p>
            </aside>
            <div className="grid gap-6 min-w-0 lg:grid-cols-2">
              <div className="min-w-0 space-y-2">
                <p className="type-overline mb-0">Still</p>
                <MockupPreview scene={scene} />
              </div>
              <div className="min-w-0 space-y-2">
                <p className="type-overline mb-0">Motion</p>
                <MockupPreview scene={scene} motion={motion} />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

import { useMemo, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  DISPLAY_FACES,
  DISPLAY_FACE_ROLE_OPTIONS,
  DISPLAY_TYPE_TREATMENTS,
  type DisplayFaceRole,
} from '../../lib/theme/displayFaces'
import { useThemeFont } from '../../lib/theme'
import { Select } from '../Select'

export function DisplayFacesShowcase() {
  const { displayOverride, setDisplayOverride } = useThemeFont()
  const [searchParams, setSearchParams] = useSearchParams()
  const faceParam = Number(searchParams.get('face') || '')
  const [role, setRole] = useState<string>('all')

  const visible = useMemo(
    () =>
      role === 'all'
        ? DISPLAY_FACES
        : DISPLAY_FACES.filter((face) => face.role === (role as DisplayFaceRole)),
    [role],
  )

  function applyFace(cssFamily: string, id: number) {
    setDisplayOverride(cssFamily)
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('section', 'typography-display-faces')
        next.set('face', String(id))
        return next
      },
      { replace: true },
    )
  }

  return (
    <div className="space-y-8">
      <p className="type-body-sm type-muted prose-measure mb-0">
        Free self-hosted Fontsource families — faces 1–23 stand in for the Codrops on-scroll set
        (no Adobe kit, no CDN); faces 24–49 are lab additions for exploration: odd (24–35) plus
        elegant / futuristic with more weight than Megrim (36–49) (
        <a
          className="underline"
          href="https://github.com/codrops/OnScrollTypographyAnimations"
          target="_blank"
          rel="noreferrer"
        >
          OnScrollTypographyAnimations
        </a>
        ). <strong>Use as page display</strong> overrides{' '}
        <code className="type-code">--font-display</code> for this session. See also{' '}
        <Link className="underline" to="/theme?section=typography-scroll-fx">
          On-scroll type
        </Link>
        .
      </p>
      <div className="flex flex-wrap items-end gap-4">
        <div className="max-w-xs min-w-[12rem]">
          <Select
            label="Role"
            options={[...DISPLAY_FACE_ROLE_OPTIONS]}
            value={role}
            onChange={setRole}
          />
        </div>
        {displayOverride ? (
          <button
            type="button"
            className="type-label rounded border border-[var(--theme-border)] px-3 py-2"
            onClick={() => setDisplayOverride(null)}
          >
            Reset page display
          </button>
        ) : null}
      </div>
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((face) => {
          const active = displayOverride === face.cssFamily || faceParam === face.id
          return (
            <li
              key={face.id}
              id={`face-${face.id}`}
              className={[
                'theme-card theme-card--flat min-w-0 space-y-3 p-5',
                active ? 'ring-2 ring-[var(--theme-accent)]' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <p className={`theme-face-specimen theme-face--${face.id} mb-0`}>{face.sample}</p>
              <p className="type-label mb-0">
                {face.id}. {face.label}
              </p>
              <p className="font-mono text-[0.65rem] type-faint mb-0">
                theme-face--{face.id} ·{' '}
                {face.codropsName === 'lab' ? 'lab addition' : `was ${face.codropsName}`}
              </p>
              <p className="type-caption type-muted mb-0">
                Fontsource · {face.family}
              </p>
              <button
                type="button"
                className="type-caption rounded border border-[var(--theme-border)] px-2 py-1"
                onClick={() => applyFace(face.cssFamily, face.id)}
              >
                Use as page display
              </button>
            </li>
          )
        })}
      </ul>
      <section className="space-y-6" aria-labelledby="display-type-treatments-title">
        <div>
          <h3 id="display-type-treatments-title" className="type-h4 mb-2">
            Source typography treatments
          </h3>
          <p className="type-body-sm type-muted prose-measure mb-0">
            Codrops title modifiers from both on-scroll sets, plus simple text specimens
            (regular, subheading, bold, italic, underline) at readable body scale.
          </p>
        </div>
        {(
          [
            {
              id: 'display-type-treatments-titles',
              heading: 'Title treatments',
              items: DISPLAY_TYPE_TREATMENTS.filter(
                (treatment) => (treatment.scale ?? 'display') === 'display',
              ),
            },
            {
              id: 'display-type-treatments-text',
              heading: 'Text treatments',
              items: DISPLAY_TYPE_TREATMENTS.filter((treatment) => treatment.scale === 'text'),
            },
          ] as const
        ).map((group) => (
          <div key={group.id} className="space-y-3">
            <h4 id={group.id} className="type-h5 mb-0">
              {group.heading}
            </h4>
            <ul className="grid gap-4 sm:grid-cols-2" aria-labelledby={group.id}>
              {group.items.map((treatment) => (
                <li
                  key={treatment.id}
                  className="theme-card theme-card--flat min-w-0 space-y-3 p-5"
                >
                  <p
                    className={[
                      'theme-face-treatment',
                      `theme-face-treatment--${treatment.id}`,
                      treatment.scale === 'text' ? 'theme-face-treatment--text' : '',
                      'mb-0',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {treatment.sample}
                  </p>
                  <p className="type-label mb-0">{treatment.label}</p>
                  <p className="font-mono text-[0.65rem] type-faint mb-0">
                    {treatment.sourceClass}
                  </p>
                  <p className="type-caption type-muted mb-0">{treatment.purpose}</p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  )
}

/**
 * Theme lab — GRAS LCL breadcrumb is LclBreadcrumb only; do not rebuild the trail.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { GrasUnderlineButton } from '../GrasUnderlineButton'
import { LclBreadcrumb } from '../LclBreadcrumb'
import { TypeAnimText } from '../TypeAnimText'

const ROOT = 'Title'
const NEST = ['Kindling', 'Ember', 'Flare'] as const

export function BreadcrumbGrasShowcase() {
  const [path, setPath] = useState<string[]>(['Kindling', 'Ember'])
  const [emptyRoot, setEmptyRoot] = useState(true)

  return (
    <div className="space-y-10">
      <p className="type-body-sm type-muted prose-measure mb-0">
        Product and toolkit trails use{' '}
        <code className="type-code">LclBreadcrumb</code> only — visited steps from{' '}
        <code className="type-code">lclCrumbsForPath</code>, 1px seps, grey current crumb. Do not
        rebuild the trail inline. Nest dives stay on{' '}
        <Link className="underline" to="/theme?section=buttons-gras">
          GRAS buttons
        </Link>
        .
      </p>

      <section className="space-y-4">
        <p className="type-overline">Interactive trail</p>
        <p className="type-body-sm type-muted prose-measure mb-0">
          Ancestors call <code className="type-code">onSelect(depth)</code>. Current is not a
          button. Arrow shows when the trail has more than one crumb.
        </p>
        <div className="theme-lcl-preview__display-head space-y-3">
          <LclBreadcrumb
            path={path}
            rootLabel={ROOT}
            rootWhenEmpty={emptyRoot}
            onSelect={(depth) => setPath((prev) => prev.slice(0, depth))}
          />
        </div>
        <ul className="theme-lcl-layout__nest m-0 list-none p-0">
          {NEST.map((label) => {
            const depth = path.indexOf(label)
            const open = depth >= 0
            return (
              <li key={label}>
                <GrasUnderlineButton
                  layout="nest"
                  onClick={() => {
                    if (open) {
                      setPath((prev) => prev.slice(0, depth + 1))
                      return
                    }
                    const next = [...NEST]
                    const at = next.indexOf(label)
                    setPath(next.slice(0, at + 1))
                  }}
                >
                  <TypeAnimText anim="slide-left" trigger="hover" className="type-h3 mb-0">
                    {label}
                  </TypeAnimText>
                </GrasUnderlineButton>
              </li>
            )
          })}
        </ul>
        <label className="type-body-sm type-muted flex items-center gap-2">
          <input
            type="checkbox"
            checked={emptyRoot}
            onChange={(event) => setEmptyRoot(event.target.checked)}
          />
          <span>
            <code className="type-code">rootWhenEmpty</code> — empty path still shows the root
            (About Home head)
          </span>
        </label>
      </section>

      <section className="space-y-4">
        <p className="type-overline">Root only</p>
        <p className="type-body-sm type-muted prose-measure mb-0">
          Empty path with <code className="type-code">rootWhenEmpty</code> — single current crumb,
          no arrow.
        </p>
        <LclBreadcrumb path={[]} rootLabel="About" rootWhenEmpty onSelect={() => undefined} />
      </section>

      <section className="space-y-4">
        <p className="type-overline">Hidden when empty</p>
        <p className="type-body-sm type-muted prose-measure mb-0">
          Without <code className="type-code">rootWhenEmpty</code>, an empty path renders nothing
          (toolkit Reference before the first dive). The node below is mounted and returns null.
        </p>
        <LclBreadcrumb path={[]} rootLabel="Title" onSelect={() => undefined} />
      </section>
    </div>
  )
}

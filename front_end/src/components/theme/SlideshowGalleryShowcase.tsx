import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { SLIDESHOW_FX_META } from '../../lib/galleries/slideshowNavigators'
import type { SlideshowFxId } from '../../lib/galleries/slideshowTypes'
import { SlideshowGallery } from '../SlideshowGallery'
import { Select } from '../Select'

const fxOptions = SLIDESHOW_FX_META.map((entry) => ({
  value: entry.id,
  label: `${entry.id.replace('demo', '')}. ${entry.name}`,
}))

export function SlideshowGalleryShowcase() {
  const [searchParams, setSearchParams] = useSearchParams()
  const fxParam = searchParams.get('fx') as SlideshowFxId | null
  const initial =
    fxParam && SLIDESHOW_FX_META.some((entry) => entry.id === fxParam) ? fxParam : 'demo1'
  const [fx, setFx] = useState<SlideshowFxId>(initial)
  const meta = SLIDESHOW_FX_META.find((entry) => entry.id === fx)!

  function onFxChange(value: string) {
    const next = value as SlideshowFxId
    setFx(next)
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev)
        params.set('section', 'gallery-slideshow')
        params.set('fx', next)
        return params
      },
      { replace: true },
    )
  }

  return (
    <div className="space-y-6">
      <p className="type-body-sm type-muted prose-measure mb-0">
        GSAP slideshow transitions from{' '}
        <a
          className="underline"
          href="https://tympanus.net/Development/SlideshowAnimations/"
          target="_blank"
          rel="noreferrer"
        >
          Codrops Slideshow Animations
        </a>{' '}
        (MIT). Wheel / drag / arrows. Also listed under{' '}
        <Link className="underline" to="/theme?section=gsap-transition-composites">
          GSAP transitions
        </Link>{' '}
        (slideshow filter).
      </p>
      <div className="max-w-sm">
        <Select label="Transition FX" options={fxOptions} value={fx} onChange={onFxChange} />
      </div>
      <p className="type-caption type-muted mb-0">
        {meta.purpose} · <code className="type-code">{meta.stack}</code>
      </p>
      <SlideshowGallery key={fx} fx={fx} />
    </div>
  )
}

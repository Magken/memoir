import { useState } from 'react'
import {
  PAGE_BG_TEXTURE_OPTIONS,
  PAGE_BG_TEXTURES,
  type PageBgTextureId,
  pageBgTextureClass,
} from '../../lib/pageBgTextures'
import { PageBgDiv } from '../PageBgDiv'
import { Select } from '../Select'

const demoBlocks = [
  'Hero band',
  'Feature row',
  'Metrics strip',
  'Quote block',
  'Gallery band',
  'FAQ section',
  'CTA band',
  'Footer band',
] as const

export function PageBgTextureShowcase() {
  const [texture, setTexture] = useState<PageBgTextureId>('canson')
  const active = PAGE_BG_TEXTURES.find((t) => t.id === texture)

  return (
    <section className="space-y-4">
      <div>
        <p className="type-overline">Paper textures</p>
        <p className="type-body-sm type-muted prose-measure">
          Forty-one SVG turbulence paper fills from{' '}
          <code className="type-code">ref.background-types-1</code> — base fill uses{' '}
          <code className="type-code">--theme-page-bg</code> from the palette picker; grain blends via{' '}
          <code className="type-code">--theme-page-bg-texture-blend</code>. Use{' '}
          <code className="type-code">PageBgDiv variant=&quot;texture&quot;</code> in production.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,16rem)_1fr] lg:items-start">
        <Select
          label="texture"
          options={[...PAGE_BG_TEXTURE_OPTIONS]}
          value={texture}
          onChange={(value) => setTexture(value as PageBgTextureId)}
        />
        <div
          className={`theme-page-bg-texture-swatch ${pageBgTextureClass(texture)}`}
          role="img"
          aria-label={active?.label ?? texture}
        />
      </div>

      <p className="type-caption type-muted">
        Active: <strong>{active?.label}</strong> · class{' '}
        <code className="type-code">.{pageBgTextureClass(texture)}</code>
      </p>

      <div className="theme-page-bg-demo__scroll-host">
        <div className="theme-page-bg-host">
          <PageBgDiv variant="texture" texture={texture} />
          <div className="theme-page-bg-host__content space-y-3 p-4">
            {demoBlocks.map((label) => (
              <div key={label} className="theme-page-bg-demo__section">
                <p className="type-label">{label}</p>
                <p className="type-body-sm type-muted">
                  Solid <code className="type-code">--theme-surface</code> panel over the texture div.
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

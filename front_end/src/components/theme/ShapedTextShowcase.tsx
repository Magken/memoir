import { useState } from 'react'
import { ShapedText } from '../ShapedText'
import { ExtrudedType } from '../ExtrudedType'
import { Select } from '../Select'
import {
  SHAPED_TEXT_LAYOUT_OPTIONS,
  SHAPED_TEXT_MOTION_OPTIONS,
  type ShapedTextLayout,
  type ShapedTextMotion,
} from '../../lib/animations/shapedText'
import {
  EXTRUDED_TYPE_POINTER_OPTIONS,
  EXTRUDED_TYPE_ORIENTATION_OPTIONS,
  EXTRUDED_TYPE_DEFAULT_ORIENTATION_FROM,
  EXTRUDED_TYPE_DEFAULT_ORIENTATION_TO,
  type ExtrudedTypePointer,
} from '../../lib/animations/extrudedType'
import type { IsometricPlaneOrientationId } from '../../lib/isometrics/isometricPlanes'

const arcDemos = [
  { layout: 'semicircle' as const, sample: 'Design motion', motion: 'rise' as const },
  { layout: 'arch' as const, sample: 'Curved type', motion: 'expand' as const },
  { layout: 'smile' as const, sample: 'Friendly arc', motion: 'rise' as const },
  { layout: 'ellipse' as const, sample: 'Wide orbit', motion: 'scatter' as const },
] as const

const flowDemos = [
  { layout: 'wave' as const, sample: 'Flow rhythm', motion: 'rise' as const },
  { layout: 'scurve' as const, sample: 'Smooth path', motion: 'expand' as const },
  { layout: 'spiral' as const, sample: 'Spiral out', motion: 'scatter' as const },
  { layout: 'zigzag' as const, sample: 'Angular', motion: 'rise' as const },
] as const

export function ShapedTextShowcase() {
  const [playgroundLayout, setPlaygroundLayout] = useState<ShapedTextLayout>('circle')
  const [playgroundMotion, setPlaygroundMotion] = useState<ShapedTextMotion>('rise')
  const [extrudedPointer, setExtrudedPointer] = useState<ExtrudedTypePointer>('follow')
  const [extrudedFrom, setExtrudedFrom] = useState<IsometricPlaneOrientationId>(
    EXTRUDED_TYPE_DEFAULT_ORIENTATION_FROM,
  )
  const [extrudedTo, setExtrudedTo] = useState<IsometricPlaneOrientationId>(
    EXTRUDED_TYPE_DEFAULT_ORIENTATION_TO,
  )

  return (
    <section id="shaped-text" className="theme-shaped-text-suite">
      <div className="theme-shaped-text-suite__intro space-y-3">
        <p className="type-overline mb-0">Shaped text</p>
        <p className="type-body-sm type-muted mb-0">
          <code className="type-code">ShapedText</code> splits copy into characters, then GSAP animates each
          glyph <strong>in</strong> along a path and <strong>out</strong> on hover leave. CSS provides the
          stage and guide geometry; paths live in{' '}
          <code className="type-code">lib/animations/shapedText.ts</code>. Stage insets keep glyphs inside
          the frame — no border clipping.
        </p>
      </div>

      <div className="theme-shaped-text-suite__hero">
        <p className="type-caption type-muted mb-3">Featured · circle · expand in / contract out · enter</p>
        <ShapedText layout="circle" motion="expand" trigger="enter" size="lg" label="Loads shaped">
          Type on the ring
        </ShapedText>
      </div>

      <div className="theme-shaped-text-suite__group">
        <p className="type-overline mb-0">Extruded 3D type</p>
        <p className="type-body-sm type-muted mb-0">
          <code className="type-code">ExtrudedType</code> — ref.text-shaped-1 stacked{' '}
          <code className="type-code">translateZ</code> layers with accent stroke depth.{' '}
          <strong>pointer</strong> <code className="type-code">follow</code> /{' '}
          <code className="type-code">repulse</code> or auto wobble when{' '}
          <code className="type-code">none</code>. Set{' '}
          <code className="type-code">orientationFrom</code> /{' '}
          <code className="type-code">orientationTo</code> with any{' '}
          <code className="type-code">isometricPlanes</code> id (ref wobble presets included).
        </p>
        <div className="grid max-w-xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Select
            label="pointer"
            options={[...EXTRUDED_TYPE_POINTER_OPTIONS]}
            value={extrudedPointer}
            onChange={(value) => setExtrudedPointer(value as ExtrudedTypePointer)}
          />
          <Select
            label="orientationFrom"
            options={[...EXTRUDED_TYPE_ORIENTATION_OPTIONS]}
            value={extrudedFrom}
            onChange={(value) => setExtrudedFrom(value as IsometricPlaneOrientationId)}
          />
          <Select
            label="orientationTo"
            options={[...EXTRUDED_TYPE_ORIENTATION_OPTIONS]}
            value={extrudedTo}
            onChange={(value) => setExtrudedTo(value as IsometricPlaneOrientationId)}
          />
        </div>
        <div className="theme-extruded-type-suite__panel">
          <p className="type-caption type-muted mb-3">
            {extrudedFrom} → {extrudedTo} · {extrudedPointer}
          </p>
          <ExtrudedType
            key={`${extrudedPointer}-${extrudedFrom}-${extrudedTo}`}
            pointer={extrudedPointer}
            animate={extrudedPointer === 'none'}
            orientationFrom={extrudedFrom}
            orientationTo={extrudedTo}
            size="lg"
          >
            {`Theme\n  type!`}
          </ExtrudedType>
        </div>
        <ul className="theme-shaped-text-suite__grid">
          <li className="theme-shaped-text-suite__tile theme-extruded-type-suite__panel">
            <p className="type-caption mb-2">auto wobble · enter</p>
            <ExtrudedType pointer="none" animate size="md">
              {`Pure\n  css!`}
            </ExtrudedType>
          </li>
          <li className="theme-shaped-text-suite__tile theme-extruded-type-suite__panel">
            <p className="type-caption mb-2">iso card → oblique left</p>
            <ExtrudedType
              pointer="follow"
              orientationFrom="iso-card"
              orientationTo="oblique-left"
              size="md"
            >
              {`Iso\n  tilt`}
            </ExtrudedType>
          </li>
        </ul>
      </div>

      <div className="theme-shaped-text-suite__group">
        <p className="type-overline mb-0">Border layouts</p>
        <p className="type-body-sm type-muted mb-0">
          Square perimeter — copy runs clockwise from the top edge. Use on card frames, badges, and bordered
          panels.
        </p>
        <ul className="theme-shaped-text-suite__grid">
          <li className="theme-shaped-text-suite__tile theme-shaped-text-suite__tile--card-border">
            <p className="type-caption mb-2">square · rise · card border</p>
            <ShapedText layout="square" motion="rise" trigger="hover" size="lg" label="Hover — border label">
              PREMIUM CARD EDITION
            </ShapedText>
          </li>
          <li className="theme-shaped-text-suite__tile theme-shaped-text-suite__tile--card-border">
            <p className="type-caption mb-2">square · expand · enter</p>
            <ShapedText layout="square" motion="expand" trigger="enter" size="md" label="Loads on border">
              LIMITED RELEASE
            </ShapedText>
          </li>
        </ul>
      </div>

      <div className="theme-shaped-text-suite__group">
        <p className="type-overline mb-0">Arc layouts</p>
        <p className="type-body-sm type-muted mb-0">Semicircle, arch, smile, and ellipse — hover to shape in, leave to animate out.</p>
        <ul className="theme-shaped-text-suite__grid">
          {arcDemos.map(({ layout, sample, motion }) => (
            <li key={layout} className="theme-shaped-text-suite__tile">
              <p className="type-caption mb-2">
                {layout} · {motion}
              </p>
              <ShapedText layout={layout} motion={motion} trigger="hover" size="md">
                {sample}
              </ShapedText>
            </li>
          ))}
        </ul>
      </div>

      <div className="theme-shaped-text-suite__group">
        <p className="type-overline mb-0">Flow &amp; angular</p>
        <p className="type-body-sm type-muted mb-0">Wave, S-curve, spiral, and zigzag paths with distinct in/out motion recipes.</p>
        <ul className="theme-shaped-text-suite__grid">
          {flowDemos.map(({ layout, sample, motion }) => (
            <li key={layout} className="theme-shaped-text-suite__tile">
              <p className="type-caption mb-2">
                {layout} · {motion}
              </p>
              <ShapedText layout={layout} motion={motion} trigger="hover" size="md">
                {sample}
              </ShapedText>
            </li>
          ))}
        </ul>
      </div>

      <div className="theme-shaped-text-suite__group">
        <p className="type-overline mb-0">Playground</p>
        <div className="grid max-w-xl gap-4 sm:grid-cols-2">
          <Select
            label="layout"
            options={[...SHAPED_TEXT_LAYOUT_OPTIONS]}
            value={playgroundLayout}
            onChange={(value) => setPlaygroundLayout(value as ShapedTextLayout)}
          />
          <Select
            label="motion"
            options={[...SHAPED_TEXT_MOTION_OPTIONS]}
            value={playgroundMotion}
            onChange={(value) => setPlaygroundMotion(value as ShapedTextMotion)}
          />
        </div>
        <div className="theme-shaped-text-suite__tile">
          <ShapedText
            key={`${playgroundLayout}-${playgroundMotion}`}
            layout={playgroundLayout}
            motion={playgroundMotion}
            trigger="hover"
            size="lg"
            label="Hover — in on enter, out on leave"
          >
            Compose your path
          </ShapedText>
        </div>
      </div>
    </section>
  )
}

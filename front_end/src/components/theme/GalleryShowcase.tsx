import { useEffect, useMemo, useState } from 'react'
import { BandGallery } from '../BandGallery'
import {
  ImageDragCarousel,
  type ImageDragCarouselExpandVariant,
  type ImageDragCarouselImage,
} from '../ImageDragCarousel'
import { GALLERY_DEMO_IMAGES, galleryDemoImageSrc } from '../../lib/galleries/galleryDemoImages'
import {
  LandingStyleGallery,
  type LandingStyleGalleryCopyPosition,
  type LandingStyleGallerySlide,
} from '../LandingStyleGallery'
import { MorphGallery } from '../MorphGallery'
import { NeuronFieldGallery } from '../NeuronFieldGallery'
import { NeuronFieldImage } from '../NeuronFieldImage'
import { ShapeMorphGallery } from '../ShapeMorphGallery'
import { SHAPE_MORPH_GALLERY_DEMO_SLIDES } from '../../lib/galleries/shapeMorphGalleryFixtures'
import { OrbitalGallery, buildOrbitalItemsFromImages } from '../OrbitalGallery'
import { Select } from '../Select'
import { Slider } from '../Slider'
import { SpiralGallery } from '../SpiralGallery'
import { ImagePickerCarouselHost } from '../ImagePickerCarouselHost'
import { CubeMenuScrollGallery } from '../CubeMenuScrollGallery'
import { DirectionAwareCubeGallery } from '../DirectionAwareCubeGallery'
import { WebGpuTransitionGallery } from '../WebGpuTransitionGallery'
import { WebGpuIsometricAccordion, WEBGPU_ISO_ACCORDION_EFFECT_OPTIONS, type WebGpuIsometricAccordionEffect } from '../WebGpuIsometricAccordion'
import { CurvedMonitorCard, NAV_FEATURE_GROUPS, preloadCurvedMonitorStills } from '../CurvedMonitorCard'
import { CURVED_MONITOR_CURVE_DEFAULT, curvatureFromBowl } from '../../lib/shape3d/curvedMonitor'

const demoImages: readonly ImageDragCarouselImage[] = GALLERY_DEMO_IMAGES

const landingStyleSlides: readonly LandingStyleGallerySlide[] = [
  {
    src: demoImages[0].src,
    alt: demoImages[0].alt,
    title: demoImages[0].title ?? 'City bloom',
    description: demoImages[0].text ?? 'Warm facades against an open sky — scroll or tap dots to change slides.',
  },
  {
    src: demoImages[1].src,
    alt: demoImages[1].alt,
    title: demoImages[1].title ?? 'Golden hour',
    description: demoImages[1].text ?? 'Suspension lines and amber light.',
  },
  {
    src: demoImages[2].src,
    alt: demoImages[2].alt,
    title: 'Floral study',
    description: 'Orange petals in soft natural light.',
  },
  {
    src: demoImages[3].src,
    alt: demoImages[3].alt,
    title: demoImages[3].title ?? 'On rotation',
    description: demoImages[3].text ?? 'Vinyl spinning on a gray turntable.',
  },
  {
    src: demoImages[4].src,
    alt: demoImages[4].alt,
    title: 'Coastal wildlife',
    description: 'Penguins gathered along the shoreline.',
  },
  {
    src: demoImages[5].src,
    alt: demoImages[5].alt,
    title: 'Stair geometry',
    description: 'High-angle lines and repeating steps.',
  },
  {
    src: demoImages[6].src,
    alt: demoImages[6].alt,
    title: 'Portrait study',
    description: 'Close-up warmth and shallow depth.',
  },
]

const morphDemoImages = demoImages.slice(0, 6).map((item) => ({
  src: galleryDemoImageSrc(item.src, 1200),
  alt: item.alt,
  thumb: galleryDemoImageSrc(item.src, 200),
}))

const imagePickerDemoImages = demoImages.slice(0, 8).map((item, index) => ({
  id: `picker-${index}`,
  src: galleryDemoImageSrc(item.src, 480),
  alt: item.alt,
}))

const neuronFieldDemoImage = {
  src: galleryDemoImageSrc(demoImages[0].src, 1400),
  alt: demoImages[0].alt,
}

const neuronFieldDemoImages = demoImages.slice(0, 6).map((item) => ({
  src: galleryDemoImageSrc(item.src, 1400),
  alt: item.alt,
}))

const neuronModeOptions = [
  { value: 'carousel', label: 'Carousel — dot nav + prev/next' },
  { value: 'static', label: 'Static — single image' },
] as const

const dotSizeOptions = [
  { value: '4', label: '4 — dense field (default)' },
  { value: '8', label: '8 — medium-dense' },
  { value: '12', label: '12 — medium' },
  { value: '16', label: '16 — coarse' },
  { value: '20', label: '20 — very coarse' },
] as const

const neuronIntensityOptions = [
  { value: '0.35', label: '0.35 — subtle' },
  { value: '0.55', label: '0.55 — default' },
  { value: '0.75', label: '0.75 — intense' },
] as const

const neuronMotionOptions = [
  { value: 'off', label: 'Off — static field (default)' },
  { value: 'on', label: 'On — twinkle + color drift' },
] as const

const orbitalDemoItems = buildOrbitalItemsFromImages(
  demoImages.map(({ src, alt, title, text, num }) => ({ src, alt, title, text, num })),
  100
)


const copyPositionOptions = [
  { value: 'left', label: 'left — overlay left-center' },
  { value: 'right', label: 'right — overlay right-center' },
  { value: 'bottom', label: 'bottom — above footer' },
] as const

const expandVariantOptions = [
  { value: 'detail', label: 'detail — accordion panel + copy' },
  { value: 'image', label: 'image — fixed card enlargement' },
  { value: 'native', label: 'native — massive intrinsic-size card' },
] as const

const vanishingOptions = [
  { value: 'off', label: 'Off (inset card)' },
  { value: 'true', label: 'On (1 visible — default count)' },
  { value: '1', label: '1 visible (default)' },
  { value: '3', label: '3 visible' },
  { value: '5', label: '5 visible' },
  { value: '7', label: '7 visible' },
] as const

const dotNavOptions = [
  { value: 'on', label: 'On' },
  { value: 'off', label: 'Off' },
] as const

const focusThinOptions = [
  { value: 'off', label: 'Off' },
  { value: 'on', label: 'On (center thin)' },
] as const

const autoScrollOptions = [
  { value: 'off', label: 'Off' },
  { value: 'on', label: 'On (5s soft advance)' },
  { value: '3500', label: '3.5s interval' },
  { value: '8000', label: '8s interval' },
] as const

const glEffectsOptions = [
  { value: 'on', label: 'On — velocity warp + chromatic smear (default)' },
  { value: 'off', label: 'Off — DOM images only' },
] as const

const orbitalPanArcOptions = [
  { value: '1', label: '1 — full arc (sparse data)' },
  { value: '0.45', label: '0.45 — tight horizontal (default)' },
  { value: '0.72', label: '0.72 — wider window' },
] as const

const orbitalPolarClampOptions = [
  { value: '1', label: '±1° — minimal tilt' },
  { value: '3', label: '±3° — default' },
  { value: '8', label: '±8° — loose vertical' },
  { value: '15', label: '±15° — wide vertical' },
] as const

const orbitalConcaveOptions = [
  { value: 'off', label: 'Off (default arc)' },
  { value: 'on', label: 'On (+180° yaw)' },
] as const

const orbitalCenterOnClickOptions = [
  { value: 'off', label: 'Off — tap expands' },
  { value: 'on', label: 'On — tap centers tile' },
] as const

const spiralTiltControlOptions = [
  { value: 'auto', label: 'auto — scroll-linked drift (default)' },
  { value: 'prop', label: 'prop — fixed tilt from preset' },
  { value: 'drag', label: 'drag — pointer / two-finger tilt' },
] as const

const spiralTiltPresetOptions = [
  { value: 'default', label: 'default — layout base only' },
  { value: 'wide', label: 'wide — open yaw + pitch' },
  { value: 'steep', label: 'steep — deeper pitch' },
] as const

const spiralTiltPresets = {
  default: { x: 0, z: 0 },
  wide: { x: 0.1, z: 0.18 },
  steep: { x: -0.16, z: 0.06 },
} as const

const spiralVanishingOptions = [
  { value: 'on', label: 'On — top/bottom fade (default)' },
  { value: 'off', label: 'Off — hard crop' },
  { value: '0.1', label: '10% fade band' },
  { value: '0.2', label: '20% fade band' },
] as const

function resolveVanishing(value: string): boolean | number | undefined {
  if (value === 'off') return false
  if (value === 'true') return true
  return Number.parseInt(value, 10)
}

function resolveAutoScroll(value: string): boolean | number | undefined {
  if (value === 'off') return undefined
  if (value === 'on') return true
  return Number.parseInt(value, 10)
}

const webGpuDemoImages = demoImages.slice(0, 5).map((item) => ({
  src: galleryDemoImageSrc(item.src, 1400),
  alt: item.alt,
  title: item.title,
  text: item.text,
}))

export type GalleryShowcasePanel = 'rails' | 'spatial' | 'motion' | 'webgpu'

type GalleryShowcaseProps = {
  panel: GalleryShowcasePanel
}

export function GalleryShowcase({ panel }: GalleryShowcaseProps) {
  const [copyPosition, setCopyPosition] = useState<LandingStyleGalleryCopyPosition>('left')
  const [landingShowDotNav, setLandingShowDotNav] = useState('on')
  const [expandVariant, setExpandVariant] = useState<ImageDragCarouselExpandVariant>('detail')
  const [vanishing, setVanishing] = useState('1')
  const [showDotNav, setShowDotNav] = useState('on')
  const [focusThin, setFocusThin] = useState('off')
  const [autoScroll, setAutoScroll] = useState('off')
  const [dragGlEffects, setDragGlEffects] = useState('on')
  const [orbitalFocusThin, setOrbitalFocusThin] = useState('off')
  const [orbitalPanArc, setOrbitalPanArc] = useState('0.45')
  const [orbitalPolarClamp, setOrbitalPolarClamp] = useState('3')
  const [orbitalConcave, setOrbitalConcave] = useState('off')
  const [orbitalCenterOnClick, setOrbitalCenterOnClick] = useState('off')
  const [spiralTiltControl, setSpiralTiltControl] = useState('auto')
  const [spiralTiltPreset, setSpiralTiltPreset] = useState('default')
  const [spiralVanishing, setSpiralVanishing] = useState('on')
  const [neuronDotSize, setNeuronDotSize] = useState('4')
  const [neuronIntensity, setNeuronIntensity] = useState('0.55')
  const [neuronMotion, setNeuronMotion] = useState('off')
  const [neuronMode, setNeuronMode] = useState('carousel')
  const [cubeGalleryFaceBorder, setCubeGalleryFaceBorder] = useState('on')
  const [cubeGalleryCardGap, setCubeGalleryCardGap] = useState('wide')
  const [cubeGalleryCardLayout, setCubeGalleryCardLayout] = useState('split')
  const [cubeGalleryButtonLift, setCubeGalleryButtonLift] = useState('on')
  const [isoAccordionEffect, setIsoAccordionEffect] =
    useState<WebGpuIsometricAccordionEffect>('hover')
  const [cardBowl, setCardBowl] = useState<'concave' | 'convex'>('concave')
  const [cardCurve, setCardCurve] = useState(CURVED_MONITOR_CURVE_DEFAULT)
  const cardCurvature = curvatureFromBowl(cardBowl)

  useEffect(() => {
    if (panel !== 'webgpu') return
    void preloadCurvedMonitorStills()
  }, [panel])

  const vanishingProp = useMemo(() => resolveVanishing(vanishing), [vanishing])
  const autoScrollProp = useMemo(() => resolveAutoScroll(autoScroll), [autoScroll])
  const spiralTilt = useMemo(
    () => spiralTiltPresets[spiralTiltPreset as keyof typeof spiralTiltPresets],
    [spiralTiltPreset]
  )
  const spiralVanishingProp = useMemo(() => {
    if (spiralVanishing === 'off') return false
    if (spiralVanishing === 'on') return true
    return Number.parseFloat(spiralVanishing)
  }, [spiralVanishing])

  const orbitalEdgeClamp = useMemo(() => {
    const arcFraction = Number.parseFloat(orbitalPanArc)
    const polar = Number.parseFloat(orbitalPolarClamp)
    return {
      horizontal: Number.isFinite(arcFraction) ? arcFraction : 0.72,
      vertical: Number.isFinite(polar) ? polar : 3,
    }
  }, [orbitalPanArc, orbitalPolarClamp])

  return (
    <div className="space-y-12">
      {panel === 'rails' ? (
        <>
      <p className="type-body-sm type-muted prose-measure">
        Gallery patterns for media-heavy sections — compact rails and landing-style wheel
        galleries. Image picker rail: <code className="type-code">ref.image-carousel-10</code> →{' '}
        <code className="type-code">ImagePickerCarousel</code>. Landing wheel:{' '}
        <code className="type-code">ref.image-carousel-3</code> via{' '}
        <code className="type-code">LandingStyleGallery</code>.
      </p>

      <section id="image-picker-rail" className="space-y-4">
        <p className="type-overline">Image picker rail</p>
        <p className="type-body-sm type-muted prose-measure">
          Compact vertical or horizontal thumb carousel for cards and gallery companions — live port of{' '}
          <code className="type-code">ref.image-carousel-10</code> (reference keeps the full-page GSAP
          3D scroll demo). <code className="type-code">ImagePickerCarousel</code> shows three thumbs with
          center highlight; pointer drag or tap to select; wheel disabled on the rail. Optional{' '}
          <code className="type-code">showNav</code> — chevron up/down (vertical) or prev/next (horizontal).
        </p>
        <ImagePickerCarouselHost images={imagePickerDemoImages} label="Gallery image picker" className="max-w-md" />
      </section>

      <section className="space-y-4">
        <p className="type-overline">Landing style gallery</p>
        <p className="type-body-sm type-muted prose-measure">
          Full-bleed wheel / touch slideshow with GSAP clip-path reveals — port of{' '}
          <code className="type-code">ref.image-carousel-3</code>. Scroll or swipe inside the
          stage; uses the same demo photos as the drag carousel below.
        </p>
        <div className="grid max-w-md gap-4 sm:grid-cols-2">
          <Select
            label="copyPosition"
            options={[...copyPositionOptions]}
            value={copyPosition}
            onChange={(value) => setCopyPosition(value as LandingStyleGalleryCopyPosition)}
          />
          <Select
            label="showDotNav"
            options={[...dotNavOptions]}
            value={landingShowDotNav}
            onChange={setLandingShowDotNav}
          />
        </div>
        <LandingStyleGallery
          key={`${copyPosition}-${landingShowDotNav}`}
          slides={landingStyleSlides}
          label="Landing style gallery"
          copyPosition={copyPosition}
          showDotNav={landingShowDotNav === 'on'}
        />
      </section>
        </>
      ) : null}

      {panel === 'spatial' ? (
        <>
      <section className="space-y-4">
        <p className="type-overline">Direction-aware cube gallery</p>
        <p className="type-body-sm type-muted prose-measure">
          Hover-driven 3D flip grid from <code className="type-code">ref.image-carousel-11</code> —
          each tile is a 2-face mini-cube (image front · title back) that rotates toward the edge
          your pointer enters and unwinds toward the edge it leaves. Uses{' '}
          <code className="type-code">DirectionAwareCubeGallery</code>.
        </p>
        <DirectionAwareCubeGallery />
      </section>

      <section id="cube-scroll-gallery" className="space-y-4">
        <p className="type-overline">Cube scroll gallery</p>
        <p className="type-body-sm type-muted prose-measure">
          Scroll-linked 3D cube from <code className="type-code">ref.image-carousel-12</code> — copy
          cards left, sticky cube right · ring-path twists on both axes · scene dots jump to
          sections · uses <code className="type-code">CubeMenuScrollGallery</code> +{' '}
          <code className="type-code">CubeMenu3dFaceNav</code> panels on each face.
        </p>
        <div className="grid max-w-3xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            label="cardLayout"
            options={[
              { value: 'split', label: 'split (left/right)' },
              { value: 'side', label: 'side' },
            ]}
            value={cubeGalleryCardLayout}
            onChange={setCubeGalleryCardLayout}
          />
          <Select
            label="faceBorder"
            options={[
              { value: 'on', label: 'on' },
              { value: 'off', label: 'off' },
            ]}
            value={cubeGalleryFaceBorder}
            onChange={setCubeGalleryFaceBorder}
          />
          <Select
            label="buttonLift"
            options={[
              { value: 'on', label: 'on' },
              { value: 'off', label: 'off' },
            ]}
            value={cubeGalleryButtonLift}
            onChange={setCubeGalleryButtonLift}
          />
          <Select
            label="cardGap"
            options={[
              { value: 'flush', label: 'flush' },
              { value: 'tight', label: 'tight' },
              { value: 'normal', label: 'normal' },
              { value: 'wide', label: 'wide' },
            ]}
            value={cubeGalleryCardGap}
            onChange={setCubeGalleryCardGap}
          />
        </div>
        <CubeMenuScrollGallery
          faceBorder={cubeGalleryFaceBorder === 'on'}
          cardGap={cubeGalleryCardGap as 'flush' | 'tight' | 'normal' | 'wide'}
          cardLayout={cubeGalleryCardLayout as 'side' | 'split'}
          buttonLift={cubeGalleryButtonLift === 'on'}
        />
      </section>

      <section className="space-y-4">
        <p className="type-overline">Orbital gallery</p>
        <p className="type-body-sm type-muted prose-measure">
          3D CSS sphere — drag to orbit photos on a segment grid. Base port of{' '}
          <code className="type-code">ref.image-carousel-4</code>. Tap a tile to expand — same{' '}
          <strong>expandVariant</strong> layouts as the drag carousel below.{' '}
          <strong>focusThin</strong> — off-center tiles grey + shrink; center tile stays full size
          and in color. Tap any visible tile (not only center).{' '}
          <strong>edgeClamp</strong> — horizontal arc fraction + vertical tilt limits.{' '}
          <strong>concave</strong> — same rig, opposite horizontal arc (+180° yaw).{' '}
          <strong>centerOnClick</strong> — tap a tile to animate it to stage center.
        </p>
        <div className="grid max-w-3xl gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <Select
            label="expandVariant"
            options={[...expandVariantOptions]}
            value={expandVariant}
            onChange={(value) => setExpandVariant(value as ImageDragCarouselExpandVariant)}
          />
          <Select
            label="focusThin"
            options={[...focusThinOptions]}
            value={orbitalFocusThin}
            onChange={setOrbitalFocusThin}
          />
          <Select
            label="edgeClamp.horizontal"
            options={[...orbitalPanArcOptions]}
            value={orbitalPanArc}
            onChange={setOrbitalPanArc}
          />
          <Select
            label="edgeClamp.vertical"
            options={[...orbitalPolarClampOptions]}
            value={orbitalPolarClamp}
            onChange={setOrbitalPolarClamp}
          />
          <Select
            label="concave"
            options={[...orbitalConcaveOptions]}
            value={orbitalConcave}
            onChange={setOrbitalConcave}
          />
          <Select
            label="centerOnClick"
            options={[...orbitalCenterOnClickOptions]}
            value={orbitalCenterOnClick}
            onChange={setOrbitalCenterOnClick}
          />
        </div>
        <OrbitalGallery
          key={`${expandVariant}-${orbitalFocusThin}-${orbitalPanArc}-${orbitalPolarClamp}-${orbitalConcave}-${orbitalCenterOnClick}`}
          items={orbitalDemoItems}
          label="Orbital gallery demo"
          focusThin={orbitalFocusThin === 'on'}
          expandVariant={expandVariant}
          edgeClamp={orbitalEdgeClamp}
          concave={orbitalConcave === 'on'}
          centerOnClick={orbitalCenterOnClick === 'on'}
        />
      </section>

      <section className="space-y-4">
        <p className="type-overline">Band gallery</p>
        <p className="type-body-sm type-muted prose-measure">
          WebGL horizontal band carousel — eight curved shader strips with infinite horizontal
          scroll. Port of <code className="type-code">ref.image-carousel-5</code>. Tap a photo to
          expand — same <strong>expandVariant</strong> layouts as the orbital and drag galleries.
          Scroll, drag, or use arrow keys; double-click resets position.
        </p>
        <div className="grid max-w-md gap-4 sm:grid-cols-2">
          <Select
            label="expandVariant"
            options={[...expandVariantOptions]}
            value={expandVariant}
            onChange={(value) => setExpandVariant(value as ImageDragCarouselExpandVariant)}
          />
        </div>
        <BandGallery
          key={`band-${expandVariant}`}
          images={demoImages}
          label="Band gallery demo"
          expandVariant={expandVariant}
        />
      </section>
        </>
      ) : null}

      {panel === 'motion' ? (
        <>
      <section className="space-y-4">
        <p className="type-overline">Spiral gallery</p>
        <p className="type-body-sm type-muted prose-measure">
          WebGL infinite spiral loop — photos on a deformed 3D helix with scroll inertia and camera
          zoom. Port of <code className="type-code">ref.image-carousel-6</code>. Tap a photo to
          expand — same <strong>expandVariant</strong> as the other galleries. Longer helix (+2 turns)
          tiles the source set on the atlas so spacing matches ref density.{' '}
          <strong>vanishing</strong> — top/bottom edge fade (on by default).{' '}
          <strong>tiltControl</strong> — <strong>auto</strong> scroll drift, <strong>prop</strong>{' '}
          fixed preset tilt, or <strong>drag</strong> pointer tilt. Scroll or swipe to advance;{' '}
          <strong>←</strong> / <strong>→</strong> zoom.
        </p>
        <div className="grid max-w-3xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            label="expandVariant"
            options={[...expandVariantOptions]}
            value={expandVariant}
            onChange={(value) => setExpandVariant(value as ImageDragCarouselExpandVariant)}
          />
          <Select
            label="vanishing"
            options={[...spiralVanishingOptions]}
            value={spiralVanishing}
            onChange={setSpiralVanishing}
          />
          <Select
            label="tiltControl"
            options={[...spiralTiltControlOptions]}
            value={spiralTiltControl}
            onChange={setSpiralTiltControl}
          />
          <Select
            label="tilt preset"
            options={[...spiralTiltPresetOptions]}
            value={spiralTiltPreset}
            onChange={setSpiralTiltPreset}
            disabled={spiralTiltControl !== 'prop'}
          />
        </div>
        <SpiralGallery
          key={`spiral-${expandVariant}-${spiralVanishing}-${spiralTiltControl}-${spiralTiltPreset}`}
          images={demoImages}
          label="Spiral gallery demo"
          expandVariant={expandVariant}
          vanishing={spiralVanishingProp}
          tiltControl={spiralTiltControl as 'auto' | 'prop' | 'drag'}
          tilt={spiralTiltControl === 'prop' ? spiralTilt : undefined}
        />
      </section>

      <section className="space-y-4">
        <p className="type-overline">Morph gallery</p>
        <p className="type-body-sm type-muted prose-measure">
          WebGL FBM noise dissolve between slides — prev/next, thumb strip, keyboard arrows (ref{' '}
          <code className="type-code">image-carousel-8</code>). GSAP morph variant in{' '}
          <strong>GSAP transitions</strong> → <strong>WebGL morph dissolve</strong>.
        </p>
        <MorphGallery images={morphDemoImages} label="Morph gallery demo" />
      </section>

      <section className="space-y-4">
        <p className="type-overline">Shape morph gallery</p>
        <p className="type-body-sm type-muted prose-measure">
          SVG mask path morph between pixel silhouettes — auto-advancing loop with image crossfade at
          mid-morph (ref <code className="type-code">image-carousel-9</code>). GSAP variant in{' '}
          <strong>GSAP transitions</strong> → <strong>SVG shape morph</strong>.
        </p>
        <ShapeMorphGallery slides={SHAPE_MORPH_GALLERY_DEMO_SLIDES} label="Shape morph gallery demo" />
      </section>

      <section className="space-y-4">
        <p className="type-overline">Neuron field filter</p>
        <p className="type-body-sm type-muted prose-measure">
          Canvas ASCII dot field with neuron sparks and pointer hotspot (
          <code className="type-code">ref.image-effect-1</code>).{' '}
          <code className="type-code">NeuronFieldImage</code> for a single photo;{' '}
          <code className="type-code">NeuronFieldGallery</code> for dot-nav carousel. Palette uses
          theme accent from the palette picker — same dark filter look in light and dark theme.
        </p>
        <div className="grid max-w-3xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            label="mode"
            options={[...neuronModeOptions]}
            value={neuronMode}
            onChange={setNeuronMode}
          />
          <Select
            label="dotSize"
            options={[...dotSizeOptions]}
            value={neuronDotSize}
            onChange={setNeuronDotSize}
          />
          <Select
            label="neuronIntensity"
            options={[...neuronIntensityOptions]}
            value={neuronIntensity}
            onChange={setNeuronIntensity}
          />
          <Select
            label="motion"
            options={[...neuronMotionOptions]}
            value={neuronMotion}
            onChange={setNeuronMotion}
          />
        </div>
        {neuronMode === 'carousel' ? (
          <NeuronFieldGallery
            key={`carousel-${neuronDotSize}-${neuronIntensity}-${neuronMotion}`}
            images={neuronFieldDemoImages}
            label="Neuron field carousel demo"
            dotSize={Number.parseInt(neuronDotSize, 10)}
            neuronIntensity={Number.parseFloat(neuronIntensity)}
            motion={neuronMotion === 'on'}
          />
        ) : (
          <NeuronFieldImage
            key={`static-${neuronDotSize}-${neuronIntensity}-${neuronMotion}`}
            src={neuronFieldDemoImage.src}
            alt={neuronFieldDemoImage.alt}
            label="Neuron field image demo"
            dotSize={Number.parseInt(neuronDotSize, 10)}
            neuronIntensity={Number.parseFloat(neuronIntensity)}
            motion={neuronMotion === 'on'}
          />
        )}
      </section>

      <section className="space-y-4">
        <p className="type-overline">Drag image carousel</p>
        <p className="type-body-sm type-muted prose-measure">
          Tap a slide to expand. <strong>detail</strong> — accordion panel + copy (slides{' '}
          <strong>01</strong>, <strong>02</strong>, <strong>04</strong>). <strong>image</strong> —
          fixed card. <strong>native</strong> — card sizes to the photo at max stage fill.{' '}
          <strong>focusThin</strong> — off-center slides fade/desaturate + faster wheel (ref{' '}
          <code className="type-code">image-carousel-2</code>). <strong>glEffects</strong> —
          WebGL velocity ribbon + chromatic smear while scrolling (ref{' '}
          <code className="type-code">image-carousel-7</code>). <strong>autoScroll</strong> — soft
          auto-advance (pauses on hover, drag, or expand).
        </p>

        <div className="grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Select
            label="expandVariant"
            options={[...expandVariantOptions]}
            value={expandVariant}
            onChange={(value) => setExpandVariant(value as ImageDragCarouselExpandVariant)}
          />
          <Select
            label="vanishing"
            options={[...vanishingOptions]}
            value={vanishing}
            onChange={setVanishing}
          />
          <Select
            label="showDotNav"
            options={[...dotNavOptions]}
            value={showDotNav}
            onChange={setShowDotNav}
          />
          <Select
            label="focusThin"
            options={[...focusThinOptions]}
            value={focusThin}
            onChange={setFocusThin}
          />
          <Select
            label="autoScroll"
            options={[...autoScrollOptions]}
            value={autoScroll}
            onChange={setAutoScroll}
          />
          <Select
            label="glEffects"
            options={[...glEffectsOptions]}
            value={dragGlEffects}
            onChange={setDragGlEffects}
          />
        </div>

        <ImageDragCarousel
          key={`${expandVariant}-${vanishing}-${showDotNav}-${focusThin}-${autoScroll}-${dragGlEffects}`}
          images={demoImages}
          label="Drag image carousel demo"
          expandVariant={expandVariant}
          vanishing={vanishingProp}
          showDotNav={showDotNav === 'on'}
          focusThin={focusThin === 'on'}
          autoScroll={autoScrollProp}
          glEffects={dragGlEffects === 'on'}
        />
      </section>
        </>
      ) : null}

      {panel === 'webgpu' ? (
        <>
          <section className="space-y-4">
            <p className="type-overline">WebGPU mode transitions</p>
            <p className="type-body-sm type-muted prose-measure">
              Port of{' '}
              <a
                className="type-link"
                href="https://github.com/bnpne/page-transitions-with-webgpu-vanilla-js"
                target="_blank"
                rel="noopener noreferrer"
              >
                bnpne/page-transitions-with-webgpu-vanilla-js
              </a>{' '}
              (Codrops) — infinite horizontal carousel (<strong>Selected</strong>), draggable 3D{' '}
              <strong>Index</strong>, and vertical detail stacks with shared WebGPU planes morphing
              between layouts via GSAP. Wheel the carousel; click a slide or footer number for inner
              mode; use nav to switch Selected ↔ Index.
            </p>
            <WebGpuTransitionGallery images={webGpuDemoImages} label="WebGPU transition gallery demo" />
          </section>

          <section className="space-y-4">
            <p className="type-overline">WebGPU isometric accordion</p>
            <p className="type-body-sm type-muted prose-measure">
              Numbered copy + oblique image decks. Use the effect Select to cycle gallery handoffs:
              hover expand, click-focus filmstrip, GSAP Flip morph, mounted drag carousel of siblings,
              portal overlay gallery, or expand-one with a centered thrice-stack that fans into a
              seamless text | stack horizontal browse on hover. Esc / Back closes click-focus modes.
            </p>
            <div className="flex flex-wrap gap-3">
              <Select
                label="effect"
                options={[...WEBGPU_ISO_ACCORDION_EFFECT_OPTIONS]}
                value={isoAccordionEffect}
                onChange={(value) => setIsoAccordionEffect(value as WebGpuIsometricAccordionEffect)}
              />
            </div>
            <WebGpuIsometricAccordion effect={isoAccordionEffect} />
          </section>

          <section className="space-y-4">
            <p className="type-overline">Feature group card</p>
            <p className="type-body-sm type-muted prose-measure">
              A bent still for a feature group. Prev/next cycle Security,
              Live interview, and Output card. Hover a tag for its caption on the
              darkened media.
            </p>
            <div className="flex flex-wrap gap-3">
              <Select
                label="bowl"
                options={[
                  { value: 'concave', label: 'concave' },
                  { value: 'convex', label: 'convex' },
                ]}
                value={cardBowl}
                onChange={(value) => setCardBowl(value as 'concave' | 'convex')}
              />
            </div>
            <Slider
              label="curve"
              min={0}
              max={1}
              step={0.05}
              value={cardCurve}
              onChange={setCardCurve}
              showValue
            />
            <CurvedMonitorCard curvature={cardCurvature} curve={cardCurve} />
          </section>

          <section className="space-y-4">
            <p className="type-overline">Nav card</p>
            <p className="type-body-sm type-muted prose-measure">
              Hold variant: groupings live on the edge tags. No title, dots, or
              prev/next. Hover cycles the groups; caption splits each mini section
              with a tag and a hairline.
            </p>
            <CurvedMonitorCard
              variant="nav"
              groups={NAV_FEATURE_GROUPS}
              curvature={cardCurvature}
              curve={cardCurve}
            />
          </section>
        </>
      ) : null}
    </div>
  )
}

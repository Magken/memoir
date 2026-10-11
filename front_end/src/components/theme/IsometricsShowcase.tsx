import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { IsometricCssWords } from '../IsometricCssWords'
import { IsometricCssWordsScrollCard } from '../IsometricCssWordsScrollCard'
import { IsometricPlane } from '../IsometricPlane'
import { IsometricScene } from '../IsometricScene'
import { IsometricScrollCard } from '../IsometricScrollCard'
import { IsometricSliceText } from '../IsometricSliceText'
import { IsometricSpaceViewer } from '../IsometricSpaceViewer'
import { IsometricWordCloud } from '../IsometricWordCloud'
import { TypeWordCloud } from '../TypeWordCloud'
import { Button } from '../Button'
import { Select } from '../Select'
import { isDarkPalette, useThemeColor } from '../../lib/theme'
import type { ThemePalette, ThemePaletteId } from '../../lib/theme/colorPalettes'
import type { IsometricVariant } from '../../lib/isometrics/isometricEffects'
import type {
  IsometricWordCloudCameraView,
  IsometricWordCloudFocus,
} from '../../lib/isometrics/isometricWordCloud'
import gsap from '../../lib/gsap'
import {
  ISOMETRIC_PLANE_HOVER_FROM,
  ISOMETRIC_PLANE_SHOWCASE_GROUPS,
  isometricPlaneCanAnimateOnHover,
  isometricPlaneCanAnimateToIso,
  isometricPlaneOrientation,
  isometricPlaneStagePerspective,
  isometricPlaneTransformSummary,
  type IsometricPlaneOrientationId,
} from '../../lib/isometrics/isometricPlanes'
import type {
  IsometricCssWordsLayout,
  IsometricFollowMode,
  IsometricPlaneBorderMode,
  IsometricSliceTextLayout,
} from '../../lib/isometrics/isometricScroll'
import {
  ISOMETRIC_CSS_WORDS_LAYOUT_OPTIONS,
  ISOMETRIC_FOLLOW_OPTIONS,
  ISOMETRIC_LABEL_TRANSLATE_OPTIONS,
  ISOMETRIC_PIVOT_TRANSLATE_OPTIONS,
  ISOMETRIC_PLANE_BORDER_OPTIONS,
  ISOMETRIC_SLICE_DENSITY_OPTIONS,
  ISOMETRIC_SLICE_LAYOUT_OPTIONS,
  ISOMETRIC_SLICE_TRAVEL_OPTIONS,
  ISOMETRIC_VARIANT_OPTIONS,
  isometricPlaneBordersFromMode,
} from '../../lib/isometrics/isometricScroll'

const isometricTypeLines = ['Display', 'Driven', 'Type'] as const

/** Ref `isometric2` phrase — demonstrates auto row count + slot width from lines alone. */
const isometricCssWordsRefPhrase = `CSS Only
Perspective
Text Effect
by
James
Bosworth`

const isometricSliceRefPhrase = 'Display Driven Type'

type WordCloudColorId =
  | 'accent'
  | 'complement'
  | 'text'
  | 'white'
  | 'black'
  | 'ref-blue'

const wordCloudColorOptions = [
  { value: 'accent', label: 'Theme accent' },
  { value: 'complement', label: 'Theme complement' },
  { value: 'text', label: 'Theme text' },
  { value: 'white', label: 'White' },
  { value: 'black', label: 'Black' },
  { value: 'ref-blue', label: 'Reference blue' },
] as const

function resolveWordCloudColor(id: WordCloudColorId, palette: ThemePalette): string {
  if (id === 'accent') return palette.accent
  if (id === 'complement') return palette.complement
  if (id === 'text') return palette.text
  if (id === 'black') return '#000000'
  if (id === 'ref-blue') return '#6eb9ff'
  return '#FFFFFF'
}

/** Fog “White” follows the stage: page white on light palettes, pageBg on dark. */
function resolveWordCloudFogColor(
  id: WordCloudColorId,
  palette: ThemePalette,
  paletteId: ThemePaletteId,
): string {
  if (id === 'white' && isDarkPalette(paletteId)) return palette.pageBg
  return resolveWordCloudColor(id, palette)
}

const animateToIsoOptions = ISOMETRIC_PLANE_SHOWCASE_GROUPS.flatMap((g) => g.ids).filter(
  isometricPlaneCanAnimateToIso,
)

const hoverDemoIds: IsometricPlaneOrientationId[] = [
  'iso-classic',
  'iso-card',
  'wall-left',
  'plan-top',
  'oblique-right',
]

export function IsometricsShowcase() {
  const { palette, paletteId } = useThemeColor()
  const [isometricMode, setIsometricMode] = useState<IsometricFollowMode>('mouse')
  const [isometricVariant, setIsometricVariant] = useState<IsometricVariant>('spread')
  const [isometricPlaneBorders, setIsometricPlaneBorders] = useState<IsometricPlaneBorderMode>('on')
  const [isometricPivotTranslate, setIsometricPivotTranslate] = useState('1')
  const [isometricLabelTranslate, setIsometricLabelTranslate] = useState('1')
  const [cssWordsLayout, setCssWordsLayout] = useState<IsometricCssWordsLayout>('diagonal')
  const [sliceLayout, setSliceLayout] = useState<IsometricSliceTextLayout>('ref')
  const [sliceDensity, setSliceDensity] = useState('1')
  const [sliceTravel, setSliceTravel] = useState('1')
  const [wordCloudLayout, setWordCloudLayout] = useState<IsometricSliceTextLayout>('ref')
  const [wordCloudDensity, setWordCloudDensity] = useState('1')
  const [wordCloudTravel, setWordCloudTravel] = useState('1')
  const [animatePlaneId, setAnimatePlaneId] = useState<IsometricPlaneOrientationId>('iso-classic')
  const [animateReplay, setAnimateReplay] = useState(0)
  const [wordCloudTextColor, setWordCloudTextColor] = useState<WordCloudColorId>('white')
  const [wordCloudGlowColor, setWordCloudGlowColor] = useState<WordCloudColorId>('complement')
  const [wordCloudCoolLightColor, setWordCloudCoolLightColor] =
    useState<WordCloudColorId>('white')
  const [wordCloudWarmLightColor, setWordCloudWarmLightColor] =
    useState<WordCloudColorId>('white')
  const [wordCloudFogColor, setWordCloudFogColor] = useState<WordCloudColorId>('white')
  const [wordCloudCameraView, setWordCloudCameraView] =
    useState<IsometricWordCloudCameraView>('front')
  const [wordCloudFocus, setWordCloudFocus] = useState<IsometricWordCloudFocus>('all')
  const [wordCloudEdgeShade, setWordCloudEdgeShade] = useState('0.55')
  const [wordCloudWaveEnabled, setWordCloudWaveEnabled] = useState(false)
  const [wordCloudMode, setWordCloudMode] = useState<'cloud' | 'loading'>('cloud')
  const [wordCloudLoadingKey, setWordCloudLoadingKey] = useState(0)
  const [wordCloudProgress, setWordCloudProgress] = useState<number | undefined>(undefined)
  const loadingFeedRef = useRef<ReturnType<typeof gsap.to> | null>(null)

  useEffect(() => {
    return () => {
      loadingFeedRef.current?.kill()
    }
  }, [])

  return (
    <div className="space-y-12">
      <section className="space-y-4">
        <p className="type-overline">Plane animation</p>
        <p className="type-body-sm type-muted prose-measure">
          <code className="type-code">animateToIso</code> — flat screen → target on mount.{' '}
          <code className="type-code">animateOnHover</code> —{' '}
          <code className="type-code">{ISOMETRIC_PLANE_HOVER_FROM}</code> → target on pointer enter
          (GSAP). Respects <code className="type-code">prefers-reduced-motion</code>.
        </p>
        <p className="type-label mb-0">Enter — flat → iso</p>
        <div className="flex flex-wrap items-end gap-4">
          <Select
            label="viewpoint"
            options={animateToIsoOptions.map((id) => ({
              value: id,
              label: isometricPlaneOrientation(id).label,
            }))}
            value={animatePlaneId}
            onChange={(value) => setAnimatePlaneId(value as IsometricPlaneOrientationId)}
          />
          <Button type="button" variant="outline" size="sm" onClick={() => setAnimateReplay((n) => n + 1)}>
            Replay
          </Button>
        </div>
        <div className="theme-card theme-card--flat max-w-md p-0">
          <div
            className="theme-isometric-plane-stage"
            style={{ '--iso-plane-perspective': '1200px' } as CSSProperties}
          >
            <IsometricPlane
              key={`${animatePlaneId}-${animateReplay}`}
              orientation={animatePlaneId}
              animateToIso
            >
              <div className="theme-card theme-card--outline theme-isometric-plane__surface w-full max-w-[12rem] p-4 shadow-sm">
                <p className="type-caption mb-1">{isometricPlaneOrientation(animatePlaneId).label}</p>
                <p className="type-body-sm type-muted mb-0">Flat → iso on enter</p>
              </div>
            </IsometricPlane>
          </div>
        </div>
        <p className="type-label mb-0 mt-6">Hover — wall-front → iso</p>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {hoverDemoIds.filter((id) => isometricPlaneCanAnimateOnHover(id)).map((id) => {
            const plane = isometricPlaneOrientation(id)
            return (
              <li key={id} className="theme-card theme-card--flat theme-isometric-plane-demo p-0">
                <div
                  className="theme-isometric-plane-stage theme-isometric-plane-stage--wall"
                  style={{ '--iso-plane-perspective': '880px' } as CSSProperties}
                >
                  <IsometricPlane orientation={id} animateOnHover animateFrom={ISOMETRIC_PLANE_HOVER_FROM}>
                    <div className="theme-card theme-card--outline theme-isometric-plane__surface w-full p-3 shadow-sm">
                      <p className="type-caption mb-0">{plane.label}</p>
                    </div>
                  </IsometricPlane>
                </div>
                <div className="theme-isometric-plane-demo__meta">
                  <p className="theme-isometric-plane-demo__id">
                    {ISOMETRIC_PLANE_HOVER_FROM} → {id}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="space-y-6">
        <p className="type-overline">Plane viewpoints</p>
        <p className="type-body-sm type-muted prose-measure">
          True CSS isometric uses <code className="type-code">perspective</code> on the stage and{' '}
          <code className="type-code">rotateX</code> + <code className="type-code">rotateZ</code> on
          the plane (Tuts+ 60°/−45°, Codrops 65°/45°, 30sec card 51°/43°). Walls use{' '}
          <code className="type-code">rotateY</code>. SVG spread halves use skew — listed separately.
        </p>
        <div className="grid gap-8">
          {ISOMETRIC_PLANE_SHOWCASE_GROUPS.map((group) => (
            <div key={group.title} className="theme-isometric-plane-showcase-group">
              <div className="theme-isometric-plane-showcase-group__head">
                <p className="type-label mb-0">{group.title}</p>
                <p className="type-caption type-muted mb-0">{group.caption}</p>
              </div>
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {group.ids.map((id) => {
                  const plane = isometricPlaneOrientation(id)
                  const stageClass = [
                    'theme-isometric-plane-stage',
                    plane.category === 'wall' ? 'theme-isometric-plane-stage--wall' : '',
                    plane.category === 'spread-skew' ? 'theme-isometric-plane-stage--spread-skew' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')
                  return (
                    <li key={id} className="theme-card theme-card--flat theme-isometric-plane-demo p-0">
                      <div
                        className={stageClass}
                        style={
                          {
                            '--iso-plane-perspective': `${isometricPlaneStagePerspective(plane.category)}px`,
                          } as CSSProperties
                        }
                      >
                        <IsometricPlane orientation={id}>
                          <div className="theme-card theme-card--outline theme-isometric-plane__surface w-full max-w-[10.5rem] p-4 shadow-sm">
                            <p className="type-caption mb-1">{plane.label}</p>
                            <p className="type-body-sm type-muted mb-0">{plane.description}</p>
                          </div>
                        </IsometricPlane>
                      </div>
                      <div className="theme-isometric-plane-demo__meta">
                        <p className="theme-isometric-plane-demo__id">{plane.id}</p>
                        <p className="theme-isometric-plane-demo__transform">
                          {isometricPlaneTransformSummary(plane)}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-8">
        <p className="type-overline">Isometric type</p>
        <p className="type-body-sm type-muted prose-measure">
          Three ports of axonometric display type — <strong>CSS stack</strong>{' '}
          (<code className="type-code">ref.isometric2</code>) · <strong>SVG + GSAP</strong>{' '}
          (<code className="type-code">ref.isometric1</code>) · <strong>GSAP slice columns</strong>{' '}
          (<code className="type-code">ref.isometric3</code>). Each line sits in a bounded clip slot
          (ref row height / registry <code className="type-code">lineStep</code>) — text travel scrubs
          between fixed enter and rest poses. Turn on <strong>planes</strong> to outline half-planes and
          per-line slots.
        </p>

        <div className="grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            label="follow"
            options={[...ISOMETRIC_FOLLOW_OPTIONS]}
            value={isometricMode}
            onChange={(value) => setIsometricMode(value as IsometricFollowMode)}
          />
          <Select
            label="planes"
            options={[...ISOMETRIC_PLANE_BORDER_OPTIONS]}
            value={isometricPlaneBorders}
            onChange={(value) => setIsometricPlaneBorders(value as IsometricPlaneBorderMode)}
          />
          <Select
            label="text travel"
            options={[...ISOMETRIC_LABEL_TRANSLATE_OPTIONS]}
            value={isometricLabelTranslate}
            onChange={(value) => setIsometricLabelTranslate(value)}
          />
          <Select
            label="CSS layout"
            options={[...ISOMETRIC_CSS_WORDS_LAYOUT_OPTIONS]}
            value={cssWordsLayout}
            onChange={(value) => setCssWordsLayout(value as IsometricCssWordsLayout)}
          />
        </div>

        <div className="space-y-4">
          <p className="type-label mb-0">CSS stack — hover or scrub</p>
          <p className="type-body-sm type-muted prose-measure">
            Pass a phrase as an array or newline string —{' '}
            <code className="type-code">isometricCssWordsStackMetrics()</code> builds row pairs, left
            step span, slot width, and scene height from line count and longest word. Each{' '}
            <code className="type-code">.theme-isometric-css-words__line</code> is one bounded slot.
          </p>
          {isometricMode === 'scroll' ? (
            <IsometricCssWordsScrollCard
              lines={cssWordsLayout === 'vertical' ? isometricCssWordsRefPhrase : isometricTypeLines}
              layout={cssWordsLayout}
              typeClass="type-display"
              showPlaneBorders={isometricPlaneBordersFromMode(isometricPlaneBorders)}
              labelTranslate={Number(isometricLabelTranslate)}
            />
          ) : (
            <div className="theme-card theme-card--flat overflow-hidden p-0">
              <IsometricCssWords
                lines={cssWordsLayout === 'vertical' ? isometricCssWordsRefPhrase : isometricTypeLines}
                layout={cssWordsLayout}
                typeClass="type-display"
                mouseFollow={isometricMode === 'mouse'}
                showPlaneBorders={isometricPlaneBordersFromMode(isometricPlaneBorders)}
                labelTranslate={Number(isometricLabelTranslate)}
              />
              <p className="type-caption type-muted px-6 pb-6 pt-4 mb-0">
                {isometricMode === 'mouse'
                  ? cssWordsLayout === 'vertical'
                    ? 'Move the pointer vertically — one slot per line.'
                    : 'Move the pointer horizontally — one slot per line.'
                  : 'Hover the stack to advance words · `.theme-isometric-css-words`'}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <p className="type-label mb-0">SVG + GSAP — scrubbed spread</p>
          <p className="type-body-sm type-muted prose-measure">
            Split display type in a masked SVG —{' '}
            <code className="type-code">variant=&quot;spread&quot;</code> adds ref group{' '}
            <code className="type-code">x</code> translation;{' '}
            <code className="type-code">variant=&quot;static&quot;</code> keeps both skewed planes
            pinned at <code className="type-code">ISOMETRIC_SPACE.pivot</code> (
            <code className="type-code">640×500</code>) and only slides the text. Frame: XY screen,{' '}
            <code className="type-code">−Z</code> viewer —{' '}
            <code className="type-code">isometricSpace.ts</code>.
          </p>
        <div className="grid max-w-4xl gap-4 sm:grid-cols-2">
          <Select
            label="variant"
            options={[...ISOMETRIC_VARIANT_OPTIONS]}
            value={isometricVariant}
            onChange={(value) => setIsometricVariant(value as IsometricVariant)}
          />
          <Select
            label="pivot translate"
            options={[...ISOMETRIC_PIVOT_TRANSLATE_OPTIONS]}
            value={isometricPivotTranslate}
            onChange={(value) => setIsometricPivotTranslate(value)}
          />
        </div>
        {isometricMode === 'scroll' ? (
          <IsometricScrollCard
            lines={isometricTypeLines}
            typeClass="type-display"
            variant={isometricVariant}
            showPlaneBorders={isometricPlaneBordersFromMode(isometricPlaneBorders)}
            pivotTranslate={Number(isometricPivotTranslate)}
            labelTranslate={Number(isometricLabelTranslate)}
          />
        ) : (
          <div className="theme-card theme-card--flat overflow-hidden p-0">
            <IsometricScene
              lines={isometricTypeLines}
              variant={isometricVariant}
              mouseFollow={isometricMode === 'mouse'}
              scrollFollow={false}
              typeClass="type-display"
              showPlaneBorders={isometricPlaneBordersFromMode(isometricPlaneBorders)}
              pivotTranslate={Number(isometricPivotTranslate)}
              labelTranslate={Number(isometricLabelTranslate)}
            />
            <p className="type-caption type-muted px-6 pb-6 pt-4 mb-0">
              {isometricMode === 'mouse'
                ? isometricVariant === 'spread-x' || isometricVariant === 'static-x'
                  ? 'Move the pointer vertically — ref e.y / innerHeight.'
                  : 'Move the pointer across the viewport — ref e.x / innerWidth.'
                : isometricVariant === 'static' || isometricVariant === 'static-x'
                  ? 'Skewed planes stay at the intersection — only text slides.'
                  : 'Mid-spread pose at scrub progress 0.5.'}
            </p>
          </div>
        )}
        <IsometricSpaceViewer variant={isometricVariant} />
        </div>

        <div className="space-y-4">
          <p className="type-label mb-0">GSAP slice columns — pointer scrub</p>
          <p className="type-body-sm type-muted prose-measure">
            Vertical <code className="type-code">text-indent</code> slices duplicate the phrase — pointer X
            scrubs a paused stagger timeline; wrapper shifts on axonometric{' '}
            <code className="type-code">rotate/skew</code>. Press scoops slices + blurs source (
            <code className="type-code">ref.isometric3</code>).
          </p>
          <div className="grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Select
              label="wrapper layout"
              options={[...ISOMETRIC_SLICE_LAYOUT_OPTIONS]}
              value={sliceLayout}
              onChange={(value) => setSliceLayout(value as IsometricSliceTextLayout)}
            />
            <Select
              label="slice density"
              options={[...ISOMETRIC_SLICE_DENSITY_OPTIONS]}
              value={sliceDensity}
              onChange={setSliceDensity}
            />
            <Select
              label="slice travel"
              options={[...ISOMETRIC_SLICE_TRAVEL_OPTIONS]}
              value={sliceTravel}
              onChange={setSliceTravel}
            />
          </div>
          <div className="theme-card theme-card--flat overflow-hidden p-0">
            <IsometricSliceText
              key={`${sliceLayout}-${sliceDensity}-${sliceTravel}`}
              text={isometricSliceRefPhrase}
              typeClass="type-display"
              layout={sliceLayout}
              sliceDensity={Number(sliceDensity)}
              sliceTravel={Number(sliceTravel)}
              mouseFollow
              pressInteraction
            />
            <p className="type-caption type-muted px-6 pb-6 pt-4 mb-0">
              Move pointer horizontally to scrub slices · press to scoop · elastic intro on enter
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <p className="type-label mb-0">Type word cloud — pointer scrub</p>
          <p className="type-body-sm type-muted prose-measure">
            Display font · accent · spiral pack. Same interaction model as GSAP slice columns —
            pointer X scrubs a paused stagger timeline; axonometric{' '}
            <code className="type-code">rotate/skew</code> wrapper shifts. Press scoops + soft blur.
          </p>
          <div className="grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Select
              label="wrapper layout"
              options={[...ISOMETRIC_SLICE_LAYOUT_OPTIONS]}
              value={wordCloudLayout}
              onChange={(value) => setWordCloudLayout(value as IsometricSliceTextLayout)}
            />
            <Select
              label="slice density"
              options={[...ISOMETRIC_SLICE_DENSITY_OPTIONS]}
              value={wordCloudDensity}
              onChange={setWordCloudDensity}
            />
            <Select
              label="slice travel"
              options={[...ISOMETRIC_SLICE_TRAVEL_OPTIONS]}
              value={wordCloudTravel}
              onChange={setWordCloudTravel}
            />
          </div>
          <div className="theme-card theme-card--flat overflow-hidden p-0">
            <TypeWordCloud
              key={`wc-${wordCloudLayout}-${wordCloudDensity}-${wordCloudTravel}`}
              layout={wordCloudLayout}
              sliceDensity={Number(wordCloudDensity)}
              sliceTravel={Number(wordCloudTravel)}
              mouseFollow
              pressInteraction
            />
            <p className="type-caption type-muted px-6 pb-6 pt-4 mb-0">
              Move pointer horizontally to scrub · press to scoop · elastic intro on enter
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <p className="type-label mb-0">Extruded 3D word cloud — spiral pack</p>
          <p className="type-body-sm type-muted prose-measure">
            Wordle / <code className="type-code">d3-cloud</code> arrangement — large center{' '}
            <code className="type-code">V</code>, weighted sizes, mixed rotations, tight spiral
            packing. Depth / fog / lights stay on <code className="type-code">ref.isometric4</code>.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Select
              label="Text"
              options={wordCloudColorOptions}
              value={wordCloudTextColor}
              onChange={(value) => setWordCloudTextColor(value as WordCloudColorId)}
            />
            <Select
              label="Glow"
              options={wordCloudColorOptions}
              value={wordCloudGlowColor}
              onChange={(value) => setWordCloudGlowColor(value as WordCloudColorId)}
            />
            <Select
              label="Cool light"
              options={wordCloudColorOptions}
              value={wordCloudCoolLightColor}
              onChange={(value) => setWordCloudCoolLightColor(value as WordCloudColorId)}
            />
            <Select
              label="Warm light"
              options={wordCloudColorOptions}
              value={wordCloudWarmLightColor}
              onChange={(value) => setWordCloudWarmLightColor(value as WordCloudColorId)}
            />
            <Select
              label="Fog / stage"
              options={wordCloudColorOptions}
              value={wordCloudFogColor}
              onChange={(value) => setWordCloudFogColor(value as WordCloudColorId)}
            />
            <Select
              label="Edge shade"
              options={[
                { value: '0', label: 'Off' },
                { value: '0.3', label: 'Soft' },
                { value: '0.55', label: 'Medium' },
                { value: '0.8', label: 'Strong' },
                { value: '1', label: 'Max' },
              ]}
              value={wordCloudEdgeShade}
              onChange={setWordCloudEdgeShade}
            />
          </div>
          <div className="theme-card theme-card--flat overflow-hidden p-0">
            <IsometricWordCloud
              mouseFollow={isometricMode !== 'off'}
              wordColor={resolveWordCloudColor(wordCloudTextColor, palette)}
              emissiveColor={resolveWordCloudColor(wordCloudGlowColor, palette)}
              coolLightColor={resolveWordCloudColor(wordCloudCoolLightColor, palette)}
              warmLightColor={resolveWordCloudColor(wordCloudWarmLightColor, palette)}
              fogColor={resolveWordCloudFogColor(wordCloudFogColor, palette, paletteId)}
              cameraView={wordCloudCameraView}
              focus={wordCloudFocus}
              edgeShade={Number(wordCloudEdgeShade)}
              waveEnabled={wordCloudWaveEnabled && wordCloudMode !== 'loading'}
              mode={wordCloudMode}
              loadingKey={wordCloudLoadingKey}
              progress={wordCloudProgress}
              onLoadingComplete={() => {
                setWordCloudMode('cloud')
                setWordCloudProgress(undefined)
              }}
            />
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 pb-6 pt-4">
              <p className="type-caption type-muted mb-0">
                Audience focus sends nonmatching words through fog · loading locks pointer
              </p>
              <div className="flex flex-wrap gap-2">
                {(['all', 'hire', 'apply'] as const).map((focus) => (
                  <Button
                    key={focus}
                    type="button"
                    variant="outline"
                    size="sm"
                    active={wordCloudFocus === focus}
                    disabled={wordCloudMode === 'loading'}
                    onClick={() => setWordCloudFocus(focus)}
                  >
                    {focus === 'all' ? 'All words' : focus === 'hire' ? 'Hire words' : 'Apply words'}
                  </Button>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    loadingFeedRef.current?.kill()
                    setWordCloudMode('loading')
                    setWordCloudProgress(0)
                    setWordCloudLoadingKey((value) => value + 1)
                    const proxy = { value: 0 }
                    loadingFeedRef.current = gsap.to(proxy, {
                      value: 100,
                      duration: 3.2,
                      ease: 'none',
                      onUpdate: () => setWordCloudProgress(Math.round(proxy.value)),
                    })
                  }}
                >
                  Play loading
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  active={wordCloudWaveEnabled}
                  disabled={wordCloudMode === 'loading'}
                  onClick={() => setWordCloudWaveEnabled((enabled) => !enabled)}
                >
                  {wordCloudWaveEnabled ? 'Wave off' : 'Wave on'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setWordCloudCameraView((view) => (view === 'front' ? 'oblique' : 'front'))
                  }
                >
                  {wordCloudCameraView === 'front' ? 'Oblique view' : 'Front view'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

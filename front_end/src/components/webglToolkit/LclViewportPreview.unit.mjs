/**
 * Full-viewport LCL canvas: s1 holds four scroll-enter titles with slide-left hover.
 * Run: node front_end/src/components/webglToolkit/LclViewportPreview.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const src = fs.readFileSync(fileURLToPath(new URL('./LclViewportPreview.tsx', import.meta.url)), 'utf8')

assert.match(src, /export const LclViewportPreview/)
assert.match(src, /useImperativeHandle/)
assert.match(src, /leave:/)
assert.match(src, /ScrollEnterText/)
assert.match(src, /TypeAnimText/)
assert.match(src, /anim="slide-left"/)
assert.match(src, /trigger="hover"/)
assert.match(src, /GrasUnderlineButton/)
assert.match(src, /layout="nest"/)
assert.match(src, /applyScrollHairline/)
assert.match(src, /theme-hairline-fx__wipe/)
assert.match(src, /theme-hairline-fx__rule/)
assert.doesNotMatch(
  src,
  /className="theme-lcl-layout__nest-item/,
  'negative: nest rows use GrasUnderlineButton, not hand-rolled nest class strings',
)
assert.match(src, /split="line"/)
assert.match(src, /DISPLAY_TITLE = 'Title'/)
assert.match(src, /type-display-lg/)
assert.match(src, /section.id === 's2'/)
assert.match(src, /theme-lcl-preview__display-head[\s\S]{0,800}theme-hairline-fx__rule/)
assert.doesNotMatch(
  src,
  /theme-lcl-preview__display-head[\s\S]{0,800}theme-hairline-fx--eirene/,
  'negative: Title divider is not the hover pill',
)
assert.doesNotMatch(
  src,
  /theme-lcl-preview__display-head[\s\S]{0,800}theme-hairline-fx__pill/,
  'negative: Title divider is a 1px rule, not the Eirene pill',
)
assert.match(src, /KINDLING_NEST/)
assert.match(src, /NEST_BY_PARENT/)
assert.match(src, /Ember/)
assert.match(src, /path\.join/)
assert.match(src, /titlesForPath/)
assert.match(src, /LclBreadcrumb/)
assert.match(src, /rootLabel=\{DISPLAY_TITLE\}/)
assert.match(src, /onSelect=\{\(depth\) => void goToDepth\(depth\)\}/)
assert.match(src, /goToDepth/)
assert.doesNotMatch(src, /crumbsForPath/, 'negative: trail rules live in LclBreadcrumb, not the preview')
assert.doesNotMatch(src, /theme-lcl-preview__crumb/, 'negative: crumb chrome is the breadcrumb element')
assert.doesNotMatch(
  src,
  /NEST_BY_PARENT:\s*Record<string,\s*string\[\]>\s*=\s*\{\s*\}/,
  'negative: Kindling must expose a nested list for LCL layer testing',
)
assert.doesNotMatch(src, /closeItem/, 'negative: crumb segments use goToDepth, not a single close')
assert.doesNotMatch(src, /crumbLabelForPath/, 'negative: trail replaced the single crumb label')
assert.match(src, /startLclListOut/)
assert.match(src, /startLclTitleOut/)
assert.match(src, /\.ready/)
assert.match(src, /\.done/)
assert.match(src, /openItem/)
assert.match(src, /holdScrollHairline/)
assert.match(src, /startLclTitleIn/)
assert.match(src, /startLclCrumbIn/)
assert.doesNotMatch(src, /type-overline/, 'negative: crumb uses solid type-lead, not faint overline')
assert.doesNotMatch(
  src,
  /titleIndex < listTitles\.length - 1/,
  'negative: every list row including the last keeps its hairline',
)
assert.doesNotMatch(
  src,
  /await playLclListOut/,
  'negative: preview overlaps via startLcl*.ready, not a full await that then unmounts early',
)
assert.match(src, /TEXT_STEPS_BY_PARENT/)
assert.match(src, /usesTextSteps/)
assert.match(src, /theme-lcl-preview__text-steps/)
assert.match(src, /PROSE_INLINE_CLASS|theme-prose-inline/)
assert.match(src, /proseInlineLinkClass/)
assert.match(src, /section\.id === 's3'/)
assert.match(src, /Flare/)
assert.match(src, /Coal/)
assert.doesNotMatch(
  src,
  /kind: 'forward'/,
  'negative: unopened prose links are not breadcrumbs',
)
assert.doesNotMatch(
  src,
  /crumb--back-only/,
  'negative: prose depth keeps a clickable trail, not a back-only arrow',
)
assert.match(src, /path\.length >= 2 && path\[0\] === 'Kindling'/)
assert.match(src, /inset\(0 100% 0 0\)/)
assert.match(src, /duration:\s*1\.2/)
assert.doesNotMatch(
  src,
  /theme-lcl-preview__text-step"/,
  'negative: stacked text-step buttons replaced by prose-inline links',
)
assert.match(src, /theme-webgl-toolkit/)
assert.doesNotMatch(
  src,
  /flameInk|theme-flame-ink/,
  'negative: flame-ink is kept as a reusable asset but not composed on the preview yet',
)
assert.doesNotMatch(src, /style=/, 'negative: preview blocks must not use inline style')
assert.doesNotMatch(src, /WebglStage/, 'negative: the preview is not a Canvas')
assert.doesNotMatch(src, /LclLayout/, 'negative: blank canvas does not mount LclLayout')
assert.doesNotMatch(src, /Quarry/, 'negative: one title was removed')
assert.doesNotMatch(
  src,
  /section.id === 's2' \? null/,
  'negative: s2 holds the display title, it is not left empty',
)
assert.doesNotMatch(src, /PageScrollType/, 'negative: LCL uses scroll-enter, not Effect 2/6')
assert.doesNotMatch(
  src,
  /await playLclTitleOut[\s\S]{0,80}playScrollHairlineOut/,
  'negative: title out must not wipe the title divider',
)
assert.doesNotMatch(
  src,
  /holdScrollHairline\(list/,
  'negative: the list hairlines animate out; only the title rule is held',
)

console.log('LclViewportPreview: ok')

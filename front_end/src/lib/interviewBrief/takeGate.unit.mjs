/**
 * Take/Publish + picker chrome source gates.
 * Run: node front_end/src/lib/interviewBrief/takeGate.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const repo = join(root, '../../../..')

const creatorSrc = readFileSync(join(repo, 'front_end/src/components/InterviewCreator.tsx'), 'utf8')
assert.match(creatorSrc, /panel === 'builder'/, 'onEditingChange true only on builder')
assert.ok(
  !/const editing = panel !== 'manage'/.test(creatorSrc),
  'picker must not close the left dashboard menu',
)
assert.match(creatorSrc, /checkSuiteBlocksTake\(warnings\)/, 'Test/Publish handlers scan Check Suite')
assert.match(creatorSrc, /void creator2Doc/, 'Check Suite snapshot effect reads creator2Doc')
assert.match(
  creatorSrc,
  /Manage-row tags follow the live Check Suite/,
  'manage warning tags remirror from the live brief',
)
assert.match(
  creatorSrc,
  /liveManagerCheckWarningShorts\(creator2Doc\)/,
  'manage remirror scans creator2Doc, not save-time shorts',
)
assert.match(
  creatorSrc,
  /checkWarningShorts: stampedPlan/,
  'Back to manage writes live shorts onto the list row',
)
assert.match(
  creatorSrc,
  /theme-interview-creator__list-blurb/,
  'manage rows show a truncated interview description',
)
assert.match(
  creatorSrc,
  /typeof bodyMeta.category === 'string' && bodyMeta.category.trim\(\)/,
  'builder hydrate reads definition.meta.category, not only session metadata',
)
assert.match(
  creatorSrc,
  /normalizeInterviewRoleCategoryValue\(/,
  'builder hydrate coerces Category leftovers to the Overview select id',
)
assert.match(
  creatorSrc,
  /typeof bodyMeta.opensAt === 'string' && bodyMeta.opensAt.trim\(\)/,
  'builder hydrate reads definition.meta.opensAt before the SQL row',
)
assert.match(
  creatorSrc,
  /preserveLiveOverviewMeta/,
  'bot apply keeps live category and description when the body omitted them',
)
{
  const rest = creatorSrc.match(
    /theme-interview-creator__list-sub[\s\S]*?theme-interview-creator__list-blurb/,
  )
  assert.ok(rest, 'description sits after the first-line tags')
  const actions = creatorSrc.match(
    /className="theme-interview-creator__list-actions"[\s\S]*?<\/div>\s*<\/div>/,
  )
  assert.ok(actions && !/list-blurb/.test(actions[0]), 'description is not in the action tray')
}
{
  const css = readFileSync(join(repo, 'front_end/src/css/effects/interview-creator.css'), 'utf8')
  assert.match(
    css,
    /\.theme-interview-creator__list-blurb \{[\s\S]*?grid-column: 1;/,
    'blurb stays in the tags column, not under the action buttons',
  )
  assert.match(css, /\.theme-interview-creator__list-blurb \{[\s\S]*?-webkit-line-clamp: 1/, 'rest is one line + ellipsis')
  assert.match(
    css,
    /\.theme-interview-creator__list-blurb \{[\s\S]*?padding: 0 0 0\.22em/,
    'blurb keeps descender room on the last visible line',
  )
  assert.match(
    css,
    /list-item:is\(:hover, :focus-within\) \.theme-interview-creator__list-blurb[\s\S]*?max-height: calc\(1\.45em \* 4 \+ 0\.22em\)/,
    'expanded clamp is taller than 4 line-boxes so g/y are not cropped',
  )
  assert.match(
    css,
    /\.theme-interview-creator__list-item:is\(:hover, :focus-within\) \.theme-interview-creator__list-blurb[\s\S]*?-webkit-line-clamp: 4/,
    'hover shows about three more lines, not the full text',
  )
}
assert.match(
  creatorSrc,
  /creator2PublishedRuntimeRef/,
  'builder keeps a stable runtime handle across patches',
)
{
  const runtimeAt = creatorSrc.indexOf('const runtime = {')
  assert.ok(runtimeAt >= 0, 'builder still publishes a Creator-2 runtime')
  const depsAt = creatorSrc.indexOf('}, [', runtimeAt)
  const depsEnd = creatorSrc.indexOf('])', depsAt)
  const registerDeps = creatorSrc.slice(depsAt, depsEnd)
  assert.ok(
    !registerDeps.includes('creator2Doc'),
    'negative: publishing the handle must not teardown on every user/bot patch',
  )
  const liveAt = creatorSrc.indexOf('void creator2Doc')
  const liveBlock = creatorSrc.slice(liveAt - 420, liveAt + 280)
  assert.ok(liveBlock.includes('useLayoutEffect'), 'live Check Suite remirror is layout-synced')
  assert.ok(
    !liveBlock.includes('?.(null)'),
    'negative: live remirror must not blank the peel between patches',
  )
}
assert.match(
  creatorSrc,
  /disabled=\{saving \|\| !composeSessionHasSaveablePlan\(session, creator2Doc\)\}/,
  'builder Save uses the persist plan check, not leftover FlowDocument alone',
)
assert.match(
  creatorSrc,
  /if \(!composeSessionHasSaveablePlan\(sess, plan\)\)/,
  'persist uses the same Save gate as the header button',
)
assert.ok(
  !/disabled=\{saving \|\| !session\.flow\}/.test(creatorSrc),
  'negative: Creator-2 builder Save must not require session.flow',
)
assert.match(creatorSrc, /disabled=\{loading \|\| takeBlocked\}/, 'Test button disabled when blocked')
assert.match(creatorSrc, /disabled=\{publishBlocked\}/, 'Publish disabled when blocked')
assert.match(creatorSrc, /listedCheckWarningShorts\(brief\.metadata\)/, 'list load reads the snapshot key')
assert.match(creatorSrc, /snap !== null/, 'empty snapshot is takeable; missing key scans the body')
assert.match(creatorSrc, /hydrateListedManagerItem\(brief\)/, 'shorts resolve before the list paints')
assert.match(
  creatorSrc,
  /theme-interview-flow-timeline__tag--gate/,
  'blocked rows use the rest-state gate tag',
)
assert.match(creatorSrc, /theme-interview-creator__warn-tip/, 'hover tooltip lists shorts')
assert.match(creatorSrc, /AlertTriangle/, 'warning tag uses the warning icon')
assert.ok(
  !/theme-interview-creator__check-warnings/.test(creatorSrc),
  'do not list Check Suite shorts under the hover fold',
)

const pageSrc = readFileSync(join(repo, 'front_end/src/pages/InterviewPage.tsx'), 'utf8')
assert.match(pageSrc, /checkSuiteBlocksTake\(liveCheckWarnings\)/, 'landing Start compares Check Suite')
assert.match(pageSrc, /tryDemo \|\| !liveBriefId/, 'fixtures / try-interview skip the live scan')
assert.match(pageSrc, /checkWarnings=\{liveCheckWarnings\}/, 'StageSwap receives live shorts')

const dashSrc = readFileSync(join(repo, 'front_end/src/pages/DashboardPage.tsx'), 'utf8')
assert.match(
  dashSrc,
  /peelCheckWarningsFromContext\(ctx\)/,
  'Dashboard re-reads Check Suite from getContext, not a one-shot array',
)
assert.ok(
  !/ctx\.checkWarnings\s*\?\s*ctx\.checkWarnings/.test(dashSrc),
  'negative: do not keep an inline one-shot checkWarnings map on Dashboard',
)

const landingSrc = readFileSync(join(repo, 'front_end/src/components/InterviewLanding.tsx'), 'utf8')
assert.match(landingSrc, /takeBlocked/, 'Landing Start uses takeBlocked')
assert.match(landingSrc, /theme-interview-landing__check-warnings/, 'Landing shows warning shorts')

const pickerSrc = readFileSync(
  join(repo, 'front_end/src/components/InterviewCreatorPickerHome.tsx'),
  'utf8',
)
assert.match(pickerSrc, /manage-toolbar--picker/, 'picker toolbar modifier')
assert.match(pickerSrc, /theme-interview-creator__picker-rule/, 'hairline between picker actions')

assert.match(creatorSrc, /theme-interview-creator__stat-window/, 'manage stats use one inset window')
assert.ok(!/stat-window-sheet/.test(creatorSrc), 'do not stack extra copies of the stats window')
assert.ok(!/stat-window-lip/.test(creatorSrc), 'do not use page-stack lips')
assert.ok(!/stat-window-face/.test(creatorSrc), 'do not split the window into a darker well')
assert.ok(!/data-edge="right"/.test(creatorSrc), 'stack is gone')
assert.equal(
  (creatorSrc.match(/variant="vurify-inset"/g) || []).length,
  1,
  'one vurify-inset cutout for Interviews / Published / Applicants',
)
assert.ok(
  !/theme-interview-creator__stat"/.test(creatorSrc),
  'do not restore three separate inset stat cards',
)

const cssSrc = readFileSync(join(repo, 'front_end/src/css/effects/interview-creator.css'), 'utf8')
assert.match(cssSrc, /manage-toolbar--picker/, 'picker toolbar is 1fr auto')
assert.match(
  cssSrc,
  /\.theme-interview-creator__manage-toolbar--picker \{[\s\S]*minmax\(0, 1fr\) auto/,
  'picker columns are search leftover + intrinsic actions',
)
assert.match(
  cssSrc,
  /\.theme \.theme-interview-creator__picker-action\.theme-btn \{\s*width: auto/,
  'picker actions do not stretch to 100%',
)
assert.ok(
  !/\.theme-interview-creator__picker-actions \{[^}]*grid-template-columns:\s*1fr/.test(cssSrc),
  'narrow CSS must not stack picker buttons full width',
)
assert.match(
  cssSrc,
  /\.theme-interview-creator__manage-toolbar \{[\s\S]*?minmax\(0, 1fr\) auto/,
  'manage toolbar is search leftover + intrinsic stats window',
)
assert.match(
  cssSrc,
  /\.theme-interview-creator__stat-window\.theme-card \{[\s\S]*padding: 0\.5rem 0\.95rem/,
  'one inset window keeps modest pad',
)
assert.match(
  cssSrc,
  /theme-card--vurify-inset\.theme-interview-creator__stat-window \{[\s\S]*--stat-window-radius: 0\.75rem/,
  'stats window corners stay a rectangle, not a capsule',
)
assert.ok(
  !/\.theme-interview-creator__stat-window[\s\S]{0,280}--dash-radius/.test(cssSrc),
  'do not inherit peel capsule radius on the stats window',
)
assert.match(
  cssSrc,
  /\.theme-interview-creator__stat-window \{[\s\S]*justify-self: start/,
  'narrow window stays start-aligned, not full-width stacked readings',
)
assert.ok(!/stat-window-sheet/.test(cssSrc), 'sheet copies must stay gone')
assert.ok(!/--stat-stack-y/.test(cssSrc), 'do not offset stacked window copies')
assert.ok(!/stat-window-lip/.test(cssSrc), 'page-stack lip CSS must stay gone')
assert.ok(
  !/\.theme-interview-creator__stats \{[^}]*repeat\(3/.test(cssSrc),
  'stats are not three stretching inset columns',
)
assert.match(cssSrc, /theme-interview-creator__warn-hit/, 'warning tag stays in the rest tag group')
assert.match(cssSrc, /theme-interview-creator__warn-tip/, 'tooltip lists shorts without a row dump')
assert.ok(!/__check-warnings/.test(cssSrc), 'no plain-text warning list under the repeater')

console.log('takeGate.unit.mjs: ok')

/**
 * Home Scene 07 try-interview kits: three kinds, no em dash copy.
 * Run: node front_end/src/lib/tryInterview/tryInterviewKits.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { wrapTryInterviewKitIndex } from './wrapTryInterviewKitIndex.ts'
import { tryInterviewProposedTimeLabel } from './tryInterviewStages.ts'

const dir = dirname(fileURLToPath(import.meta.url))

assert.equal(wrapTryInterviewKitIndex(-1, 3), 2)
assert.equal(wrapTryInterviewKitIndex(3, 3), 0)
assert.equal(wrapTryInterviewKitIndex(1, 3), 1)
assert.equal(wrapTryInterviewKitIndex(0, 0), 0, 'negative: empty count does not NaN')
assert.equal(tryInterviewProposedTimeLabel(8), '~8 min')
assert.equal(tryInterviewProposedTimeLabel(20), '~20 min')
assert.equal(tryInterviewProposedTimeLabel(45), '~45 min')
assert.doesNotMatch(
  tryInterviewProposedTimeLabel(8),
  /—|–/,
  'negative: proposed time chip must not use em or en dashes',
)

const kitsSrc = readFileSync(join(dir, 'tryInterviewKits.ts'), 'utf8')
assert.match(kitsSrc, /id: 'talk'/)
assert.match(kitsSrc, /id: 'coding'/)
assert.match(kitsSrc, /id: 'full'/)
assert.equal(
  (kitsSrc.match(/title: 'Test /g) ?? []).length,
  3,
  'three Test … kit titles',
)
assert.match(kitsSrc, /title: 'Test conversational interview'/)
assert.match(kitsSrc, /title: 'Test coding interview'/)
assert.match(kitsSrc, /title: 'Test full interview'/)
assert.match(kitsSrc, /ctaLabel: 'Take a conversational interview'/)
assert.match(kitsSrc, /ctaLabel: 'Take a coding interview'/)
assert.match(kitsSrc, /ctaLabel: 'Take a full interview'/)
assert.doesNotMatch(kitsSrc, /—|–/, 'negative: kit copy must not use em or en dashes')
assert.match(kitsSrc, /Harbor/)
assert.doesNotMatch(
  kitsSrc,
  /Eligibility/,
  'negative: Home kit copy must not keep the staff eligibility form',
)
const descriptions = [...kitsSrc.matchAll(/description:\s*'([^']+)'/g)].map((match) => match[1])
assert.equal(descriptions.length, 3)
for (const description of descriptions) {
  assert.ok(
    description.length >= 80,
    `kit description too short (${description.length}): ${description}`,
  )
}
assert.match(kitsSrc, /art: HOME_ASSETS.offerInterviewTaking/)
assert.match(kitsSrc, /art: HOME_ASSETS.whatGetsItDone/)
assert.match(kitsSrc, /art: HOME_ASSETS.tryVurify/)
const featureBlocks = [...kitsSrc.matchAll(/features: \[([\s\S]*?)\],/g)]
assert.equal(featureBlocks.length, 3, 'three kit feature lists')
for (const block of featureBlocks) {
  const rows = [...block[1].matchAll(/id: '/g)]
  assert.equal(rows.length, 3, `each kit has three feature rows, got ${rows.length}`)
}
const featureLabels = [...kitsSrc.matchAll(/label: '([^']+)'/g)].map((match) => match[1])
assert.equal(featureLabels.length, 9)
for (const label of featureLabels) {
  assert.ok(label.length <= 40, `feature label too long (${label.length}): ${label}`)
}
assert.doesNotMatch(
  kitsSrc,
  /id: 'writing'/,
  'negative: full kit must not keep four separate section rows',
)
assert.match(
  kitsSrc,
  /id: 'full'[\s\S]*id: 'form'[\s\S]*id: 'write-work'[\s\S]*id: 'talk-close'/,
  'full kit is form, write work, and talk close',
)
assert.match(kitsSrc, /stages: \['talk'\]/)
assert.match(kitsSrc, /stages: \['coding'\]/)
assert.match(
  kitsSrc,
  /stages: \['form', 'coding', 'writing', 'talk'\]/,
  'full kit stages are Form, Coding, Writing, Conversation tags',
)
assert.match(kitsSrc, /proposedMinutes: 8/)
assert.match(kitsSrc, /proposedMinutes: 20/)
assert.match(kitsSrc, /proposedMinutes: 45/)
assert.doesNotMatch(
  kitsSrc,
  /label: '~/,
  'negative: proposed time copy lives in tryInterviewProposedTimeLabel',
)
assert.doesNotMatch(
  kitsSrc,
  /label: 'Form'/,
  'negative: stage labels live in tryInterviewStages.ts so feature label count stays 9',
)

const stagesSrc = readFileSync(join(dir, 'tryInterviewStages.ts'), 'utf8')
assert.match(stagesSrc, /label: 'Form'/)
assert.match(stagesSrc, /label: 'Conversation'/)
assert.match(stagesSrc, /label: 'Coding'/)
assert.match(stagesSrc, /label: 'Writing'/)
assert.match(stagesSrc, /ClipboardList/)
assert.match(stagesSrc, /MessageSquare/)
assert.match(stagesSrc, /Code2/)
assert.match(stagesSrc, /PenLine/)
assert.match(stagesSrc, /tryInterviewProposedTimeLabel/)
assert.match(stagesSrc, /TRY_INTERVIEW_TIME_ICON/)

const tryCss = readFileSync(join(dir, '../../css/effects/page-scenes.css'), 'utf8')
assert.match(
  tryCss,
  /page-scene--home-try-interview__layout \{[^}]*padding: 2\.75rem/,
)
assert.doesNotMatch(
  tryCss,
  /page-scene--home-try-vurify__chooser/,
  'negative: the take kit is its own scene, not a pad under reviews',
)

const reviewsScene = readFileSync(join(dir, '../../pages/HomeTryVurifyScene.tsx'), 'utf8')
assert.match(reviewsScene, /What people say about Vurify/)
assert.doesNotMatch(
  reviewsScene,
  /HomeTryInterviewChooser/,
  'negative: reviews must not keep the take kit',
)

const scene = readFileSync(join(dir, '../../pages/HomeTryInterviewScene.tsx'), 'utf8')
assert.match(scene, /HomeTryInterviewChooser/)
assert.match(scene, /home-scene-7/)
assert.match(scene, /page-scene--home-try-interview/)
assert.match(scene, /onTakeInterview=\{onTakeInterview\}/)
assert.doesNotMatch(
  scene,
  /page-scene--home-try-vurify__cta-wrap/,
  'negative: the take CTA lives in the chooser actions row',
)

const homePageSrc = readFileSync(join(dir, '../../pages/HomePage.tsx'), 'utf8')
assert.match(homePageSrc, /id="home-scene-7"/)
assert.match(homePageSrc, /HomeTryInterviewScene/)
assert.match(homePageSrc, /onTakeInterview=\{openTryInterviewKit\}/)
assert.match(homePageSrc, /onTryInterview=\{openTryInterview\}/)
assert.doesNotMatch(
  homePageSrc,
  /onTakeInterview=\{openTryInterview\}/,
  'negative: landing Try Vurify must not pass a click event as the kit id',
)

const navSrc = readFileSync(join(dir, '../menus/homeNavLinks.ts'), 'utf8')
assert.match(
  navSrc,
  /id: 'try-vurify'[\s\S]*targetId: 'home-scene-7'/,
  'Try Vurify nav lands on the take-interview section',
)
assert.doesNotMatch(
  navSrc,
  /id: 'try-vurify'[\s\S]*targetId: 'home-scene-6'/,
  'negative: Try Vurify must not still scroll to reviews',
)

const landing2Src = readFileSync(join(dir, '../../pages/Landing2Page.tsx'), 'utf8')
assert.match(landing2Src, /HomeTryInterviewScene/)
assert.match(landing2Src, /HomeTryVurifyScene/)

const chooser = readFileSync(join(dir, '../../components/HomeTryInterviewChooser.tsx'), 'utf8')
assert.match(chooser, /Take a test interview/)
assert.match(chooser, /wordClassNames=\{\{\s*test:/)
assert.match(chooser, /hideCta/)
assert.match(chooser, /hideHead/)
assert.match(chooser, /contentKey=\{navKit.id\}/)
assert.match(chooser, /PointerFollowDeck/)
assert.match(chooser, /triggerRef=\{artHitRef\}/)
assert.match(chooser, /kit.art.src/)
assert.match(chooser, /theme-home-try-kit__art-panel/)
assert.match(chooser, /theme-page-scroll-type--center/)
assert.match(chooser, /KIT_ART_OUT_MS = 520/)
assert.match(chooser, /TypeAnimText/)
assert.match(chooser, /swapDirection=\{navDirection\}/)
assert.match(chooser, /theme-home-try-kit__stack/)
assert.match(chooser, /theme-home-try-kit__copy-sizer/)
assert.match(chooser, /theme-home-try-kit__table-sizer/)
assert.match(
  chooser,
  /theme-home-try-kit__table-sizer[\s\S]*TRY_INTERVIEW_KITS\.map[\s\S]*<VurifyPricingTable/,
)
assert.equal(
  (chooser.match(/<VurifyPricingTable/g) ?? []).length,
  2,
  'sizer maps every kit through the real table, plus one live table',
)
assert.doesNotMatch(
  chooser,
  /theme-home-try-kit__table-sizer-stages/,
  'negative: fake sizer rows cannot match icon+wrap+stages height',
)
assert.doesNotMatch(
  chooser,
  /theme-home-try-kit__table-sizer[\s\S]*?<ul/,
  'negative: table sizer must not use a stub list',
)
assert.match(chooser, /theme-home-try-kit__art-clip/)
assert.match(chooser, /theme-home-try-kit__actions/)
assert.match(chooser, /theme-home-try-kit__cta-panel/)
assert.match(chooser, /stages=\{navKit.stages\}/)
assert.match(chooser, /proposedMinutes=\{navKit.proposedMinutes\}/)
assert.match(chooser, /proposedMinutes=\{item.proposedMinutes\}/)
assert.match(chooser, /stages=\{item.stages\}/)
assert.match(chooser, /kitTakeMarquee\(kit\)/)
assert.match(chooser, /onClick=\{\(\) => onTakeInterview\?\.\(kit\.id\)\}/)
assert.doesNotMatch(
  chooser,
  /onClick=\{onTakeInterview\}/,
  'negative: Take must pass the displayed kit id, not the click event',
)
assert.match(chooser, /icon=\{ChevronLeft\}/)
assert.match(chooser, /icon=\{ChevronRight\}/)
assert.match(chooser, /IconButton/)
assert.equal(
  (chooser.match(/variant="marquee-menu"/g) ?? []).length,
  1,
  'one take marquee; chevrons are not extra marquees',
)
assert.doesNotMatch(chooser, /kitNavMarquee/)
assert.match(chooser, /wrapTryInterviewKitIndex\(nextRaw, TRY_INTERVIEW_KITS\.length\)/)
assert.doesNotMatch(
  chooser,
  /\bplain\b/,
  'negative: Scene 07 kit art keeps ghost plates and drop-shadow',
)
assert.doesNotMatch(
  chooser,
  /HOME_ASSETS\.tryVurify\.src/,
  'negative: kit art must not stay on one still',
)
assert.doesNotMatch(
  chooser,
  /goInterview|navigate\(/,
  'negative: chooser must not route itself',
)
assert.doesNotMatch(
  chooser,
  /kitTakeMarquee\(navKit\)/,
  'negative: take label swaps after art out, not on click',
)
assert.doesNotMatch(
  chooser,
  /key=\{kit\.id\}/,
  'negative: remounting the take button pops the marquee instead of sliding it',
)

const tableSrc = readFileSync(join(dir, '../../components/VurifyPricingTable.tsx'), 'utf8')
assert.match(tableSrc, /hideCta\?:/)
assert.match(tableSrc, /hideHead\?:/)
assert.match(tableSrc, /contentKey\?:/)
assert.match(tableSrc, /contentIndex\?:/)
assert.match(tableSrc, /swapDirection\?:/)
assert.match(tableSrc, /stages\?:/)
assert.match(tableSrc, /proposedMinutes\?:/)
assert.match(tableSrc, /tryInterviewStages/)
assert.match(tableSrc, /hideCta \|\| !displayed.cta/)
assert.match(tableSrc, /hideHead \? null/)
assert.match(tableSrc, /function extraRowCount\(hideHead: boolean, hideCta: boolean, hasStages: boolean\)/)
assert.match(tableSrc, /row--stages/)
assert.match(tableSrc, /TRY_INTERVIEW_STAGE_META/)
assert.match(tableSrc, /TRY_INTERVIEW_TIME_ICON/)
assert.match(tableSrc, /tag--time/)
assert.match(tableSrc, /tryInterviewProposedTimeLabel/)
assert.match(tableSrc, /theme-interview-landing__meta-tag/)
assert.doesNotMatch(
  tableSrc,
  /row--stages[\s\S]*VURIFY_PRICING_TICK_ICON/,
  'negative: stages row must not carry a feature tick',
)

const chooserCss = readFileSync(
  join(dir, '../../css/effects/home-try-interview-chooser.css'),
  'utf8',
)
assert.match(chooserCss, /theme-home-try-kit \{[^}]*gap: 1rem/)
assert.match(chooserCss, /max-width: 22ch/)
assert.doesNotMatch(
  chooserCss,
  /max-width: 16ch/,
  'negative: take-interview title must not keep the tight 16ch wrap',
)
assert.match(chooserCss, /theme-home-try-kit__stack \{[^}]*gap: 1\.15rem/)
assert.match(chooserCss, /column-gap: 1\.25rem/)
assert.doesNotMatch(
  chooserCss,
  /gap: 0\.4rem/,
  'negative: kit gaps must stay large enough that the take housing does not sit on the table',
)
assert.match(chooserCss, /minmax\(0, 22rem\)/)
assert.match(chooserCss, /padding: 1\.15rem 1\.65rem/)
assert.match(chooserCss, /align-items: start/)
assert.match(chooserCss, /theme-home-try-kit__stack/)
assert.match(chooserCss, /scene-stack-menu-out-to-left/)
assert.match(chooserCss, /scene-stack-menu-in-from-right/)
assert.match(chooserCss, /theme-home-try-kit__cta-panel/)
assert.match(
  chooserCss,
  /theme-home-try-kit__table-sizer > \* \{[^}]*grid-area: 1 \/ 1/,
)
assert.doesNotMatch(
  chooserCss,
  /theme-home-try-kit__table-sizer-stages/,
  'negative: fake sizer stage rows must not size the slot',
)
assert.doesNotMatch(
  chooserCss,
  /theme-home-try-kit__table-sizer li \{[^}]*min-height: 2\.45rem/,
  'negative: one-line stub rows clip wrapped feature labels',
)
assert.match(chooserCss, /--home-try-kit-nav-icon/)
assert.match(chooserCss, /height: 14rem/)
assert.match(chooserCss, /theme-home-try-kit__copy-sizer/)
assert.match(
  chooserCss,
  /theme-home-try-kit__desc \{[^}]*position: absolute/,
)
assert.match(
  chooserCss,
  /theme-home-try-kit__table \{[^}]*position: absolute/,
)
assert.doesNotMatch(
  chooserCss,
  /height: 16rem/,
  'negative: art clip must hug the table stack',
)
assert.doesNotMatch(
  chooserCss,
  /theme-home-try-kit__body \{[^}]*align-items: center/,
  'negative: table must not vertically center beside the art',
)
assert.match(
  chooserCss,
  /grid-template-columns: var\(--home-try-kit-nav-icon\) max-content/,
)
assert.match(
  chooserCss,
  /theme-home-try-kit__cta\.theme-btn-fx--marquee-menu \{[^}]*width: 100%/,
)
assert.doesNotMatch(
  chooserCss,
  /min-height: 11rem/,
  'negative: art clip must have a definite height so the deck does not collapse',
)
assert.doesNotMatch(
  chooserCss,
  /theme-home-try-kit__table \{[^}]*max-width: none/,
  'negative: kit table must not stretch to the page edge',
)
assert.doesNotMatch(
  chooserCss,
  /theme-home-try-kit__actions \{[^}]*flex-direction: column/,
  'negative: chevrons stay beside the take marquee',
)

const tableCss = readFileSync(join(dir, '../../css/effects/vurify-pricing-table.css'), 'utf8')
assert.match(tableCss, /row--stages/)
assert.match(tableCss, /theme-vurify-pricing-table__stages /)
assert.match(
  tableCss,
  /theme-vurify-pricing-table__row \{[^}]*align-items: flex-start/,
)
assert.doesNotMatch(
  tableCss,
  /theme-vurify-pricing-table__row \{[^}]*align-items: center/,
  'negative: centered one-line rows clip wrapped feature labels',
)

const wwd = readFileSync(join(dir, '../../pages/HomeWhatWeDoScene.tsx'), 'utf8')
assert.equal(wwd.split("id: '").length - 1, 4, 'four flavour tickets remain')
assert.doesNotMatch(wwd, /id: 'follow-up'/, 'negative: the mid-right toast is gone')

const wwdCss = readFileSync(join(dir, '../../css/effects/home-what-we-do.css'), 'utf8')
assert.doesNotMatch(
  wwdCss,
  /data-ticket='follow-up'/,
  'negative: follow-up ticket positions must not remain',
)
assert.match(
  wwdCss,
  /data-ticket='form-cleared'\] \{\s*display: flex;\s*left: 0\.3rem/,
  'mobile form-cleared sits on the left so the right keeps two chips',
)
assert.doesNotMatch(
  wwdCss,
  /data-ticket='form-cleared'\] \{\s*display: flex;\s*right: 0\.3rem/,
  'negative: mobile form-cleared must not sit on the right',
)

console.log('tryInterviewKits.unit.mjs: ok')

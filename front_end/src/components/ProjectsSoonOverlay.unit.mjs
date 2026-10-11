/**
 * Projects LCL: GrasSearch + pinned header + Lenis body + Fab access filters.
 * Run: npx tsx front_end/src/components/ProjectsSoonOverlay.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PROJECTS_SOON_LCL_IN_S } from './ProjectsSoonOverlay.tsx'
import { lclScene } from '../lib/lcl/lclScenes.ts'

const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'ProjectsSoonOverlay.tsx'), 'utf8')

assert.equal(PROJECTS_SOON_LCL_IN_S, 2.6)
assert.equal(lclScene('projectsSoon').sections.map((section) => section.id).join(','), 's1')
assert.match(src, /lclScene\('projectsSoon'\)/)
assert.match(src, /GrasSearch/)
assert.match(src, /theme-lcl-table/)
assert.match(src, /theme-lcl-table__row/)
assert.match(src, /theme-hairline-fx--eirene/)
assert.match(src, /ScrollEnterText/)
assert.match(src, /theme-projects-lcl__table-shell/)
assert.match(src, /theme-projects-lcl__table-head/)
assert.match(src, /theme-projects-lcl__table-body/)
assert.match(src, /theme-projects-lcl__head-block/, 'header band hosts the animated divider wipe')
assert.match(
  src,
  /className="theme-projects-lcl__head-block theme-hairline-fx"/,
  'head-block is the hairline host',
)
assert.match(
  src,
  /head-block theme-hairline-fx">[\s\S]*?theme-hairline-fx__wipe[\s\S]*?theme-hairline-fx__rule/,
  'header divider is the 1px hairline wipe, not a static border',
)
assert.match(src, /playProjectsHostsIn/)
assert.match(src, /playProjectsHostsOut/)
assert.match(src, /projectsListHosts/, 'dive leave/return uses the same list hosts as page enter')
assert.match(
  src,
  /Flip\.killFlipsOf\(rows\)[\s\S]{0,80}startLclListOut/,
  'hosts-out clears filter Flip before the same list out as page leave',
)
assert.match(
  src,
  /playProjectsScrollCloudsOut|\.theme-scroll__cloud[\s\S]{0,200}autoAlpha:\s*0/,
  'leave fades ThemeScroll vanishing edges with the catalog hosts',
)
assert.match(
  src,
  /restoreProjectsScrollClouds|clearProps:\s*'opacity,visibility'/,
  'enter restores scroll-cloud opacity after an interrupted leave',
)
assert.match(
  src,
  /Promise\.all\(\[[\s\S]*?playProjectsScrollCloudsOut\(root\)/,
  'hosts-out waits on the cloud fade alongside list hosts',
)
assert.doesNotMatch(
  src,
  /panel && !head && !tbody \? startLclListOut\(panel, gsap\)\.done : Promise\.resolve\(\),\s*\]\)/,
  'negative: Out ending after the panel host without cloud fade strands the black edge plates',
)
assert.match(src, /enterTicket/)
assert.match(src, /motionGen/)
assert.match(
  src,
  /if \(leaving\.current\) \{[\s\S]{0,280}motionGen\.current \+= 1/,
  'scroll-back during leave interrupts out and re-enters',
)
assert.doesNotMatch(
  src,
  /if \(!entered\.current \|\| leaving\.current\) \{\s*setLive\(false\)/,
  'negative: do not unmount mid-leave when leaving.current is already true',
)
assert.match(
  src,
  /theme-projects-lcl__panel"[^>]*data-scene-nest-scroll/,
  'whole panel (pinned head + search + body) owns the wheel so the scene does not turn under the title row',
)
assert.doesNotMatch(
  src,
  /theme-projects-lcl__panel">\s*<GrasSearch/,
  'negative: panel without nest mark lets pinned head turn the landing scene',
)
assert.match(src, /PROJECT_ACCESS_FILTERS/)
assert.match(src, /from '\.\/Fab'/)
assert.match(src, /from '\.\/Tooltip'/)
assert.match(src, /accessFabX/)
assert.match(src, /data-fab-kind/)
assert.match(src, /gsap\.to\(slot/)
assert.match(src, /aria-pressed=\{on\}/)
assert.match(src, /theme-projects-lcl__access-fab/)
assert.match(src, /theme-projects-lcl__access-fab-slot/)
assert.match(
  src,
  /data-fab-kind=\{kind\}[\s\S]{0,200}ScrollEnterText[\s\S]{0,500}<Tooltip[\s\S]{0,200}<Fab/,
  'access Fabs enter/leave with the head list and show kind tooltips',
)
assert.doesNotMatch(
  src,
  /data-fab-kind=\{kind\}[^>]*>\s*<Fab/,
  'negative: bare Fab in the slot skips head list in/out',
)
assert.doesNotMatch(
  src,
  /ScrollEnterText[\s\S]{0,80}<Fab[\s\S]{0,200}access-fab/,
  'negative: Fab without Tooltip hides the kind name on hover',
)
assert.match(
  src,
  /useState<readonly ProjectAccessKind\[\]>\(\(\) => \[\.\.\.PROJECT_ACCESS_FILTERS\]\)/,
  'all access filters start selected',
)
assert.doesNotMatch(
  src,
  /Flip\.getState\([^\)]*access-fab/,
  'negative: Fab seats use gsap x, not Flip on fab nodes',
)
assert.doesNotMatch(
  src,
  /is-pile-start|orderedKinds/,
  'negative: no flex reorder / pile-start margin recipe',
)
assert.match(src, /theme-projects-lcl__more-icon/)
assert.match(src, /ScrollEnterText[\s\S]{0,220}more-icon[\s\S]{0,220}icon=\{Eye\}/)
assert.match(src, /pendingJoinIds/)
assert.match(src, /pendingFlip/)
assert.match(src, /Flip\.getState/)
assert.match(src, /Flip\.from/)
assert.match(src, /revealPaintedRows/)
assert.match(src, /stayers/)
assert.match(src, /Joiners always soft-enter/)
assert.match(src, /nested:\s*false/, 'Flip must not nest into scroll-enter chars')
assert.match(
  src,
  /function ProjectRow[\s\S]*?Do not settle on mount/,
  'rows stay parked for hosts-in; Flip / playRowEnter settle remounts',
)
assert.doesNotMatch(
  src,
  /function ProjectRow[\s\S]*?useLayoutEffect\([\s\S]*?settleRowChrome\(el\)/,
  'negative: mount settle forces rest before hosts-in and kills the enter',
)
assert.match(
  src,
  /function settleRowChrome[\s\S]*?yPercent: 0, rotateX: 0[\s\S]*?function playRowEnter/,
  'settle keeps explicit char rest pose',
)
assert.match(
  src,
  /!active \|\| !entered\.current|!live \|\| !active \|\| !entered/,
  'filter / page sync freezes while hosts are leaving',
)
assert.match(src, /beginProjectsLeaveChrome|classList\.add\('is-leaving'\)/)
assert.match(
  src,
  /\.blur\(\)/,
  'leave blurs the focused row so nano rail focus-within drops',
)
assert.doesNotMatch(
  src,
  /nested:\s*true/,
  'negative: nested Flip reads char yPercent and leaves hairline-only rows',
)
assert.doesNotMatch(
  src,
  /function settleRowChrome\([\s\S]*?clearProps:[\s\S]*?function playRowEnter/,
  'negative: settleRowChrome must not clearProps char transforms',
)
assert.doesNotMatch(
  src,
  /startLclListOut\(el/,
  'negative: filter must not hold leaving rows in-layout for char-out (gaps)',
)
assert.doesNotMatch(
  src,
  /Filter \/ search[\s\S]{0,900}startLclListOut\(tbody/,
  'negative: filter must not wipe the whole tbody',
)
assert.doesNotMatch(
  src,
  /void Promise\.all\(leaveEls/,
  'negative: no staged leaveEls hold before paint',
)
assert.match(src, /SEARCH_SWAP_MS/)
assert.match(src, /setPainted/)
assert.match(src, /icon=\{Eye\}/)
assert.match(src, /See more/)
assert.match(src, /onSelectProject/)
assert.match(
  src,
  /theme-projects-lcl__name[\s\S]{0,280}onClick=\{open\}/,
  'name cell opens the project detail',
)
assert.match(
  src,
  /more-btn[\s\S]{0,120}onClick=\{open\}|onClick=\{open\}[\s\S]{0,80}\/>/,
  'Eye opens the project detail',
)
assert.match(src, />\s*Description\s*</, 'column header is Description, not Desc')
assert.doesNotMatch(src, />\s*Desc\s*</, 'negative: Desc is too short for the header')
assert.match(src, /type-caption/)
assert.match(src, /smooth/)
assert.match(src, /viewportRef=\{scrollViewportRef\}/)
assert.match(src, /truncateDesc/)
assert.match(src, /ScrollEnterText[\s\S]{0,120}access-icon/)
assert.match(
  src,
  /table-shell[\s\S]*?table-head[\s\S]*?ThemeScroll[\s\S]*?table-body/,
  'head table stays outside ThemeScroll so the title row does not scroll',
)
assert.doesNotMatch(
  src,
  /theme-lcl-table__head theme-hairline-fx/,
  'negative: headers have no eirene underline',
)
assert.doesNotMatch(
  src,
  /TypeAnimText/,
  'negative: See more TypeAnim removed — eye icon only',
)
assert.doesNotMatch(
  src,
  /variant="stack"/,
  'negative: access filters are circular Fab stacks, not stack IconButtons',
)
assert.doesNotMatch(
  src,
  /data-shift|accessFilterShift/,
  'negative: no whole-stack shift / peel-seat helper',
)
assert.doesNotMatch(
  src,
  /label:\s*'Access'/,
  'negative: Access header is filter icon stack, not a text label',
)
assert.match(src, /label="Search projects"/)
assert.doesNotMatch(
  src,
  /GrasSearch[\s\S]{0,200}placeholder=/,
  'negative: Projects search is float-label only — no extra placeholder',
)
assert.doesNotMatch(src, /Coming soon/, 'negative: Coming soon title is gone')
assert.doesNotMatch(
  src,
  /className="theme-projects-lcl__table"/,
  'negative: table must use theme-lcl-table (LCL Theme recipe), not a plain projects table',
)
assert.doesNotMatch(src, /section\.id === 's2'/, 'negative: there is no second panel')
assert.doesNotMatch(src, /\u2014|\u2013/, 'negative: reader copy has no em or en dash')

console.log('ProjectsSoonOverlay: ok')

/**
 * Home Try kit briefs: talk / coding / full, sliced from live fixtures.
 * Run: node front_end/src/lib/tryInterview/tryInterviewBriefs.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  peekPendingTryInterviewKit,
  resolveTryInterviewKit,
  setPendingTryInterviewKit,
  sliceTryInterviewBrief,
  tryInterviewBriefForKit,
  tryInterviewBriefIdForKit,
  TRY_INTERVIEW_BRIEF_IDS,
  TRY_INTERVIEW_CANDIDATE_DESCRIPTION,
} from './tryInterviewBriefs.ts'
import { candidateAssistChromeFromBrief } from '../interviewBrief/candidateAssistChrome.ts'
import { matchToolAssistBundle } from '../interviewBrief/toolAssistBundles.ts'
import { INTERVIEW_PAGE_BRIEF_FIXTURE } from '../interviewBrief/interviewPageFixture.ts'
import staffSecurityEngineerFullInterview from '../interviewBrief/fixtures/staffSecurityEngineerFullInterview.json' with { type: 'json' }

const dir = dirname(fileURLToPath(import.meta.url))
const staff = staffSecurityEngineerFullInterview

function workspaceFiles(tool) {
  const parsed = JSON.parse(JSON.stringify(tool?.artifact ?? {}))
  return Array.isArray(parsed.inline?.files) ? parsed.inline.files : []
}

assert.equal(TRY_INTERVIEW_BRIEF_IDS.talk, 'fixture:try-talk')
assert.equal(TRY_INTERVIEW_BRIEF_IDS.coding, 'fixture:try-coding')
assert.equal(TRY_INTERVIEW_BRIEF_IDS.full, 'fixture:try-full')
assert.equal(tryInterviewBriefIdForKit('talk'), 'fixture:try-talk')

assert.equal(resolveTryInterviewKit('talk'), 'talk')
assert.equal(resolveTryInterviewKit('coding'), 'coding')
assert.equal(resolveTryInterviewKit(null), 'coding')
assert.equal(resolveTryInterviewKit('nope'), 'coding')
assert.notEqual(resolveTryInterviewKit(null), 'talk', 'negative: missing kit must not default to talk')
assert.notEqual(resolveTryInterviewKit(null), 'full', 'negative: missing kit must not default to full')

setPendingTryInterviewKit('talk')
assert.equal(peekPendingTryInterviewKit(), 'talk')
assert.equal(resolveTryInterviewKit(peekPendingTryInterviewKit()), 'talk')
setPendingTryInterviewKit('coding')
assert.equal(peekPendingTryInterviewKit(), 'coding')

{
  const sliced = sliceTryInterviewBrief(staff, ['ph.8xz0sd'], {
    title: 'Slice probe',
    roleTitle: 'Probe',
    proposedMinutes: 20,
    candidateDescription: 'Probe intro.',
  })
  assert.deepEqual(
    sliced.phases.map((phase) => phase.id),
    ['ph.8xz0sd'],
  )
  assert.ok(sliced.tools['tool.coding.j8sx8g'], 'coding tool stays with the coding phase')
  assert.equal(sliced.tools['tool.doc.q1bbhg'], undefined, 'negative: writing tool must not leak into a coding slice')
  assert.equal(sliced.definition.meta.title, 'Slice probe')
  assert.equal(sliced.definition.meta.proposedMinutes, 20)
  assert.equal(sliced.definition.meta.candidateDescription, 'Probe intro.')
  const codingIds = sliced.analysis.rollup?.weightSections?.['coding-work'] ?? []
  assert.deepEqual(codingIds, ['ph.8xz0sd'])
  assert.equal(sliced.analysis.rollup?.weightSections?.write, undefined)
}

{
  const talk = tryInterviewBriefForKit('talk')
  assert.equal(talk.definition.meta.title, 'Test conversational interview')
  assert.equal(talk.definition.meta.proposedMinutes, 8)
  assert.equal(talk.definition.meta.candidateDescription, TRY_INTERVIEW_CANDIDATE_DESCRIPTION.talk)
  assert.equal(talk.phases.length, 1, 'talk kit is one discussion, not the three-phase demo')
  assert.equal(talk.phases[0]?.kind, 'discussion')
  assert.equal(talk.phases[0]?.id, 'ph.k5wuze')
  assert.equal(talk.phases[0]?.isOpening, true)
  assert.equal(talk.phases[0]?.when, undefined, 'talk must not wait on the dropped form gate')
  assert.equal(
    talk.phases.some((phase) => phase.kind === 'tool'),
    false,
    'negative: talk kit must not keep coding or form tools',
  )
  const topic = talk.topicLibrary.find((row) => row.id === talk.phases[0]?.topicId)
  assert.equal(topic?.analysis?.attachPack, 'pack.talk')
  assert.ok(topic?.analysis?.templateIds?.includes('iv.delivery.v1'))
  assert.ok(topic?.analysis?.templateIds?.includes('iv.content.v1'))
  const talkChrome = candidateAssistChromeFromBrief(talk, talk.phases[0]?.id)
  assert.equal(talkChrome.openPeel, false, 'negative: Talk has no Assist peel')
}

{
  const coding = tryInterviewBriefForKit('coding')
  assert.equal(coding.phases.length, 1)
  assert.equal(coding.phases[0]?.kind, 'tool')
  assert.equal(coding.phases[0]?.toolRef, 'tool.coding.j8sx8g')
  assert.equal(coding.definition.meta.proposedMinutes, 20)
  const codingTool = coding.tools['tool.coding.j8sx8g']
  assert.ok(codingTool?.analysis?.templateIds?.includes('mark.code.tests.v1'))
  assert.ok(codingTool?.analysis?.templateIds?.includes('mark.code.method.v1'))
  assert.equal(
    matchToolAssistBundle(codingTool?.assist),
    'copilot',
    'coding kit stamps Copilot on the Assist-capable coding tool',
  )
  const codingChrome = candidateAssistChromeFromBrief(coding, coding.phases[0]?.id)
  assert.equal(codingChrome.bundleId, 'copilot')
  assert.equal(codingChrome.openPeel, true, 'coding sitting opens the Copilot peel')
}

{
  const full = tryInterviewBriefForKit('full')
  assert.deepEqual(
    full.phases.map((phase) => phase.id),
    ['ph.fi4fpq', 'ph.8xz0sd', 'ph.6pltkr', 'ph.6mvyht'],
  )
  assert.equal(full.phases.filter((phase) => phase.kind === 'discussion').length, 1)
  assert.ok(full.tools['tool.form.he5jad'])
  assert.ok(full.tools['tool.coding.j8sx8g'])
  assert.ok(full.tools['tool.doc.q1bbhg'])
  assert.equal(full.tools['tool.coding.b7o8xa'], undefined, 'negative: second coding drill is not in the 45 min full kit')
  assert.equal(full.definition.meta.proposedMinutes, 45)
  assert.equal(full.definition.meta.candidateDescription, TRY_INTERVIEW_CANDIDATE_DESCRIPTION.full)
  assert.equal(matchToolAssistBundle(full.tools['tool.form.he5jad']?.assist), 'copilot')
  assert.equal(matchToolAssistBundle(full.tools['tool.coding.j8sx8g']?.assist), 'copilot')
  assert.equal(matchToolAssistBundle(full.tools['tool.doc.q1bbhg']?.assist), 'copilot')
  assert.equal(candidateAssistChromeFromBrief(full, 'ph.fi4fpq').openPeel, true)
  assert.equal(candidateAssistChromeFromBrief(full, 'ph.8xz0sd').openPeel, true)
  assert.equal(candidateAssistChromeFromBrief(full, 'ph.6pltkr').openPeel, true)
  assert.equal(
    candidateAssistChromeFromBrief(full, 'ph.6mvyht').openPeel,
    false,
    'negative: close talk has no Assist peel',
  )
  assert.equal(
    staff.tools['tool.coding.j8sx8g']?.assist,
    undefined,
    'negative: staff JSON stays Assist None; Copilot is stamped on the sitting slice',
  )
}

{
  assert.equal(
    matchToolAssistBundle(INTERVIEW_PAGE_BRIEF_FIXTURE.tools['tool.coding.j8sx8g']?.assist),
    'copilot',
    'Theme /interview demo stamps Copilot on coding',
  )
  assert.equal(matchToolAssistBundle(INTERVIEW_PAGE_BRIEF_FIXTURE.tools['tool.form.he5jad']?.assist), 'copilot')
  assert.equal(matchToolAssistBundle(INTERVIEW_PAGE_BRIEF_FIXTURE.tools['tool.doc.q1bbhg']?.assist), 'copilot')
  assert.equal(
    matchToolAssistBundle(INTERVIEW_PAGE_BRIEF_FIXTURE.tools['tool.coding.b7o8xa']?.assist),
    'copilot',
  )
}

{
  const jargon = /fixture|preset|Decision|offline|sample CV|hiring brief/i
  const staffIntro = String(staff.definition?.meta?.candidateDescription ?? '')
  assert.match(staffIntro, /front-end demo preset/, 'staff JSON still has the jargon intro')
  for (const kit of ['talk', 'coding', 'full']) {
    const intro = tryInterviewBriefForKit(kit).definition.meta.candidateDescription ?? ''
    assert.doesNotMatch(intro, jargon, `${kit} intro must not reuse fixture jargon`)
    assert.notEqual(intro, staffIntro, `negative: ${kit} must not leak the staff demo sentence`)
  }
  const coding = tryInterviewBriefForKit('coding')
  assert.equal(coding.definition.meta.candidateDescription, TRY_INTERVIEW_CANDIDATE_DESCRIPTION.coding)
}

{
  const staffForm = staff.tools['tool.form.he5jad']
  const staffCoding = staff.tools['tool.coding.j8sx8g']
  const staffWriting = staff.tools['tool.doc.q1bbhg']
  assert.match(String(staffForm?.title ?? ''), /Eligibility/)
  assert.match(String(staffForm?.instructions ?? ''), /visa|sponsorship/i)
  assert.match(String(staffCoding?.title ?? ''), /Fibonacci/)
  assert.match(String(staffWriting?.prompt?.brief ?? ''), /hiring manager/i)
  assert.equal(staffForm?.assist, undefined)
  assert.equal(staffCoding?.assist, undefined)
  assert.doesNotMatch(
    JSON.stringify(staff.definition?.meta ?? {}),
    /Harbor/,
    'negative: Harbor overlay must not mutate staff JSON',
  )

  const sliced = sliceTryInterviewBrief(staff, ['ph.8xz0sd'], {
    title: 'Slice probe',
    roleTitle: 'Probe',
    proposedMinutes: 20,
    candidateDescription: 'Probe intro.',
  })
  assert.match(
    String(sliced.tools['tool.coding.j8sx8g']?.instructions ?? ''),
    /Fibonacci/,
    'slice without a kit keeps staff copy',
  )
  assert.doesNotMatch(
    String(sliced.tools['tool.coding.j8sx8g']?.instructions ?? ''),
    /Harbor/,
    'negative: mechanical slice must not apply the Harbor overlay',
  )

  const talk = tryInterviewBriefForKit('talk')
  const talkTopic = talk.topicLibrary.find((row) => row.id === talk.phases[0]?.topicId)
  assert.match(String(talk.phases[0]?.title ?? ''), /owned/)
  assert.match(String(talkTopic?.purpose ?? ''), /Harbor/)
  assert.doesNotMatch(
    `${talk.phases[0]?.title ?? ''} ${talk.phases[0]?.summary?.blurb ?? ''} ${talkTopic?.purpose ?? ''} ${JSON.stringify(talkTopic?.probes ?? [])}`,
    /incident|Staff Security|on-call/i,
    'talk tryout is owned work, not a security incident drill',
  )

  const coding = tryInterviewBriefForKit('coding')
  const codingFiles = workspaceFiles(coding.tools['tool.coding.j8sx8g'])
  const staffFiles = workspaceFiles(staffCoding)
  const readme = codingFiles.find((file) => file.path === 'README.md')?.content ?? ''
  const cases = codingFiles.find((file) => file.path === 'tests/cases.json')?.content ?? ''
  const staffCases = staffFiles.find((file) => file.path === 'tests/cases.json')?.content ?? ''
  assert.match(readme, /Harbor/)
  assert.match(readme, /momentum/)
  assert.match(String(coding.tools['tool.coding.j8sx8g']?.instructions ?? ''), /Harbor/)
  assert.equal(cases, staffCases, 'Harbor story must keep Fibonacci cases.json')
  assert.equal(
    matchToolAssistBundle(coding.tools['tool.coding.j8sx8g']?.assist),
    'copilot',
    'Harbor overlay must not wipe Copilot',
  )

  const full = tryInterviewBriefForKit('full')
  const form = full.tools['tool.form.he5jad']
  const formBlob = JSON.stringify(form?.artifact ?? {})
  assert.doesNotMatch(formBlob, /visa|Staff Security|Eligibility/i)
  assert.deepEqual(
    JSON.parse(formBlob).inline.answerKey['q.experience'].optionIds,
    ['opt.exp.0_2', 'opt.exp.3_5', 'opt.exp.6_8', 'opt.exp.9plus'],
    'every experience band passes the intro form',
  )
  assert.match(String(full.tools['tool.doc.q1bbhg']?.prompt?.brief ?? ''), /Harbor/)
  assert.match(String(full.tools['tool.doc.q1bbhg']?.prompt?.brief ?? ''), /search-in-notes/)
  assert.doesNotMatch(
    String(full.tools['tool.doc.q1bbhg']?.prompt?.brief ?? ''),
    /hiring manager/i,
  )
  assert.equal(matchToolAssistBundle(form?.assist), 'copilot')
  assert.equal(matchToolAssistBundle(full.tools['tool.doc.q1bbhg']?.assist), 'copilot')
}

{
  const briefsSrc = readFileSync(join(dir, 'tryInterviewBriefs.ts'), 'utf8')
  assert.match(
    briefsSrc,
    /adaptTryInterviewScenario\(stamped, kit\)/,
    'Harbor overlay runs on kit slices after Copilot stamp',
  )
  assert.match(briefsSrc, /stampStructureCopilotAssist/)
  const fixtureSrc = readFileSync(join(dir, '../interviewBrief/interviewPageFixture.ts'), 'utf8')
  assert.match(fixtureSrc, /stampStructureCopilotAssist/)
}

{
  const src = readFileSync(join(dir, '../../pages/InterviewPage.tsx'), 'utf8')
  assert.match(src, /tryInterviewBriefForKit/)
  assert.match(src, /tryInterviewBriefIdForKit/)
  assert.match(src, /resolveTryInterviewKit/)
  assert.match(src, /peekPendingTryInterviewKit/)
  assert.match(src, /tryInterviewLandingView/)
  assert.match(
    src,
    /tryDemo\s*\?\s*tryInterviewLandingView/,
    'Home Try landing extras are Harbor, not Vurify Demo',
  )
  assert.doesNotMatch(
    src,
    /interviewPageLandingView\(undefined, \{ brief: pageFixtureBrief \}/,
    'negative: fixture landing calls must go through interviewFixtureLandingView',
  )
  assert.match(src, /searchParams\.get\('kit'\)/)
  assert.match(src, /tryDemo=\{tryDemo\}/)
  assert.match(
    src,
    /key=\{runBriefId\}/,
    'kit switches remount the stage so a keep-alive try page cannot keep the previous brief',
  )
  assert.match(
    src,
    /prevTryBriefIdRef/,
    'changing ?kit= returns Home Try to landing',
  )
  assert.match(
    src,
    /briefIdParam = tryDemo\s*\?\s*null/,
    'try-interview does not read a live briefId from the query',
  )
  assert.doesNotMatch(src, /fixtureDemo/, 'landing no longer gets a second fixture caption')
}

{
  const appStage = readFileSync(join(dir, '../appStage/AppStage.tsx'), 'utf8')
  assert.match(appStage, /setPendingTryInterviewKit\(kit\)/)
  assert.match(appStage, /opts\?\.kit \?\? 'coding'/)
  assert.match(appStage, /\?kit=\$\{encodeURIComponent\(kit\)\}/)
}

{
  const shell = readFileSync(join(dir, '../../components/SceneMenuShell.tsx'), 'utf8')
  assert.match(
    shell,
    /peelLockTopRef\.current \|\| lastScrollTopRef\.current/,
    'Take must pin Home at the current scene, not scrollTop 0',
  )
  assert.doesNotMatch(
    shell,
    /scrollLocked \? 0 : peelLockTopRef\.current\s*$/m,
    'negative: navigating must not pin peelLockTopRef when it is still 0',
  )
}

{
  const finished = readFileSync(join(dir, '../../components/InterviewFinishedScene.tsx'), 'utf8')
  assert.match(finished, /tryDemo\?: boolean/)
  assert.match(finished, /data-try-demo/)
  assert.match(
    finished,
    /tryDemo \? null : \([\s\S]*theme-interview-gate__finished-dump/,
    'home try hides the dump (bars, remark, downloads)',
  )
  assert.doesNotMatch(
    finished,
    /tryDemo[\s\S]{0,120}FinishedBucketBars/,
    'negative: home try must not mount the extra bar graph',
  )
  assert.match(
    finished,
    /tryDemo \? null : \([\s\S]*?theme-interview-landing__output-preview-label/,
    'dashboard keeps the Results heading; home try does not',
  )
  const bars = [...finished.matchAll(/<InterviewMarkingProgress/g)]
  assert.equal(
    bars.length,
    3,
    'one try-demo head bar, plus dashboard head sm and dump bars',
  )
  assert.match(
    finished,
    /tryDemo \? \([\s\S]*InterviewMarkingProgress/,
    'home try keeps one marking progress bar on the results head',
  )
  assert.match(
    finished,
    /<ThemeScroll\s+rail="mini"\s+smooth\s+className="theme-interview-landing__verify-spine-scroll"/,
    'results overlay ThemeScroll uses Lenis like the interview page',
  )
  assert.doesNotMatch(
    finished,
    /<ThemeScroll\s+rail="mini"\s+className="theme-interview-landing__verify-spine-scroll"/,
    'negative: overlay spine must not keep native mini scroll',
  )
}

const css = readFileSync(join(dir, '../../css/effects/interview-landing.css'), 'utf8')
assert.match(
  css,
  /theme-interview-gate--finished\[data-try-demo\][\s\S]*max-width: none/,
  'home try marking bar spans the results column',
)
assert.doesNotMatch(
  css,
  /theme-interview-gate--finished\[data-try-demo\][\s\S]{0,280}max-width: 22rem/,
  'negative: the 22rem bar cap is what offset the Results head',
)
assert.doesNotMatch(css, /__fixture-note/, 'fixture caption CSS is gone with the duplicate note')

{
  const pageStage = css.match(
    /\.theme-interview-landing__verify-cover--page\s+\.theme-scale-cover-modal__stage\s*\{[^}]+\}/,
  )?.[0]
  assert.ok(pageStage, 'closed results ScaleCover stage is restyled')
  assert.match(
    pageStage,
    /overflow:\s*hidden/,
    'closed results stage does not keep native overflow:auto over Lenis',
  )
  assert.doesNotMatch(
    pageStage,
    /overflow:\s*auto/,
    'negative: closed --page stage must not keep overflow:auto',
  )
}

{
  const openPageStage = css.match(
    /verify-cover--page\[data-open='true'\]\s+\.theme-scale-cover-modal__stage\s*\{[^}]+\}/,
  )?.[0]
  assert.ok(openPageStage, 'open results ScaleCover stage is pinned past generic Verify overflow:auto')
  assert.match(openPageStage, /overflow:\s*hidden/)
  assert.doesNotMatch(
    openPageStage,
    /overflow:\s*auto/,
    'negative: open --page stage must not keep overflow:auto',
  )
}

{
  const landing = readFileSync(join(dir, '../../components/InterviewLanding.tsx'), 'utf8')
  assert.match(
    landing,
    /const showCoverSlot = Boolean\(coverUrl\) && !coverBroken/,
    'cover column is reserved from first paint, not after decode',
  )
  assert.doesNotMatch(landing, /coverPainted/, 'layout must not wait on coverPainted')
  assert.doesNotMatch(landing, /hidden=\{!showCoverSlot\}/)
  assert.doesNotMatch(landing, /fixtureDemo/)
  assert.doesNotMatch(landing, /Demo preset interview/)
}

{
  const summary = readFileSync(
    join(dir, '../../components/InterviewStructureSummaryRepeater.tsx'),
    'utf8',
  )
  assert.doesNotMatch(
    summary,
    /revealSectionIn/,
    'stage tags paint with the overview, not a GSAP stagger',
  )
  assert.doesNotMatch(summary, /data-dash-anim/)
}

{
  const titleLoop = readFileSync(join(dir, '../../components/TitleLoop.tsx'), 'utf8')
  assert.match(titleLoop, /export const TITLE_LOOP_ENABLED = false/)
  assert.match(
    titleLoop,
    /document\.title = BASE_TITLE\s+if \(!TITLE_LOOP_ENABLED\) return/s,
    'flag off sets the full title once and skips the type loop',
  )
}

console.log('tryInterviewBriefs.unit.mjs: ok')

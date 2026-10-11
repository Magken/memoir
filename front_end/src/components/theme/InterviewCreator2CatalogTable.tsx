import { ThemeScroll } from '../ThemeScroll'

type InterviewCreator2CatalogTableProps = {
  className?: string
}

type Cap = 'yes' | 'no' | 'note'

const CAP_SECTIONS = [
  'Templates',
  'Form',
  'Conversation',
  'Coding',
  'Writing',
  'Decision',
] as const

type CapRow = {
  capability: string
  cells: Cap[]
}

const SPINE_ROWS: Array<{
  section: string
  kind: string
  jsonHome: string
  job: string
}> = [
  {
    section: 'Templates',
    kind: 'Analysis shelf',
    jsonHome: 'analysis.attachPacks · template library meta',
    job: 'Discussion analysis cards only. Conversation attaches from here — not coding tests or writing rubrics.',
  },
  {
    section: 'Form',
    kind: 'tool · form',
    jsonHome: 'phases[] (tool) + tools[toolRef]',
    job: 'Eligibility / quiz gate before or between conversations.',
  },
  {
    section: 'Conversation',
    kind: 'discussion',
    jsonHome: 'phases[] (discussion) + topicLibrary[topicId]',
    job: 'Conversational topic — depth, probes, targets, analysis attach.',
  },
  {
    section: 'Coding',
    kind: 'tool · coding',
    jsonHome: 'phases[] (tool) + tools[toolRef].tests',
    job: 'Timed/untimed coding challenge — workspace + deterministic test cases.',
  },
  {
    section: 'Writing',
    kind: 'tool · doc',
    jsonHome: 'phases[] (tool) + tools[toolRef].prompt / assessment',
    job: 'Essay / written response — prompt doc + rubric or format notes on the tool.',
  },
  {
    section: 'Decision package',
    kind: 'wrap / rollup',
    jsonHome: 'analysis.rollup',
    job: 'End-of-interview package for the reviewer — rollup template + soft weights.',
  },
]

const DOC_SHAPE_ROWS: Array<{
  path: string
  role: string
}> = [
  {
    path: 'schemaVersion · kind',
    role: 'Document identity — kind is always interview_brief.',
  },
  {
    path: 'definition.meta',
    role: 'Title, role, proposed/estimated minutes, timing slack.',
  },
  {
    path: 'definition.persona',
    role: 'Interviewer name, voice, behaviour prompt (opening/closing live on phases).',
  },
  {
    path: 'topicLibrary[]',
    role: 'Conversation content — probes, targets, depth budgets, analysis attach.',
  },
  {
    path: 'phases[]',
    role: 'Spine order — discussion (topicId) or tool (toolRef), when / onFail, flags.',
  },
  {
    path: 'tools{}',
    role: 'Keyed tool payloads — form / coding / doc (+ optional off-spine tools).',
  },
  {
    path: 'analysis',
    role: 'Template packs, rollup, schedule — Templates shelf + Decision package.',
  },
  {
    path: 'timingSummary',
    role: 'Derived fit vs proposed minutes (optional on the brief).',
  },
]

const PATCH_ROWS: Array<{
  edit: string
  patch: string
  writes: string
}> = [
  {
    edit: 'Form questions / gate / timer',
    patch: 'patchCreator2FormStep',
    writes: 'tools[formRef] · phase when/onFail',
  },
  {
    edit: 'Conversation probes / targets / depth / attach',
    patch: 'patchCreator2TalkStep',
    writes: 'topicLibrary[topicId] · phase flags',
  },
  {
    edit: 'Coding workspace / languages / tests',
    patch: 'patchCreator2CodingStep',
    writes: 'tools[codingRef].tests · timing',
  },
  {
    edit: 'Writing prompt / rubric / format',
    patch: 'patchCreator2DocStep',
    writes: 'tools[docRef].prompt · assessment',
  },
  {
    edit: 'Templates library cards',
    patch: 'patchCreator2AnalysisShelf · deleteCreator2Template',
    writes: 'analysis packs / template meta',
  },
  {
    edit: 'Decision package rollup / weights',
    patch: 'patchCreator2Rollup',
    writes: 'analysis.rollup',
  },
  {
    edit: 'Add / move / duplicate / remove section',
    patch: 'patchCreator2Spine',
    writes: 'phases[] · tools{} · topicLibrary[]',
  },
]

const CAPABILITY_ROWS: CapRow[] = [
  {
    capability: 'Edit / Preview chrome',
    cells: ['yes', 'yes', 'yes', 'yes', 'yes', 'yes'],
  },
  {
    capability: 'Hard timer + limit minutes',
    cells: ['no', 'yes', 'no', 'yes', 'yes', 'no'],
  },
  {
    capability: 'Discussion depth (min / turns / probes)',
    cells: ['no', 'no', 'yes', 'no', 'no', 'no'],
  },
  {
    capability: 'Probes + targets',
    cells: ['no', 'no', 'yes', 'no', 'no', 'no'],
  },
  {
    capability: 'Opening / closing flags',
    cells: ['no', 'no', 'yes', 'no', 'no', 'no'],
  },
  {
    capability: 'Attach analysis templates',
    cells: ['note', 'note', 'yes', 'note', 'note', 'note'],
  },
  {
    capability: 'Create / edit / delete library templates',
    cells: ['yes', 'no', 'no', 'no', 'no', 'no'],
  },
  {
    capability: 'Live form + answer key / gate',
    cells: ['no', 'yes', 'no', 'no', 'no', 'no'],
  },
  {
    capability: 'Code workspace + test cases',
    cells: ['no', 'no', 'no', 'yes', 'no', 'no'],
  },
  {
    capability: 'Writing prompt + rubric / format',
    cells: ['no', 'no', 'no', 'no', 'yes', 'no'],
  },
  {
    capability: 'Soft weight blend lenses',
    cells: ['no', 'no', 'no', 'no', 'no', 'yes'],
  },
  {
    capability: 'When (skip unless condition)',
    cells: ['no', 'yes', 'yes', 'yes', 'yes', 'no'],
  },
  {
    capability: 'On fail (skip / end / jump)',
    cells: ['no', 'yes', 'yes', 'yes', 'yes', 'no'],
  },
  {
    capability: 'Spine add / remove / move / duplicate',
    cells: ['no', 'yes', 'yes', 'yes', 'yes', 'no'],
  },
]

function CapCell({ value }: { value: Cap }) {
  if (value === 'yes') {
    return <span className="type-accent type-caption">Yes</span>
  }
  if (value === 'note') {
    return <span className="type-muted type-caption">*</span>
  }
  return <span className="type-muted type-caption">—</span>
}

/**
 * Theme lab catalog — how Creator 2 maps spine UI ↔ plan-shaped interview_brief JSON.
 */
export function InterviewCreator2CatalogTable({
  className = '',
}: InterviewCreator2CatalogTableProps) {
  return (
    <section className={['space-y-10', className].filter(Boolean).join(' ')}>
      <div className="space-y-2 prose-measure max-w-3xl">
        <p className="type-overline mb-0">Behaviour catalogue</p>
        <h2 className="type-title-sm mb-0">How Creator 2 talks to JSON</h2>
        <p className="type-body-sm type-muted mb-0">
          One live <code className="type-code">Creator2BriefDocument</code> drives the timeline.
          Editors patch the brief; <code className="type-code">mapCreator2BriefToTimeline</code>{' '}
          re-projects spine UI. Expand a section below the tables to try it — Show JSON reflects
          every write-back.
        </p>
      </div>

      <div className="space-y-3">
        <p className="type-caption type-accent mb-0">Document shape</p>
        <ThemeScroll axis="horizontal" rail="mini" className="theme-table-wrap">
          <table className="theme-table theme-table--compact min-w-[36rem]">
            <caption className="sr-only">
              Top-level interview_brief paths and what they own
            </caption>
            <thead>
              <tr>
                <th scope="col" className="text-left">
                  JSON path
                </th>
                <th scope="col" className="text-left">
                  Owns
                </th>
              </tr>
            </thead>
            <tbody>
              {DOC_SHAPE_ROWS.map((row) => (
                <tr key={row.path}>
                  <td>
                    <code className="type-code type-caption">{row.path}</code>
                  </td>
                  <td className="type-body-sm">{row.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ThemeScroll>
      </div>

      <div className="space-y-3">
        <p className="type-caption type-accent mb-0">Spine → JSON home</p>
        <ThemeScroll axis="horizontal" rail="mini" className="theme-table-wrap">
          <table className="theme-table theme-table--compact min-w-[48rem]">
            <caption className="sr-only">
              Timeline sections, kinds, JSON homes, and jobs
            </caption>
            <thead>
              <tr>
                <th scope="col" className="text-left">
                  Section
                </th>
                <th scope="col" className="text-left">
                  Kind
                </th>
                <th scope="col" className="text-left">
                  JSON home
                </th>
                <th scope="col" className="text-left">
                  Job
                </th>
              </tr>
            </thead>
            <tbody>
              {SPINE_ROWS.map((row) => (
                <tr key={row.section}>
                  <td className="type-body-sm">{row.section}</td>
                  <td>
                    <code className="type-code type-caption">{row.kind}</code>
                  </td>
                  <td>
                    <code className="type-code type-caption">{row.jsonHome}</code>
                  </td>
                  <td className="type-body-sm">{row.job}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ThemeScroll>
      </div>

      <div className="space-y-3">
        <p className="type-caption type-accent mb-0">Capability matrix</p>
        <ThemeScroll axis="horizontal" rail="mini" className="theme-table-wrap">
          <table className="theme-table theme-table--compact min-w-[52rem]">
            <caption className="sr-only">
              What each Creator 2 section can author
            </caption>
            <thead>
              <tr>
                <th scope="col" className="text-left">
                  Capability
                </th>
                {CAP_SECTIONS.map((section) => (
                  <th key={section} scope="col" className="text-left">
                    {section}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CAPABILITY_ROWS.map((row) => (
                <tr key={row.capability}>
                  <td className="type-body-sm">{row.capability}</td>
                  {row.cells.map((cell, i) => (
                    <td key={`${row.capability}-${CAP_SECTIONS[i]}`}>
                      <CapCell value={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={CAP_SECTIONS.length + 1} className="type-caption type-muted">
                  * Templates defines the library; Conversation attaches. Coding/Writing assessment is on
                  the tool JSON (tests / rubric), not Templates cards. Decision package always runs
                  at interview end.
                </td>
              </tr>
            </tfoot>
          </table>
        </ThemeScroll>
      </div>

      <div className="space-y-3">
        <p className="type-caption type-accent mb-0">UI edit → patch → JSON</p>
        <ThemeScroll axis="horizontal" rail="mini" className="theme-table-wrap">
          <table className="theme-table theme-table--compact min-w-[44rem]">
            <caption className="sr-only">
              Showcase handlers, patch helpers, and brief write targets
            </caption>
            <thead>
              <tr>
                <th scope="col" className="text-left">
                  UI edit
                </th>
                <th scope="col" className="text-left">
                  Patch helper
                </th>
                <th scope="col" className="text-left">
                  Writes
                </th>
              </tr>
            </thead>
            <tbody>
              {PATCH_ROWS.map((row) => (
                <tr key={row.edit}>
                  <td className="type-body-sm">{row.edit}</td>
                  <td>
                    <code className="type-code type-caption">{row.patch}</code>
                  </td>
                  <td>
                    <code className="type-code type-caption">{row.writes}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ThemeScroll>
        <p className="type-body-sm type-muted mb-0 prose-measure max-w-3xl">
          Shared phase controls on Form · Conversation · Coding · Writing:{' '}
          <strong className="type-body-sm font-medium">When</strong> (enter only if conditions
          hold), <strong className="type-body-sm font-medium">On fail</strong> (skip / end /
          jump), and hard timers on tools (Conversation uses depth budgets instead).
        </p>
      </div>
    </section>
  )
}
